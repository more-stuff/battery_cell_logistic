"""
Reglas de escritura sobre cajas, compartidas por los endpoints de admin.

Viven aparte porque las consultan dos tipos de endpoint: los que escriben (que
cortan con un 409) y el que solo pregunta si se podrá escribir. Teniendo una
única fuente, las dos respuestas no pueden divergir.

Hay dos preguntas distintas, y no tienen la misma respuesta:

  - ¿Se puede EDITAR? -> codigo_bloqueo_edicion y sus derivadas.
  - ¿Se puede BORRAR entera? -> caja_borrable / verificar_caja_borrable.

El borrado es más permisivo: acepta además las cajas ya exportadas. O sea que
una caja puede estar bloqueada para editar y aun así poder borrarse. Cada
pregunta tiene aquí su función; ningún endpoint rehace la condición por su
cuenta.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from box_rules import CLAVE_SYNC_ACTIVO, get_flag_global
from sync_silena.config import ESTADO_EXPORTADO

import models


# Códigos de bloqueo. El texto de `motivo` es para el operario y puede cambiar
# cuando queramos; estos códigos son el contrato con el frontend, que necesita
# distinguir los dos motivos sin leer castellano ni emojis.
#
# Las dos operaciones que se saltan un bloqueo (liberar una celda atrapada y
# borrar la caja entera) solo se saltan BLOQUEO_EXPORTADO: es el único que
# esos endpoints ignoran a propósito.
BLOQUEO_SYNC_ACTIVO = "SYNC_ACTIVO"
BLOQUEO_EXPORTADO = "EXPORTADO"


def codigo_bloqueo_edicion(db: Session, caja: models.CajaReempaque) -> str | None:
    """
    Decide si una caja se puede modificar. Dos cortes, en este orden:

    1. Sincronización activa -> no se toca nada, esté como esté la caja. El
       worker está vivo y podría exportarla a mitad de la edición, dejando en
       el NAS un CSV con los datos viejos.
    2. Caja ya exportada -> congelada para siempre, aunque la sincronización
       esté en pausa. Su fichero ya viajó y SILENA lo tiene: corregirla aquí
       solo abriría divergencia entre los dos sistemas. Las modificaciones de
       una caja enviada se hacen desde SILENA.

    Queda editable lo que todavía no ha salido (PENDIENTE y ERROR) y solo con
    el interruptor apagado. Se decide en cada petición, nunca se guarda en la
    caja.

    OJO: esto NO responde "se puede borrar". El borrado tiene su propia regla,
    más permisiva, en caja_borrable.

    Devuelve el código del bloqueo, o None si la caja es editable. Es la única
    función que conoce el orden de los cortes: todo lo demás se deriva de aquí.
    """
    if get_flag_global(db, models, CLAVE_SYNC_ACTIVO):
        return BLOQUEO_SYNC_ACTIVO

    if caja.estado_sync == ESTADO_EXPORTADO:
        return BLOQUEO_EXPORTADO

    return None


def texto_bloqueo_edicion(codigo: str, caja: models.CajaReempaque) -> str:
    """Traduce un código de bloqueo al aviso que ve el operario."""
    if codigo == BLOQUEO_SYNC_ACTIVO:
        return (
            "🔒 La sincronización con SILENA está activa: la caja "
            f"'{caja.id_temporal}' no se puede modificar ni borrar. "
            "Pausa la sincronización en Configuración para editarla."
        )

    if codigo == BLOQUEO_EXPORTADO:
        # Se habla solo de modificar, no de dar de baja: una caja exportada SÍ
        # se puede borrar entera desde aquí (ver caja_borrable), y este texto
        # es el que pinta el banner justo encima de ese botón.
        return (
            f"🔒 La caja '{caja.id_temporal}' ya se envió a SILENA: sus celdas "
            "no se pueden modificar desde aquí. Las correcciones de una caja "
            "enviada se hacen desde SILENA."
        )

    return f"🔒 La caja '{caja.id_temporal}' no se puede modificar ahora mismo."


def motivo_bloqueo_edicion(db: Session, caja: models.CajaReempaque) -> str | None:
    """Motivo legible del bloqueo, o None si la caja es editable."""
    codigo = codigo_bloqueo_edicion(db, caja)

    if codigo is None:
        return None

    return texto_bloqueo_edicion(codigo, caja)


def verificar_caja_editable(db: Session, caja: models.CajaReempaque) -> None:
    """Corta la petición con un 409 si la caja está bloqueada para editar."""
    motivo = motivo_bloqueo_edicion(db, caja)

    if motivo:
        raise HTTPException(status_code=409, detail=motivo)


def caja_borrable(db: Session, caja: models.CajaReempaque) -> bool:
    """
    Decide si una caja se puede borrar entera, con todas sus celdas.

    Es MÁS permisivo que editarla, y por eso no se puede reutilizar el
    guardián de edición tal cual:

      - Caja ya EXPORTADO -> se borra siempre, incluso con la sincronización
        activa. EXPORTADO es terminal y el worker solo mira las PENDIENTE, así
        que no hay ninguna exportación a medias que proteger. El precio es que
        SILENA se queda con su CSV, y esa baja va por el ERP: quien llame a
        esto tiene que avisarlo.
      - El resto (PENDIENTE / ERROR) -> las reglas de siempre, o sea la
        sincronización en pausa. Ahí sí hay algo que proteger: el worker puede
        exportar la caja mientras se borra.

    De aquí salen las dos respuestas, la del endpoint que borra y la de la
    pantalla que pregunta antes, para que no puedan divergir.
    """
    if caja.estado_sync == ESTADO_EXPORTADO:
        return True

    return codigo_bloqueo_edicion(db, caja) is None


def verificar_caja_borrable(db: Session, caja: models.CajaReempaque) -> None:
    """Corta la petición con un 409 si la caja no se puede borrar."""
    if caja_borrable(db, caja):
        return

    # Si no es borrable es que no está exportada y el guardián de edición la
    # corta, así que ese motivo existe seguro y es el bueno.
    raise HTTPException(status_code=409, detail=motivo_bloqueo_edicion(db, caja))
