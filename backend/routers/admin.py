from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime, time, timedelta
from urllib.parse import unquote
import csv
import io


from database import get_db
import models, schemas

# Fíjate que NO importamos schemas aquí para el modelo de entrada,
# lo definimos localmente para evitar el error que tienes.

router = APIRouter(prefix="/admin", tags=["Admin"])


# --- FUNCIÓN PRINCIPAL ---
@router.put("/incoming/actualizar")
def actualizar_datos_entrada(
    datos: schemas.IncomingData, db: Session = Depends(get_db)
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
def registrar_salida(datos: schemas.OutboundData, db: Session = Depends(get_db)):
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
        caja.hu_final_embarque = datos.handling_unit

    if datos.fecha_envio != "":
        caja.fecha_envio = datos.fecha_envio

    # Cambiamos estado para saber que ya se procesó
    caja.estado = "PREPARADO_SALIDA"

    db.commit()
    return {"mensaje": "✅ DATOS DE SALIDA GUARDADOS CORRECTAMENTE"}


from sqlalchemy import text


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

        # Convertimos AMBOS lados a Hexadecimal (md5) para comparar.
        # Si esto falla, es que los datos SON DIFERENTES y punto.
        query = query.filter(text("md5(dmc_code) = md5(:valor)")).params(
            valor=dmc_limpio
        )

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
        "caducidad_celda": celda.fecha_caducidad,
        "caducidad_antigua": celda.fecha_caducidad,
        "fecha_almacenamiento": getattr(caja, "fecha_almacenamiento", None),
        "hu_silena": getattr(caja, "hu_silena_outbound", "") or "",
        "ubicacion": getattr(caja, "ubicacion_estanteria", "") or "",
        "n_salida": getattr(caja, "numero_salida_delivery", "") or "",
        "hu_final": getattr(caja, "hu_final_embarque", "") or "",
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
):
    base_query = db.query(models.Celda)
    query = aplicar_filtros(
        base_query, dmc, hu_entrada, hu_salida, fecha_inicio, fecha_fin, fecha_caducidad
    )
    resultados = query.limit(50).all()

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
):
    base_query = db.query(models.Celda)
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
def obtener_configuracion(db: Session = Depends(get_db)):
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
def actualizar_configuracion(datos: schemas.ConfigInput, db: Session = Depends(get_db)):
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
