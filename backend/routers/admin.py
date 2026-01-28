from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, text
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


# --- FUNCIÓN AUXILIAR PARA FILTROS ---
def aplicar_filtros(
    query, dmc, hu_entrada, hu_salida, fecha_inicio, fecha_fin, fecha_caducidad
):

    # 1. Join obligatorio: Celda siempre pertenece a una Caja
    query = query.join(models.Celda.caja_destino)

    # 2. Join opcional: Palet de entrada (puede no estar registrado si el admin es lento)
    query = query.outerjoin(
        models.PaletEntrada,
        models.Celda.hu_origen_id == models.PaletEntrada.hu_proveedor,
    )

    # --- FILTROS DINÁMICOS ---
    if dmc:
        dmc_limpio = unquote(dmc).strip()

        # busqueda con el binary tree que es mas rapido
        query = query.filter(models.Celda.dmc_code == dmc_limpio)

    if hu_entrada:
        query = query.filter(models.PaletEntrada.hu_proveedor.contains(hu_entrada))

    if hu_salida:
        # Puede ser el HU Silena o el HU Embarque Final
        query = query.filter(
            models.CajaReempaque.hu_silena_outbound.contains(hu_salida)
        )

    if fecha_caducidad:
        hoy = date.today()
        query = query.filter(
            models.Celda.fecha_caducidad >= hoy,
            models.Celda.fecha_caducidad <= fecha_caducidad,
        )

    # Filtro de fecha de escaneo (usamos la fecha de la caja de reempaque final)
    if not fecha_inicio:
        # Por defecto solo últimos 30 días para evitar bloqueos masivos
        fecha_inicio = datetime.now() - timedelta(days=30)

    if fecha_inicio and fecha_fin:
        dt_fin_base = datetime.combine(fecha_fin, time.min)

        fecha_fin = dt_fin_base + timedelta(days=1)

        query = query.filter(
            models.CajaReempaque.fecha_fin_reempaque.between(fecha_inicio, fecha_fin)
        )

    return query


# 1. DEFINIMOS EL DICCIONARIO MAESTRO DE DATOS (Para no repetir código)
# Esto ayuda a mapear "nombre_columna" -> "valor_en_db"
def construir_fila(celda, caja, palet):
    return {
        "fecha_recibo": palet.fecha_recibo if palet else None,
        "awb": palet.awb_swb if palet else "",
        "np": palet.np_packing_list if palet else "",
        "status": getattr(palet, "generation_status", "") if palet else "",
        "hu_proveedor": palet.hu_proveedor if palet else "",
        "caducidad_inbound": celda.fecha_caducidad,
        "fecha_reempaque": caja.fecha_fin_reempaque if caja else None,
        "operario": (
            getattr(caja, "usuario_id", "") if caja else ""
        ),  # <--- TU DATO NUEVO
        "dmc": celda.dmc_code,
        "estado_calidad": getattr(celda, "estado_calidad", "OK"),
        "id_temporal": caja.id_temporal,
        "caducidad_celda": celda.fecha_caducidad,
        "caducidad_antigua": celda.fecha_caducidad,
        "fecha_almacenamiento": getattr(caja, "fecha_almacenamiento", None),
        "hu_silena": getattr(caja, "hu_silena_outbound", "") or "",
        "ubicacion": getattr(caja, "ubicacion_estanteria", "") or "",
        "n_salida": getattr(caja, "numero_salida_delivery", "") or "",
        "handling_unit": getattr(caja, "handling_unit", "") or "",
        "fecha_envio": getattr(caja, "fecha_envio", None),
    }


