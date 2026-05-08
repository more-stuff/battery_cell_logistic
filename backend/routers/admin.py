from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    UploadFile,
    File,
    status,
)
import logging
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_, text
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime, time, timedelta
from urllib.parse import unquote
import pandas as pd

import csv
import io


from database import get_db
import models, schemas, auth

# Fíjate que NO importamos schemas aquí para el modelo de entrada,
# lo definimos localmente para evitar el error que tienes.

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/login", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    # Buscamos usuario
    user = (
        db.query(models.UsuarioAdmin)
        .filter(models.UsuarioAdmin.username == form_data.username)
        .first()
    )

    # Verificamos contraseña
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Creamos token
    access_token = auth.create_access_token(
        data={"sub": user.username, "rol": user.rol}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "rol": user.rol,
    }


# --- 2. ENDPOINT "SECRETO" PARA CREAR USUARIOS (Usar con Postman) ---
@router.post("/register", status_code=201)
def registrar_admin(usuario: schemas.AdminCreate, db: Session = Depends(get_db)):
    # Ver si ya existe
    existe = (
        db.query(models.UsuarioAdmin)
        .filter(models.UsuarioAdmin.username == usuario.username)
        .first()
    )
    if existe:
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    # Hashear password
    print(f"👀 USUARIO RECIBIDO: {usuario.username}")
    print(f"👀 LONGITUD PASSWORD: {len(usuario.password)}")
    print(f"👀 CONTENIDO PASSWORD: '{usuario.password}'")

    hashed_pw = auth.get_password_hash(usuario.password)

    nuevo_admin = models.UsuarioAdmin(
        username=usuario.username,
        hashed_password=hashed_pw,
        rol=usuario.rol,
    )
    db.add(nuevo_admin)
    db.commit()
    return {"mensaje": f"Usuario {usuario.username} creado con rol {usuario.rol}"}


# --- FUNCIÓN PRINCIPAL ---
@router.put("/incoming/actualizar")
def actualizar_datos_entrada(
    datos: schemas.IncomingData,
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(auth.get_current_admin),
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
    current_user: models.UsuarioAdmin = Depends(auth.get_current_admin),
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

    # Cambiamos estado para saber que ya se procesó
    caja.estado = "PREPARADO_SALIDA"

    db.commit()
    return {"mensaje": "✅ DATOS DE SALIDA GUARDADOS CORRECTAMENTE"}


@router.get("/{id_temporal}/celdas", response_model=schemas.CajaConCeldas)
def get_celdas_caja(
    id_temporal: str,
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(auth.get_current_admin),
):
    # joinedload: carga la caja Y sus celdas en UNA SOLA query con JOIN.
    # Sin esto SQLAlchemy haria 2 queries separadas (lazy load por defecto).
    caja = (
        db.query(models.CajaReempaque)
        .options(joinedload(models.CajaReempaque.celdas))
        .filter(models.CajaReempaque.id_temporal == id_temporal)
        .first()
    )

    if not caja:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontro ninguna caja con id '{id_temporal}'",
        )

    celdas_detalle = [
        schemas.CeldaDetalle(
            dmc_code=c.dmc_code,
            fecha_caducidad=c.fecha_caducidad,
            hu_origen=c.hu_origen_id,
            estado_calidad=c.estado_calidad or "OK",
        )
        for c in caja.celdas
    ]

    return schemas.CajaConCeldas(
        id_temporal=caja.id_temporal,
        fecha_caducidad_caja=caja.fecha_caducidad_caja,
        is_defective=caja.is_defective,
        total_celdas=len(celdas_detalle),
        celdas=celdas_detalle,
    )


@router.post("/sustituir-celda", response_model=schemas.SustitucionResponse)
def sustituir_celda(
    datos: schemas.SustitucionInput,
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(auth.get_current_admin),
):
    try:
        # --- PASO 1: Buscar la caja ---
        caja = (
            db.query(models.CajaReempaque)
            .filter(models.CajaReempaque.id_temporal == datos.id_temporal)
            .first()
        )
        if not caja:
            raise HTTPException(
                status_code=404,
                detail=f"Caja '{datos.id_temporal}' no encontrada.",
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
                db.query(models.Celda.caja_reempaque_id)
                .filter(models.Celda.dmc_code == datos.nueva_celda.dmc_code)
                .first()
            )
            if conflicto:
                id_temporal_conflicto = (
                    db.query(models.CajaReempaque.id_temporal)
                    .filter(models.CajaReempaque.id == conflicto.caja_reempaque_id)
                    .scalar()
                )
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"El nuevo DMC '{datos.nueva_celda.dmc_code}' ya existe "
                        f"en la caja '{id_temporal_conflicto or 'Desconocida'}'. No se puede usar."
                    ),
                )

        # --- PASO 5: Actualizar la celda ---

        celda_antigua.dmc_code = datos.nueva_celda.dmc_code
        celda_antigua.fecha_caducidad = datos.nueva_celda.fecha_caducidad
        celda_antigua.estado_calidad = datos.nueva_celda.estado_calidad or "OK"

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
