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
    caja = (
        db.query(models.CajaReempaque)
        .options(joinedload(models.CajaReempaque.celdas))
        .filter(models.CajaReempaque.id == caja_id)
        .one_or_none()
    )

    # Otra vuelta (o un cambio de estado) ya la trató: nada que hacer.
    if caja is None or caja.estado_sync != ESTADO_PENDIENTE:
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


def procesar_vuelta():
    db = SessionLocal()
    try:
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
