# SINCRONIZACIÓN DE PUESTOS DESDE ZEO

# Llama a get-production-units, y refleja el resultado en la tabla puestos:
# alta de nuevos, actualización de existentes (reactivándolos) y baja lógica
# (activo=False) de los que ZEO ya no devuelve. Nunca borra, para no romper
# la FK del histórico de cajas.

import logging

import httpx
from sqlalchemy.orm import Session

import models
from sync_zeo.config import (
    ZEO_API_URL,
    ZEO_TIMEOUT,
    ENDPOINT_PRODUCTION_UNITS,
    PREFIJOS_PUESTOS,
)

logger = logging.getLogger("sync_zeo.sincronizador")


def _pedir_unidades_a_zeo() -> list[dict]:
    """Llama a ZEO y devuelve la lista cruda de unidades productivas.

    Lanza httpx.HTTPError si ZEO no responde o responde con error, para que
    quien llama decida si cae a la caché local.
    """
    url = f"{ZEO_API_URL}{ENDPOINT_PRODUCTION_UNITS}"
    respuesta = httpx.get(url, timeout=ZEO_TIMEOUT)
    respuesta.raise_for_status()
    return respuesta.json()


def sincronizar_puestos(db: Session) -> int:
    """Trae los puestos de ZEO y los refleja en la tabla local.

    Devuelve cuántos puestos activos han quedado tras sincronizar.
    Si ZEO falla, propaga la excepción: el endpoint que llame decide el
    fallback a caché local.
    """
    unidades = _pedir_unidades_a_zeo()

    # Códigos que ZEO considera activos ahora mismo.
    codigos_zeo = set()

    for unidad in unidades:
        codigo = unidad.get("puIntegrationCode")
        nombre_zeo = unidad.get("productionUnitName")

        if not nombre_zeo or not nombre_zeo.startswith(PREFIJOS_PUESTOS):
            continue

        # Sin código no podemos mapear la caja a ZEO: la saltamos.
        if not codigo:
            continue

        codigos_zeo.add(codigo)

        puesto = (
            db.query(models.Puesto)
            .filter(models.Puesto.pu_integration_code == codigo)
            .one_or_none()
        )

        if puesto is None:
            # Nuevo: lo damos de alta. El nombre visible arranca igual que el
            # de ZEO; si luego se quiere renombrar, es otra historia.
            puesto = models.Puesto(
                nombre=nombre_zeo,
                pu_integration_code=codigo,
                pu_nombre_zeo=nombre_zeo,
                activo=True,
            )
            db.add(puesto)
        else:
            # Existente: refrescamos el nombre de ZEO y lo reactivamos por si
            # estaba dado de baja y ha vuelto.
            puesto.pu_nombre_zeo = nombre_zeo
            puesto.activo = True

    # Baja lógica: lo que teníamos activo y ZEO ya no devuelve.
    (
        db.query(models.Puesto)
        .filter(
            models.Puesto.activo.is_(True),
            models.Puesto.pu_integration_code.notin_(codigos_zeo),
        )
        .update({models.Puesto.activo: False}, synchronize_session=False)
    )

    db.commit()

    activos = db.query(models.Puesto).filter(models.Puesto.activo.is_(True)).count()
    logger.info("Puestos sincronizados desde ZEO. Activos: %s", activos)
    return activos
