from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
import logging
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from box_rules import (
    TIPO_NORMAL,
    TIPO_DEFECTUOSA,
    TIPOS_CAJA_VALIDOS,
    validar_celda_para_tipo_caja,
    get_config_int,
)


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

    # Cambiamos estado para saber que ya se procesó
    caja.estado = "PREPARADO_SALIDA"

    db.commit()
    return {"mensaje": "✅ DATOS DE SALIDA GUARDADOS CORRECTAMENTE"}


@router.get("/{id_temporal}/celdas", response_model=schemas.CajaConCeldas)
def get_celdas_caja(
    id_temporal: str,
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(
        auth.require_roles(auth.ROL_OPERARIO_LINEA, auth.ROL_ADMIN, auth.ROL_SUPERADMIN)
    ),
):
    # joinedload: carga la caja Y sus celdas en UNA SOLA query con JOIN.
    # Sin esto SQLAlchemy haria 2 queries separadas (lazy load por defecto).
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
        )
        for c in celdas
    ]

    return schemas.CajaConCeldas(
        id_temporal=caja.id_temporal,
        fecha_caducidad_caja=caja.fecha_caducidad_caja,
        is_defective=caja.is_defective,
        total_celdas=len(celdas_detalle),
        tipo_caja=getattr(caja, "tipo_caja", None),
        celdas=celdas_detalle,
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
        tipo_caja = getattr(caja, "tipo_caja", None) or (
            TIPO_DEFECTUOSA if caja.is_defective else TIPO_NORMAL
        )

        if tipo_caja not in TIPOS_CAJA_VALIDOS:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de caja no válido: {tipo_caja}",
            )

        dias_caducidad_proxima = get_config_int(
            db,
            models,
            "caducidad_proxima_dias",
            30,
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
                dias_caducidad_proxima=dias_caducidad_proxima,
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


@router.delete("/cajas/{id_temporal}", status_code=200)
def eliminar_caja(
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
            detail=f"❌ No existe ninguna caja con ID '{id_temporal}'.",
        )
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
