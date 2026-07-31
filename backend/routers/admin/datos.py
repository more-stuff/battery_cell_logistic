"""
Relleno de los datos administrativos que no salen de la línea.

Entrada: albarán del palet del proveedor. Salida: identificadores de envío de
la caja. Son campos que el admin teclea a mano desde el panel, no los produce
el escaneo.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models, schemas, auth

router = APIRouter()


@router.put("/incoming/actualizar")
def actualizar_datos_entrada(
    datos: schemas.IncomingData,
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(
        auth.require_roles(auth.ROL_ADMIN, auth.ROL_SUPERADMIN)
    ),
):
    # 1. Buscamos el Palet por su HU
    palet = (
        db.query(models.PaletEntrada)
        .filter(models.PaletEntrada.hu_proveedor == datos.hu_entrada)
        .first()
    )

    mensaje = ""

    if not palet:
        # CASO A: No existe -> Lo creamos nuevo
        palet = models.PaletEntrada(
            hu_proveedor=datos.hu_entrada,
            fecha_recibo=datos.fecha_recibo,
            awb_swb=datos.awb_swb,
            np_packing_list=datos.np_packing_list,
            fecha_caducidad_proveedor=datos.fecha_caducidad,
            generation_status="PENDING",
        )
        db.add(palet)
        mensaje = "✅ NUEVO REGISTRO: Palet creado y datos guardados."
    else:
        # CASO B: Ya existe -> Actualizamos SOLO lo que nos hayan enviado
        if datos.fecha_recibo != "":
            palet.fecha_recibo = datos.fecha_recibo
        if datos.awb_swb:
            palet.awb_swb = datos.awb_swb
        if datos.np_packing_list:
            palet.np_packing_list = datos.np_packing_list
        if datos.fecha_caducidad != "":
            palet.fecha_caducidad_proveedor = datos.fecha_caducidad

        mensaje = "🔄 ACTUALIZADO: Datos del palet modificados correctamente."

    db.commit()
    db.refresh(palet)

    return {"mensaje": mensaje, "hu": palet.hu_proveedor}


# RUTA PARA REGISTRAR SALIDA
@router.put("/outbound/actualizar")
def registrar_salida(
    datos: schemas.OutboundData,
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(
        auth.require_roles(auth.ROL_ADMIN, auth.ROL_SUPERADMIN)
    ),
):
    # 1. Buscamos la caja por su ID Temporal (TMP-...)
    caja = (
        db.query(models.CajaReempaque)
        .filter(models.CajaReempaque.id_temporal == datos.id_temporal)
        .first()
    )

    if not caja:
        raise HTTPException(
            status_code=404, detail="❌ ERROR: ID de caja no encontrado."
        )

    if datos.hu_silena:
        caja.hu_silena_outbound = datos.hu_silena

    if datos.numero_salida:
        caja.numero_salida_delivery = datos.numero_salida

    if datos.handling_unit:
        caja.handling_unit = datos.handling_unit

    if datos.fecha_envio != "":
        caja.fecha_envio = datos.fecha_envio

    db.commit()
    return {"mensaje": "✅ DATOS DE SALIDA GUARDADOS CORRECTAMENTE"}