# --- ENDPOINT 1: VISTA PREVIA (JSON para la Web) ---
@router.get("/consulta/preview")
def buscar_preview(
    # ... (tus filtros anteriores dmc, hu_entrada, etc siguen igual) ...
    dmc: Optional[str] = None,
    hu_entrada: Optional[str] = None,
    hu_salida: Optional[str] = None,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    fecha_caducidad: Optional[date] = None,
    # NUEVO PARÁMETRO: Recibimos las columnas separadas por coma
    cols: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # proteger ruta
    current_user: models.UsuarioAdmin = Depends(auth.get_current_admin),
):
    base_query = db.query(models.Celda)
    query = aplicar_filtros(
        base_query, dmc, hu_entrada, hu_salida, fecha_inicio, fecha_fin, fecha_caducidad
    )
    resultados = query.limit(180).all()

    # Parsear columnas solicitadas (si no envían nada, devolvemos todo por defecto)
    columnas_pedidas = cols.split(",") if cols else None

    data = []
    for celda in resultados:
        fila_completa = construir_fila(celda, celda.caja_destino, celda.palet_origen)

        if columnas_pedidas:
            # Filtramos: Solo devolvemos las claves que el frontend pidió
            fila_filtrada = {
                k: fila_completa[k] for k in columnas_pedidas if k in fila_completa
            }
            data.append(fila_filtrada)
        else:
            data.append(fila_completa)

    return data


# --- ENDPOINT 2: CSV DINÁMICO ---
@router.get("/consulta/exportar")
def exportar_csv(
    # ... (tus filtros igual) ...
    dmc: Optional[str] = None,
    hu_entrada: Optional[str] = None,
    hu_salida: Optional[str] = None,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    fecha_caducidad: Optional[date] = None,
    cols: Optional[str] = Query(None),  # <--- NUEVO
    labels: Optional[str] = Query(
        None
    ),  # <--- NUEVO (Para las cabeceras bonitas del Excel)
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(auth.get_current_admin),
):
    base_query = db.query(models.Celda).options(
        joinedload(models.Celda.caja_destino), joinedload(models.Celda.palet_origen)
    )

    query = aplicar_filtros(
        base_query, dmc, hu_entrada, hu_salida, fecha_inicio, fecha_fin, fecha_caducidad
    )

    # 1. PREPARAR COLUMNAS
    if cols and labels:
        lista_keys = cols.split(",")
        lista_labels = labels.split(",")
    else:
        # Fallback por si alguien llama a la API sin params
        lista_keys = ["dmc", "hu_proveedor"]
        lista_labels = ["DMC", "HU Prov"]

    def iterar_filas():
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";")

        # 1. ESCRIBIR CABECERAS DINÁMICAS
        writer.writerow(lista_labels)

        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        for celda in query.yield_per(1000):
            # Construimos el diccionario con TOOOODOS los datos
            fila_completa = construir_fila(
                celda, celda.caja_destino, celda.palet_origen
            )

            # Creamos la lista ordenada según lo que pidió el usuario
            valores_ordenados = [fila_completa.get(key, "") for key in lista_keys]

            writer.writerow(valores_ordenados)

            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    response = StreamingResponse(iterar_filas(), media_type="text/csv")
    response.headers["Content-Disposition"] = (
        f"attachment; filename=Reporte_{date.today()}.csv"
    )
    return response


# --- ENDPOINT 1: OBTENER CONFIGURACIÓN (Para Frontend) ---
@router.get("/config", response_model=schemas.ConfigResponse)
def obtener_configuracion(
    db: Session = Depends(get_db),
):
    # Buscamos los valores en la DB
    conf_alerta = db.query(models.Configuracion).filter_by(clave="alerta_cada").first()
    conf_limite = db.query(models.Configuracion).filter_by(clave="limite_caja").first()

    # Si no existen, devolvemos valores por defecto (Safety check)
    return {
        "alerta_cada": int(conf_alerta.valor) if conf_alerta else 15,
        "limite_caja": int(conf_limite.valor) if conf_limite else 180,
    }


