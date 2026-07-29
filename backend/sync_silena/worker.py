# Worker de sincronizacion con SILENA exporta los ficheros csv de las cajas en pendiente

import time
import logging
from datetime import datetime

from sqlalchemy.orm import joinedload

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

# Devuelve: "ok" | "omitida" | "fallo"


def _exportar_una(db, caja_id):
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
        return "omitida"

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
        return "omitida"

    try:
        generar_fichero(caja)
        caja.estado_sync = ESTADO_EXPORTADO
        caja.sync_exportado_at = datetime.now()
        db.commit()
        logger.info("Caja %s exportada.", caja.id_temporal)
        return "ok"

    except Exception:
        db.rollback()
        _registrar_fallo(db, caja_id)
        return "fallo"


# Registra un intento fallido y se incrementa el contador; si agota los
# reintentos, pasa a ERROR para no bloquear la cola.


def _registrar_fallo(db, caja_id):
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


def _sync_activo(db):
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


def procesar_vuelta():
    db = SessionLocal()
    try:
        if not _sync_activo(db):
            return 0

        ids = _ids_pendientes(db)
        if not ids:
            return 0

        exportadas = 0
        for caja_id in ids:
            if _exportar_una(db, caja_id) == "ok":
                exportadas += 1
        return exportadas
    finally:
        db.close()  # nunca dejamos conexiones colgando fuera del pool


def main():
    logger.info(
        "Worker de exportación SILENA arrancado. Carpeta de salida: %s",
        CARPETA_SALIDA,
    )
    while True:
        try:
            exportadas = procesar_vuelta()
        except Exception:
            logger.error("Error inesperado en el ciclo del worker.", exc_info=True)
            exportadas = 0

        time.sleep(PAUSA if exportadas else PAUSA_VACIA)


if __name__ == "__main__":
    main()
