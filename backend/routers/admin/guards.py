"""
Reglas de escritura sobre cajas, compartidas por los endpoints de admin.

Viven aparte porque las consultan dos tipos de endpoint: los que escriben (que
cortan con un 409) y el que solo pregunta si se podrá escribir. Teniendo una
única fuente, las dos respuestas no pueden divergir.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from box_rules import CLAVE_SYNC_ACTIVO, get_flag_global
from sync_silena.config import ESTADO_EXPORTADO

import models


def motivo_bloqueo_edicion(db: Session, caja: models.CajaReempaque) -> str | None:
    """
    Decide si una caja se puede modificar o borrar. Dos cortes, en este orden:

    1. Sincronización activa -> no se toca nada, esté como esté la caja. El
       worker está vivo y podría exportarla a mitad de la edición, dejando en
       el NAS un CSV con los datos viejos.
    2. Caja ya exportada -> congelada para siempre, aunque la sincronización
       esté en pausa. Su fichero ya viajó y SILENA lo tiene: corregirla aquí
       solo abriría divergencia entre los dos sistemas. Las modificaciones y
       las bajas de una caja enviada se hacen desde SILENA.

    Queda editable lo que todavía no ha salido (PENDIENTE y ERROR) y solo con
    el interruptor apagado. Se decide en cada petición, nunca se guarda en la
    caja.

    Devuelve el motivo del bloqueo, o None si la caja es editable.
    """
    if get_flag_global(db, models, CLAVE_SYNC_ACTIVO):
        return (
            "🔒 La sincronización con SILENA está activa: la caja "
            f"'{caja.id_temporal}' no se puede modificar ni borrar. "
            "Pausa la sincronización en Configuración para editarla."
        )

    if caja.estado_sync == ESTADO_EXPORTADO:
        return (
            f"🔒 La caja '{caja.id_temporal}' ya se envió a SILENA. Las "
            "modificaciones y las bajas de una caja enviada se hacen "
            "desde SILENA."
        )

    return None


def verificar_caja_editable(db: Session, caja: models.CajaReempaque) -> None:
    """Corta la petición con un 409 si la caja está bloqueada."""
    motivo = motivo_bloqueo_edicion(db, caja)

    if motivo:
        raise HTTPException(status_code=409, detail=motivo)