# --- ENDPOINT 2: MODIFICAR CONFIGURACIÓN (Para Admin) ---
@router.put("/config")
def actualizar_configuracion(
    datos: schemas.ConfigInput,
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(auth.require_super_admin),
):
    # Buscamos la clave (ej: "alerta_cada")
    config = db.query(models.Configuracion).filter_by(clave=datos.clave).first()

    if not config:
        # Si no existe, la creamos
        config = models.Configuracion(clave=datos.clave, valor=datos.valor)
        db.add(config)
        mensaje = "✅ Configuración creada"
    else:
        # Si existe, actualizamos
        config.valor = datos.valor
        mensaje = "🔄 Configuración actualizada"

    db.commit()
    return {"mensaje": mensaje, "clave": datos.clave, "nuevo_valor": datos.valor}


@router.post("/importar-defectuosos")
async def importar_defectuosos(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    print(f"🔄 PASO 1: Recibiendo archivo {file.filename}...")

    try:
        # 1. Leer bytes crudos
        contents = await file.read()
        print(f"✅ PASO 2: Leídos {len(contents)} bytes.")

        file_obj = io.BytesIO(contents)
        df = None

        # 2. DETECTOR DE FORMATO
        es_excel = contents.startswith(b"PK")

        if es_excel:
            print("📊 PASO 3: Es EXCEL (.xlsx).")
            try:
                # dtype=str obliga a que TODO sea texto, evitando que "001" se convierta en "1"
                df = pd.read_excel(file_obj, engine="openpyxl", dtype=str)
            except Exception as e:
                return {"error": f"Fallo excel: {str(e)}"}
        else:
            print("📝 PASO 3: Es CSV.")
            try:
                # Detectar separador manualmente
                primera_linea = (
                    contents[:1024].decode("utf-8", errors="ignore").split("\n")[0]
                )
                num_pyc = primera_linea.count(";")
                num_comas = primera_linea.count(",")
                separador = ";" if num_pyc > num_comas else ","
                print(f"🔧 PASO 4: Separador -> '{separador}'")

                file_obj.seek(0)
                # 👇 AQUÍ ESTÁ EL ARREGLO DEL DtypeWarning: dtype=str
                df = pd.read_csv(file_obj, sep=separador, dtype=str)

            except Exception as e:
                return {"error": f"Fallo CSV: {str(e)}"}

        # 3. Validación de Columnas
        # Limpiamos nombres de columnas
        df.columns = [str(c).strip() for c in df.columns]

        if "DMC" not in df.columns:
            return {
                "error": "El archivo no tiene la columna 'DMC'.",
                "columnas": df.columns.tolist(),
            }

        # 4. LIMPIEZA EXTREMA DE DATOS (Para evitar el error de PostgreSQL)
        print("💾 PASO 6: Limpiando datos...")

        df["DMC"] = df["DMC"].astype(str).str.strip()
        filtro_basura = ~df["DMC"].str.lower().isin(["nan", "none", "", "null"])
        df = df[filtro_basura]

        codigos_nuevos = set(df["DMC"].unique())
        existentes_query = db.query(models.DMCDefectuoso.dmc_code).all()
        existentes = set(x[0] for x in existentes_query)
        a_insertar_lista = list(codigos_nuevos - existentes)

        objetos = [models.DMCDefectuoso(dmc_code=cod) for cod in a_insertar_lista]

        if objetos:
            db.bulk_save_objects(objetos)
            db.commit()

        print("✅ FIN: Operación completada en milisegundos.")

        db.commit()
        print(f"🎉 FIN:  registros guardados.")

        return {
            "mensaje": "Importación completada con éxito.",
            "total_archivo": len(codigos_nuevos),
            "nuevos_insertados": len(objetos),
            "ya_existian": len(codigos_nuevos) - len(objetos),
        }

    except Exception as e:
        print(f"💥 ERROR: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dmc-defectuosos")
def listar_defectuosos(db: Session = Depends(get_db)):
    # Retornamos solo los strings en un array simple para el Frontend
    return [c.dmc_code for c in db.query(models.DMCDefectuoso).all()]
