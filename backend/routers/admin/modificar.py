"""
Corrección de cajas ya cerradas: consultar su contenido, sustituir una celda
o dar de baja la caja entera.

Todo lo que escribe aquí pasa antes por verificar_caja_editable (guards.py):
una caja que ya viajó a SILENA no se toca desde este lado.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from box_rules import (
    TIPO_NORMAL,
    TIPO_DEFECTUOSA,
    TIPOS_CAJA_VALIDOS,
    validar_celda_para_tipo_caja,
    get_config_int,
    normalizar_modelo,
)

from sync_silena.config import ESTADO_PENDIENTE, ESTADO_ERROR

from database import get_db
import models, schemas, auth

from .guards import motivo_bloqueo_edicion, verificar_caja_editable

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{id_temporal}/celdas", response_model=schemas.CajaConCeldas)
def get_celdas_caja(
    id_temporal: str,
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(
        auth.require_roles(auth.ROL_OPERARIO_LINEA, auth.ROL_ADMIN, auth.ROL_SUPERADMIN)
    ),
):
    caja = (
        db.query(models.CajaReempaque)
        .filter(models.CajaReempaque.id_temporal == id_temporal)
        .first()
    )

    if not caja:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontro ninguna caja con id '{id_temporal}'",
        )

    modelo = normalizar_modelo(getattr(caja, "modelo", None))

    celdas = (
        db.query(models.Celda)
        .filter(models.Celda.caja_reempaque_id == caja.id)
        .order_by(
            models.Celda.posicion_en_caja.asc().nullslast(),
            models.Celda.id.asc(),
        )
        .all()
    )

    celdas_detalle = [
        schemas.CeldaDetalle(
            dmc_code=c.dmc_code,
            fecha_caducidad=c.fecha_caducidad,
            hu_origen=c.hu_origen_id,
            estado_calidad=c.estado_calidad or "OK",
            posicion_en_caja=c.posicion_en_caja,
            voltaje_medido=c.voltaje_medido,
        )
        for c in celdas
    ]

    return schemas.CajaConCeldas(
        id_temporal=caja.id_temporal,
        fecha_caducidad_caja=caja.fecha_caducidad_caja,
        is_defective=caja.is_defective,
        total_celdas=len(celdas_detalle),
        tipo_caja=getattr(caja, "tipo_caja", None),
        modelo=modelo,
        celdas=celdas_detalle,
    )


@router.get(
    "/cajas/{id_temporal}/estado-edicion",
    response_model=schemas.EstadoEdicionCaja,
)
def get_estado_edicion_caja(
    id_temporal: str,
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(
        auth.require_roles(auth.ROL_OPERARIO_LINEA, auth.ROL_ADMIN, auth.ROL_SUPERADMIN)
    ),
):
    """
    Adelanta la respuesta que daría el guardián de escritura, sin escribir.

    Sirve para que una pantalla avise antes de dejar rellenar un formulario que
    después se va a rechazar. Es una foto del momento, no una reserva: quien
    escriba vuelve a pasar por verificar_caja_editable, que es el que manda.
    """
    caja = (
        db.query(models.CajaReempaque)
        .filter(models.CajaReempaque.id_temporal == id_temporal)
        .first()
    )

    if not caja:
        raise HTTPException(
            status_code=404,
            detail=f"No existe ninguna caja con id '{id_temporal}'",
        )

    motivo = motivo_bloqueo_edicion(db, caja)

    return schemas.EstadoEdicionCaja(
        id_temporal=caja.id_temporal,
        editable=motivo is None,
        motivo=motivo,
    )


@router.post("/sustituir-celda", response_model=schemas.SustitucionResponse)
def sustituir_celda(
    datos: schemas.SustitucionInput,
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(
        auth.require_roles(auth.ROL_OPERARIO_LINEA, auth.ROL_ADMIN, auth.ROL_SUPERADMIN)
    ),
):
    try:
        # --- PASO 1: Buscar la caja ---
        #
        # with_for_update: reservamos la fila ANTES de decidir si es editable.
        # Si el worker la está exportando en este momento, aquí esperamos a que
        # termine y releemos su resultado, así que el guardián de abajo decide
        # con el estado bueno y nos devuelve un 409. Sin el bloqueo podríamos
        # validar sobre un PENDIENTE que el worker convierte en EXPORTADO justo
        # después, y acabaríamos escribiendo encima de una caja ya enviada.
        caja = (
            db.query(models.CajaReempaque)
            .filter(models.CajaReempaque.id_temporal == datos.id_temporal)
            .with_for_update()
            .first()
        )
        if not caja:
            raise HTTPException(
                status_code=404,
                detail=f"Caja '{datos.id_temporal}' no encontrada.",
            )

        verificar_caja_editable(db, caja)

        tipo_caja = getattr(caja, "tipo_caja", None) or (
            TIPO_DEFECTUOSA if caja.is_defective else TIPO_NORMAL
        )
        modelo = normalizar_modelo(getattr(caja, "modelo", None))

        if tipo_caja not in TIPOS_CAJA_VALIDOS:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de caja no válido: {tipo_caja}",
            )

        caducidad_proxima_dias = get_config_int(
            db,
            models,
            modelo,
            "caducidad_proxima_dias",
            30,
        )

        caducidad_proxima_defectuosa_dias = get_config_int(
            db,
            models,
            modelo,
            "caducidad_proxima_defectuosa_dias",
            caducidad_proxima_dias,
        )

        # --- PASO 2: Buscar la celda antigua dentro de esa caja ---
        # El filtro doble (dmc_code index + caja_reempaque_id index) es O(log n).
        celda_antigua = (
            db.query(models.Celda)
            .filter(
                models.Celda.dmc_code == datos.dmc_antiguo,
                models.Celda.caja_reempaque_id == caja.id,
            )
            .first()
        )
        if not celda_antigua:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"La celda '{datos.dmc_antiguo}' no existe en la caja "
                    f"'{datos.id_temporal}'. Comprueba que el DMC es correcto."
                ),
            )

        # --- PASO 3: Verificar que el nuevo DMC no colisiona ---
        if datos.nueva_celda.dmc_code != datos.dmc_antiguo:
            # Solo los campos necesarios, no toda la fila
            conflicto = (
                db.query(models.Celda.dmc_code, models.CajaReempaque.id_temporal)
                .join(
                    models.CajaReempaque,
                    models.CajaReempaque.id == models.Celda.caja_reempaque_id,
                )
                .filter(models.Celda.dmc_code == datos.nueva_celda.dmc_code)
                .first()
            )

            if conflicto:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"El nuevo DMC '{datos.nueva_celda.dmc_code}' ya existe "
                        f"en la caja '{conflicto.id_temporal or 'Desconocida'}'. No se puede usar."
                    ),
                )
        dmc_defectuoso = (
            db.query(models.DMCDefectuoso.dmc_code)
            .filter(models.DMCDefectuoso.dmc_code == datos.nueva_celda.dmc_code)
            .first()
        )

        # comprobamos que la nueva celda cumple las reglas del tipo de caja
        try:
            validar_celda_para_tipo_caja(
                tipo_caja=tipo_caja,
                dmc=datos.nueva_celda.dmc_code,
                fecha_caducidad=datos.nueva_celda.fecha_caducidad,
                dmc_es_defectuoso=dmc_defectuoso is not None,
                caducidad_proxima_dias=caducidad_proxima_dias,
                caducidad_proxima_defectuosa_dias=caducidad_proxima_defectuosa_dias,
            )

        except ValueError as e:
            raise HTTPException(
                status_code=409,
                detail=str(e),
            )

        # --- PASO 5: Asegurar HU de origen de la nueva celda ---

        nuevo_hu_origen = datos.nueva_celda.hu_origen

        if not nuevo_hu_origen:
            raise HTTPException(
                status_code=400,
                detail="El HU de origen de la nueva celda es obligatorio.",
            )

        palet_existente = (
            db.query(models.PaletEntrada.hu_proveedor)
            .filter(models.PaletEntrada.hu_proveedor == nuevo_hu_origen)
            .first()
        )

        if not palet_existente:
            db.add(models.PaletEntrada(hu_proveedor=nuevo_hu_origen))

        # --- PASO 6: Actualizar la celda ---

        celda_antigua.dmc_code = datos.nueva_celda.dmc_code
        celda_antigua.fecha_caducidad = datos.nueva_celda.fecha_caducidad
        celda_antigua.hu_origen_id = nuevo_hu_origen
        celda_antigua.estado_calidad = datos.nueva_celda.estado_calidad or "OK"
        celda_antigua.voltaje_medido = datos.nueva_celda.voltaje_medido

        # --- PASO 6: Recalcular fecha_caducidad_caja con SELECT MIN() en SQL ---
        # flush() para que el MIN() vea ya el nuevo valor de fecha_caducidad.
        db.flush()

        # SELECT MIN(fecha_caducidad) FROM celdas WHERE caja_reempaque_id = ?
        # Una sola query agregada en vez de cargar 180 filas en Python.
        nueva_caducidad_caja = (
            db.query(func.min(models.Celda.fecha_caducidad))
            .filter(models.Celda.caja_reempaque_id == caja.id)
            .scalar()
        )
        caja.fecha_caducidad_caja = nueva_caducidad_caja

        # La caja agotó los reintentos y la acabamos de corregir: se reencola
        # para que el worker lo vuelva a intentar al reanudar la
        # sincronización. Sin esto se quedaría en ERROR para siempre, porque
        # el worker solo mira las PENDIENTE.
        #
        # Una caja EXPORTADO no llega hasta aquí: verificar_caja_editable la
        # corta antes.
        if caja.estado_sync == ESTADO_ERROR:
            caja.estado_sync = ESTADO_PENDIENTE
            caja.intentos_sync = 0
            logger.info(
                f"Caja {caja.id_temporal} reencolada tras corregirse: "
                f"estaba en ERROR."
            )

        db.commit()

        logger.info(
            f"Sustitucion en caja {datos.id_temporal}: "
            f"{datos.dmc_antiguo} -> {datos.nueva_celda.dmc_code} "
            f"por usuario {datos.usuario_id}"
        )

        return schemas.SustitucionResponse(
            mensaje="Celda sustituida correctamente.",
            id_temporal=datos.id_temporal,
            dmc_antiguo=datos.dmc_antiguo,
            dmc_nuevo=datos.nueva_celda.dmc_code,
            nueva_fecha_caducidad_caja=nueva_caducidad_caja,
        )

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        logger.error(
            f"FALLO al sustituir celda en caja {datos.id_temporal}: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Error al sustituir la celda.")


@router.delete("/cajas/{id_temporal}", status_code=200)
def eliminar_caja(
    id_temporal: str,
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(
        auth.require_roles(auth.ROL_OPERARIO_LINEA, auth.ROL_ADMIN, auth.ROL_SUPERADMIN)
    ),
):
    # with_for_update: mismo motivo que en sustituir_celda. Reservamos la fila
    # antes de decidir, para no borrar una caja que el worker está exportando
    # en este instante.
    caja = (
        db.query(models.CajaReempaque)
        .filter(models.CajaReempaque.id_temporal == id_temporal)
        .with_for_update()
        .first()
    )
    if not caja:
        raise HTTPException(
            status_code=404,
            detail=f"❌ No existe ninguna caja con ID '{id_temporal}'.",
        )

    # Solo se borran cajas que nunca salieron: una EXPORTADO la corta
    # verificar_caja_editable, así que no puede quedarse un CSV huérfano en el
    # NAS (el worker solo escribe, nunca borra).
    verificar_caja_editable(db, caja)

    try:
        db.delete(caja)  # cascade="all, delete-orphan" borra las celdas automáticamente
        db.commit()
        logger.info(f"Caja {id_temporal} eliminada por {current_user.username}")
        return {
            "mensaje": f"✅ Caja {id_temporal} y sus celdas eliminadas correctamente."
        }
    except Exception as e:
        db.rollback()
        logger.error(f"FALLO al eliminar caja {id_temporal}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al eliminar la caja.")
