# Worker de sincronizacion con SILENA exporta los ficheros csv de las cajas en pendiente

import logging
import signal
import threading
from datetime import datetime
from enum import Enum

from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, joinedload

import models
from database import SessionLocal
from sync_silena.config import (
    LOTE,
    PAUSA,
    PAUSA_VACIA,
    MAX_INTENTOS,
    CARPETA_SALIDA,
    ESTADO_PENDIENTE,
    ESTADO_EXPORTADO,
    ESTADO_ERROR,
)
from sync_silena.generador import generar_fichero
from box_rules import CLAVE_SYNC_ACTIVO, get_flag_global

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sync_silena.worker")


# APAGADO ELEGANTE
#
# El contenedor nos manda SIGTERM al parar o al redesplegar. Sin handler, ese
# aviso se pierde (encima somos PID 1, que ignora las señales por defecto) y a
# los pocos segundos llega un SIGKILL que nos puede partir a mitad de una caja:
# CSV escrito en el NAS y commit sin hacer.
#
# La señal solo levanta una bandera. Quien decide dónde parar es el bucle, y
# para siempre ENTRE cajas, nunca dentro de una.
_apagando = threading.Event()


def _instalar_senales() -> None:
    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, lambda *_: _apagando.set())


# Resultado de exportar una caja. Los dos tipos de fallo se separan porque se
# tratan al revés:
#
#   FALLO_DATOS -> el problema es de ESTA caja (tipo desconocido, dato
#                  imposible). Reintentar no lo va a arreglar: suma intento y,
#                  al agotarlos, la caja pasa a ERROR y deja libre la cola.
#   FALLO_INFRA -> el NAS o la BD no responden. No es culpa de la caja: no se
#                  le suma nada y se corta la vuelta. Cuando vuelva el
#                  servicio, la cola se drena sola.
#
# Sin esta distinción, un minuto de NAS caído mandaba a ERROR las primeras
# cajas de la cola en unas pocas vueltas, y de ahí solo se sale editándolas a
# mano una a una.


class Resultado(str, Enum):
    OK = "ok"
    OMITIDA = "omitida"
    FALLO_DATOS = "fallo_datos"
    FALLO_INFRA = "fallo_infra"


# Selección del lote: solo IDs (consulta ligera que usa el índice parcial).
# Ordenamos por fecha de cierre para drenar el histórico cronológicamente.


def _ids_pendientes(db):
    filas = (
        db.query(models.CajaReempaque.id)
        .filter(models.CajaReempaque.estado_sync == ESTADO_PENDIENTE)
        .order_by(models.CajaReempaque.fecha_fin_reempaque.asc())
        .limit(LOTE)
        .all()
    )
    return [fila[0] for fila in filas]


# Exporta UNA caja. Se recarga fresca con sus celdas (joinedload, sin lazy)

# Devuelve un Resultado.


def _exportar_una(db: Session, caja_id: int) -> Resultado:
    # Reservamos la fila ANTES de leerla. Si un admin está editando esta caja,
    # aquí esperamos a que confirme y exportamos sus datos buenos, en lugar de
    # generar el CSV con los viejos y dejarla en EXPORTADO para siempre.
    #
    # Se pide solo el id, y es a propósito, por dos motivos:
    #
    #   1. La carga de abajo usa joinedload, que genera un LEFT OUTER JOIN, y
    #      Postgres rechaza FOR UPDATE sobre el lado nullable de un outer join.
    #   2. Una consulta de columna no mete la entidad en la identity map de la
    #      sesión. Si aquí cargásemos la caja entera, la consulta siguiente nos
    #      devolvería ese objeto ya cacheado en vez de releer, y nos quedaríamos
    #      justo con los datos viejos que queremos evitar.
    bloqueada = (
        db.query(models.CajaReempaque.id)
        .filter(models.CajaReempaque.id == caja_id)
        .with_for_update()
        .one_or_none()
    )

    # Cada salida cierra su transacción: si no, el bloqueo de esta fila seguiría
    # retenido durante el resto del lote y un admin se quedaría esperando por
    # una caja que ni siquiera vamos a exportar.
    if bloqueada is None:
        db.rollback()
        return Resultado.OMITIDA

    # Se vuelve a mirar el interruptor AQUÍ, con la fila ya reservada y dentro
    # de esta misma transacción. La comprobación de arriba, la de una vez por
    # vuelta, no basta: entre ella y esta caja caben hasta LOTE exportaciones,
    # y en ese rato un admin puede haber pausado la sincronización y haber
    # empezado a corregir justo esta caja. El guardián le dejaría (ve el flag
    # apagado y la caja en PENDIENTE) y nosotros la exportaríamos a medio
    # corregir. Preguntando bajo el bloqueo, en cuanto la pausa está
    # confirmada ninguna caja que reservemos después llega a salir.
    if not get_flag_global(db, models, CLAVE_SYNC_ACTIVO):
        db.rollback()
        return Resultado.OMITIDA

    caja = (
        db.query(models.CajaReempaque)
        .options(joinedload(models.CajaReempaque.celdas))
        .filter(models.CajaReempaque.id == caja_id)
        .one_or_none()
    )

    # Con la fila ya bloqueada esta comprobación es fiable: si otra vuelta o un
    # admin la tocaron, lo vemos aquí y no la exportamos por duplicado.
    if caja is None or caja.estado_sync != ESTADO_PENDIENTE:
        db.rollback()
        return Resultado.OMITIDA

    try:
        generar_fichero(caja)
        caja.estado_sync = ESTADO_EXPORTADO
        caja.sync_exportado_at = datetime.now()
        db.commit()
        logger.info("Caja %s exportada.", caja.id_temporal)
        return Resultado.OK

    except OSError:
        # El NAS no responde (share caído, sin permisos, disco lleno). Le pasa
        # igual a todas las cajas, así que la nuestra se queda en PENDIENTE,
        # intacta y sin gastar intentos.
        db.rollback()
        logger.error(
            "NAS inaccesible exportando la caja id=%s. Se corta la vuelta.",
            caja_id,
            exc_info=True,
        )
        return Resultado.FALLO_INFRA

    except OperationalError:
        # La BD se cayó o la conexión murió a mitad del commit. Tampoco es
        # culpa de la caja. Ojo: puede que el fichero ya esté escrito en el
        # NAS; al reintentar se reescribe encima con el mismo nombre y el mismo
        # contenido, así que no hay duplicado.
        db.rollback()
        logger.error(
            "Fallo de base de datos exportando la caja id=%s. Se corta la vuelta.",
            caja_id,
            exc_info=True,
        )
        return Resultado.FALLO_INFRA

    except Exception:
        # Lo que queda es un problema de la caja (p. ej. el ValueError de
        # generar_fichero con un tipo_caja desconocido): esto sí gasta intento.
        db.rollback()
        _registrar_fallo(db, caja_id)
        return Resultado.FALLO_DATOS


