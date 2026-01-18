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


# --- ENDPOINT 1: VISTA PREVIA (JSON para la Web) ---
@router.get("/consulta/preview")
def buscar_preview(
    dmc: Optional[str] = None,
    hu_entrada: Optional[str] = None,
    hu_salida: Optional[str] = None,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    fecha_caducidad: Optional[date] = None,
    db: Session = Depends(get_db),
):

    base_query = db.query(models.Celda)
    query = aplicar_filtros(
        base_query, dmc, hu_entrada, hu_salida, fecha_inicio, fecha_fin, fecha_caducidad
    )

    # Limitamos a 50 para la web
    resultados = query.limit(50).all()

    data = []
    for celda in resultados:
        # Lógica de extracción (idéntica a la del CSV)
        palet = celda.palet_origen
        caja = celda.caja_destino

        # Mapeo exacto de las 17 columnas
        row = {
            "fecha_recibo": palet.fecha_recibo if palet else None,  # 1
            "awb": palet.awb_swb if palet else "",  # 2
            "np": palet.np_packing_list if palet else "",  # 3
            "status": getattr(palet, "generation_status", "") if palet else "",  # 4
            "hu_proveedor": palet.hu_proveedor if palet else "",  # 5
            "caducidad_inbound": celda.fecha_caducidad,  # 6
            "fecha_reempaque": caja.fecha_fin_reempaque if caja else None,  # 7
            # "registro_silena": "SI" if caja and caja.hu_silena_outbound else "NO",  # 8
            "dmc": celda.dmc_code,  # 9
            "caducidad_celda": celda.fecha_caducidad,  # 10
            "caducidad_antigua": celda.fecha_caducidad,  # 11
            "fecha_almacenamiento": getattr(caja, "fecha_almacenamiento", None),  # 12
            "hu_silena": getattr(caja, "hu_silena_outbound", "") or "",  # 13
            "ubicacion": getattr(caja, "ubicacion_estanteria", "") or "",  # 14
            "n_salida": getattr(caja, "numero_salida_delivery", "") or "",  # 15
            "hu_final": getattr(caja, "hu_final_embarque", "") or "",  # 16
            "fecha_envio": getattr(caja, "fecha_envio", None),  # 17
        }
        data.append(row)

    return data


# --- ENDPOINT 2: DESCARGA CSV (Streaming para Excel) ---
@router.get("/consulta/exportar")
def exportar_csv(
    dmc: Optional[str] = None,
    hu_entrada: Optional[str] = None,
    hu_salida: Optional[str] = None,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    fecha_caducidad: Optional[date] = None,
    db: Session = Depends(get_db),
):
    base_query = db.query(models.Celda)
    query = aplicar_filtros(
        base_query, dmc, hu_entrada, hu_salida, fecha_inicio, fecha_fin, fecha_caducidad
    )

    def iterar_filas():
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";")  # ';' para Excel europeo

        # 1. CABECERAS (Ordenadas según tu imagen)
        headers = [
            "Fecha Recibo Almacén",
            "AWB / SWB",
            "NP Packing List",
            "Generation Status",
            "HU Palet Proveedor",
            "Caducidad Celdas (Inbound)",
            "Fecha Reempaque",
            # "Registro en Silena",
            "DMC",
            "Caducidad Celda",
            "Caducidad más antigua",
            "Fecha Almacenamiento",
            "HU Silena (Outbound)",
            "Ubicación Estantería",
            "Nº Salida / Delivery",
            "Handling Unit",
            "Fecha de Envío",
        ]
        writer.writerow(headers)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        for celda in query.yield_per(1000):
            palet = celda.palet_origen
            caja = celda.caja_destino

            # Extracción segura de datos
            f_recibo = palet.fecha_recibo if palet else ""
            awb = palet.awb_swb if palet else ""
            np = palet.np_packing_list if palet else ""
            status = getattr(palet, "generation_status", "") if palet else ""
            hu_prov = palet.hu_proveedor if palet else ""

            caducidad = celda.fecha_caducidad if celda.fecha_caducidad else ""
            dmc_code = celda.dmc_code

            f_reempaque = caja.fecha_fin_reempaque if caja else ""
            # reg_silena = "SI" if caja and caja.hu_silena_outbound else "NO"

            f_almacen = getattr(caja, "fecha_almacenamiento", "") or ""
            hu_silena = getattr(caja, "hu_silena_outbound", "") or ""
            ubicacion = getattr(caja, "ubicacion_estanteria", "") or ""
            n_salida = getattr(caja, "numero_salida_delivery", "") or ""
            hu_final = getattr(caja, "hu_final_embarque", "") or ""
            f_envio = getattr(caja, "fecha_envio", "") or ""

            writer.writerow(
                [
                    f_recibo,
                    awb,
                    np,
                    status,
                    hu_prov,
                    caducidad,
                    f_reempaque,
                    # reg_silena,
                    dmc_code,
                    caducidad,
                    caducidad,
                    f_almacen,
                    hu_silena,
                    ubicacion,
                    n_salida,
                    hu_final,
                    f_envio,
                ]
            )

            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    response = StreamingResponse(iterar_filas(), media_type="text/csv")
    response.headers["Content-Disposition"] = (
        f"attachment; filename=Trazabilidad_{date.today()}.csv"
    )
    return response
