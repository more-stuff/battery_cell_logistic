from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import date, datetime, time, timedelta
from urllib.parse import unquote

import csv
import io

from database import get_db
import models, auth


router = APIRouter(prefix="/admin", tags=["Consulta"])


# --- FUNCIÓN AUXILIAR PARA FILTROS ---
def aplicar_filtros(
    query,
    dmc,
    hu_entrada,
    hu_salida,
    fecha_inicio,
    fecha_fin,
    fecha_caducidad,
    is_defective,
    id_temporal,
    usuario_id,
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
    if id_temporal:
        # Puede ser el HU Silena o el HU Embarque Final
        query = query.filter(models.CajaReempaque.id_temporal.contains(id_temporal))

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

    if is_defective is not None:
        query = query.filter(models.CajaReempaque.is_defective == is_defective)

    if usuario_id:
        query = query.filter(models.CajaReempaque.usuario_id.contains(usuario_id))

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
        "caducidad_inbound": palet.fecha_caducidad_proveedor,
        "fecha_inicio_reempaque": caja.fecha_inicio_reempaque if caja else None,
        "fecha_fin_reempaque": caja.fecha_fin_reempaque if caja else None,
        "operario": (
            getattr(caja, "usuario_id", "") if caja else ""
        ),  # <--- TU DATO NUEVO
        "dmc": celda.dmc_code,
        "estado_calidad": getattr(celda, "estado_calidad", "OK"),
        "id_temporal": caja.id_temporal,
        "caducidad_celda": celda.fecha_caducidad,
        "caducidad_antigua": caja.fecha_caducidad_caja,
        "fecha_almacenamiento": getattr(caja, "fecha_almacenamiento", None),
        "is_defective": getattr(caja, "is_defective", False),
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
    is_defective: Optional[bool] = None,
    id_temporal: Optional[str] = None,
    usuario_id: Optional[str] = None,
    # NUEVO PARÁMETRO: Recibimos las columnas separadas por coma
    cols: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # proteger ruta
    current_user: models.UsuarioAdmin = Depends(auth.get_current_admin),
):
    base_query = db.query(models.Celda)
    query = aplicar_filtros(
        base_query,
        dmc,
        hu_entrada,
        hu_salida,
        fecha_inicio,
        fecha_fin,
        fecha_caducidad,
        is_defective,
        id_temporal,
        usuario_id,
    )
    resultados = query.limit(252).all()

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
    is_defective: Optional[bool] = None,
    id_temporal: Optional[str] = None,
    usuario_id: Optional[str] = None,
    # Selecion de columnas
    cols: Optional[str] = Query(None),
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
        base_query,
        dmc,
        hu_entrada,
        hu_salida,
        fecha_inicio,
        fecha_fin,
        fecha_caducidad,
        is_defective,
        id_temporal,
        usuario_id,
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