# Registra un intento fallido y se incrementa el contador; si agota los
# reintentos, pasa a ERROR para no bloquear la cola.


def _registrar_fallo(db: Session, caja_id: int) -> None:
    try:
        caja = (
            db.query(models.CajaReempaque)
            .filter(models.CajaReempaque.id == caja_id)
            .one_or_none()
        )
        if caja is None:
            return

        caja.intentos_sync = (caja.intentos_sync or 0) + 1

        if caja.intentos_sync >= MAX_INTENTOS:
            caja.estado_sync = ESTADO_ERROR
            logger.error(
                "Caja %s -> ERROR tras %s intentos.",
                caja.id_temporal,
                caja.intentos_sync,
                exc_info=True,
            )
        else:
            logger.warning(
                "Fallo exportando caja %s (intento %s/%s), reintentará.",
                caja.id_temporal,
                caja.intentos_sync,
                MAX_INTENTOS,
                exc_info=True,
            )
        db.commit()
    except Exception:
        db.rollback()
        logger.error(
            "No se pudo registrar el fallo de la caja id=%s.",
            caja_id,
            exc_info=True,
        )


# Una vuelta completa: sesión propia, se abre y se cierra siempre.
# Devuelve cuántas cajas se exportaron con éxito (para decidir la pausa).


# Interruptor de la exportación. Se consulta en cada vuelta para poder pausar
# y reanudar desde la pantalla de configuración, sin tocar el contenedor.
# Las cajas se quedan en PENDIENTE y se drenan solas al reanudar.

_ultimo_estado_conocido = None


def _sync_activo(db: Session) -> bool:
    global _ultimo_estado_conocido

    activo = get_flag_global(db, models, CLAVE_SYNC_ACTIVO)

    # Solo se loguea el cambio, no cada vuelta.
    if activo != _ultimo_estado_conocido:
        logger.info(
            "Exportación a SILENA %s.",
            "reanudada" if activo else "EN PAUSA (interruptor desactivado)",
        )
        _ultimo_estado_conocido = activo

    return activo


def procesar_vuelta() -> int:
    db = SessionLocal()
    try:
        if not _sync_activo(db):
            return 0

        ids = _ids_pendientes(db)
        if not ids:
            return 0

        exportadas = 0
        for caja_id in ids:
            # Nos están parando: se deja el lote a medias, que es gratis. Las
            # cajas que no toquemos siguen en PENDIENTE y salen al arrancar.
            if _apagando.is_set():
                logger.info("Apagado solicitado: se interrumpe el lote.")
                break

            resultado = _exportar_una(db, caja_id)

            if resultado is Resultado.OK:
                exportadas += 1
            elif resultado is Resultado.FALLO_INFRA:
                # Si el NAS o la BD están caídos, insistir con las otras 19
                # cajas solo llena el log. Se corta y se reintenta la vuelta
                # que viene.
                break

        return exportadas
    finally:
        db.close()  # nunca dejamos conexiones colgando fuera del pool


def main() -> None:
    _instalar_senales()

    logger.info(
        "Worker de exportación SILENA arrancado. Carpeta de salida: %s",
        CARPETA_SALIDA,
    )

    while not _apagando.is_set():
        try:
            exportadas = procesar_vuelta()
        except Exception:
            logger.error("Error inesperado en el ciclo del worker.", exc_info=True)
            exportadas = 0

        # wait() en vez de sleep(): espera lo mismo, pero un SIGTERM la corta
        # al instante en lugar de tener que agotar los 30 segundos.
        _apagando.wait(PAUSA if exportadas else PAUSA_VACIA)

    logger.info("Worker detenido limpiamente.")


if __name__ == "__main__":
    main()
