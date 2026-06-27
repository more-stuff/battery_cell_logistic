from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import (
    Session,
    contains_eager,
)  # ← contains_eager en vez de joinedload
from typing import Optional
from datetime import date, datetime, time, timedelta
from urllib.parse import unquote

import csv
import io

from database import get_db
import models, auth
from box_rules import normalizar_modelo

router = APIRouter(prefix="/admin", tags=["Consulta"])

BATCH_CSV = 500  # filas por chunk HTTP → 50k filas = 100 chunks en vez de 50.000


def normalizar_modelo_filtro(modelo: Optional[str]) -> Optional[str]:
    if not modelo:
        return None

    try:
        return normalizar_modelo(modelo)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


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
    tipo_caja,
    modelo,
    id_temporal,
    usuario_id,
):
    # Estos JOINs los reutilizará contains_eager — no tocar el orden
    query = query.join(models.Celda.caja_destino)
    query = query.outerjoin(
        models.PaletEntrada,
        models.Celda.hu_origen_id == models.PaletEntrada.hu_proveedor,
    )

    if dmc:
        query = query.filter(models.Celda.dmc_code == unquote(dmc).strip())

    if hu_entrada:
        hu_entrada = unquote(hu_entrada).strip()
        query = query.filter(models.PaletEntrada.hu_proveedor == hu_entrada)

    if hu_salida:
        hu_salida = unquote(hu_salida).strip()
        query = query.filter(models.CajaReempaque.hu_silena_outbound == hu_salida)

    if id_temporal:
        id_temporal = unquote(id_temporal).strip()
        query = query.filter(models.CajaReempaque.id_temporal == id_temporal)

    if usuario_id:
        usuario_id = unquote(usuario_id).strip()
        query = query.filter(models.CajaReempaque.usuario_id == usuario_id)

    if fecha_caducidad:
        hoy = date.today()

        if fecha_caducidad < hoy:
            # Si la fecha seleccionada es anterior a hoy, interpretamos que se quieren ver celdas ya caducadas.
            query = query.filter(
                models.Celda.fecha_caducidad <= fecha_caducidad,
            )
        else:
            # celdas que caducan desde hoy hasta la fecha seleccionada.
            query = query.filter(
                models.Celda.fecha_caducidad >= hoy,
                models.Celda.fecha_caducidad <= fecha_caducidad,
            )

    if not fecha_inicio:
        fecha_inicio = datetime.now() - timedelta(days=30)

    if fecha_inicio and fecha_fin:
        dt_fin = datetime.combine(fecha_fin, time.min) + timedelta(days=1)
        query = query.filter(
            models.CajaReempaque.fecha_fin_reempaque.between(fecha_inicio, dt_fin)
        )

    if tipo_caja:
        query = query.filter(models.CajaReempaque.tipo_caja == tipo_caja)
    elif is_defective is not None:
        # Fallback retrocompatible por si alguna pantalla vieja sigue mandando is_defective
        query = query.filter(models.CajaReempaque.is_defective == is_defective)

    if modelo:
        modelo = normalizar_modelo_filtro(modelo)
        query = query.filter(models.CajaReempaque.modelo == modelo)

    return query


def construir_fila(celda, caja, palet):
    return {
        "fecha_recibo": palet.fecha_recibo if palet else None,
        "awb": palet.awb_swb if palet else "",
        "np": palet.np_packing_list if palet else "",
        "status": getattr(palet, "generation_status", "") if palet else "",
        "hu_proveedor": palet.hu_proveedor if palet else "",
        "caducidad_inbound": palet.fecha_caducidad_proveedor if palet else None,
        "fecha_inicio_reempaque": caja.fecha_inicio_reempaque if caja else None,
        "fecha_fin_reempaque": caja.fecha_fin_reempaque if caja else None,
        "operario": getattr(caja, "usuario_id", "") if caja else "",
        "dmc": celda.dmc_code,
        "estado_calidad": getattr(celda, "estado_calidad", "OK"),
        "id_temporal": caja.id_temporal if caja else "",
        "posicion_caja": celda.posicion_en_caja if celda else "",
        "caducidad_celda": celda.fecha_caducidad,
        "caducidad_antigua": caja.fecha_caducidad_caja if caja else None,
        "fecha_almacenamiento": getattr(caja, "fecha_almacenamiento", None),
        "is_defective": getattr(caja, "is_defective", False),
        "tipo_caja": getattr(caja, "tipo_caja", None)
        or ("DEFECTUOSA" if getattr(caja, "is_defective", False) else "NORMAL"),
        "modelo": normalizar_modelo(getattr(caja, "modelo", None)) or "MODELO1",
        "hu_silena": getattr(caja, "hu_silena_outbound", "") or "",
        "ubicacion": getattr(caja, "ubicacion_estanteria", "") or "",
        "n_salida": getattr(caja, "numero_salida_delivery", "") or "",
        "handling_unit": getattr(caja, "handling_unit", "") or "",
        "fecha_envio": getattr(caja, "fecha_envio", None),
    }


# --- ENDPOINT 1: VISTA PREVIA ---
@router.get("/consulta/preview")
def buscar_preview(
    dmc: Optional[str] = None,
    hu_entrada: Optional[str] = None,
    hu_salida: Optional[str] = None,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    fecha_caducidad: Optional[date] = None,
    is_defective: Optional[bool] = None,
    tipo_caja: Optional[str] = None,
    modelo: Optional[str] = None,
    id_temporal: Optional[str] = None,
    usuario_id: Optional[str] = None,
    cols: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(
        auth.require_roles(
            auth.ROL_ADMIN,
            auth.ROL_SUPERADMIN,
            auth.ROL_OPERARIO_LINEA,
        )
    ),
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
        tipo_caja,
        modelo,
        id_temporal,
        usuario_id,
    )

    # FIX: contains_eager reutiliza los JOINs de aplicar_filtros.
    # Sin esto cada acceso a celda.caja_destino dispara una query extra (N+1).
    query = query.options(
        contains_eager(models.Celda.caja_destino),
        contains_eager(models.Celda.palet_origen),
    )

    resultados = query.limit(252).all()
    columnas_pedidas = cols.split(",") if cols else None

    data = []
    for celda in resultados:
        fila_completa = construir_fila(celda, celda.caja_destino, celda.palet_origen)
        if columnas_pedidas:
            data.append(
                {k: fila_completa[k] for k in columnas_pedidas if k in fila_completa}
            )
        else:
            data.append(fila_completa)

    return data


# --- ENDPOINT 2: CSV STREAMING ---
@router.get("/consulta/exportar")
def exportar_csv(
    dmc: Optional[str] = None,
    hu_entrada: Optional[str] = None,
    hu_salida: Optional[str] = None,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    fecha_caducidad: Optional[date] = None,
    is_defective: Optional[bool] = None,
    tipo_caja: Optional[str] = None,
    modelo: Optional[str] = None,
    id_temporal: Optional[str] = None,
    usuario_id: Optional[str] = None,
    cols: Optional[str] = Query(None),
    labels: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(
        auth.require_roles(auth.ROL_ADMIN, auth.ROL_SUPERADMIN, auth.ROL_OPERARIO_LINEA)
    ),
):
    if cols and labels:
        lista_keys = cols.split(",")
        lista_labels = labels.split(",")
    else:
        lista_keys = ["dmc", "hu_proveedor"]
        lista_labels = ["DMC", "HU Prov"]

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
        tipo_caja,
        modelo,
        id_temporal,
        usuario_id,
    )

    query = query.options(
        contains_eager(models.Celda.caja_destino),
        contains_eager(models.Celda.palet_origen),
    )

    def iterar_filas():
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";")

        # Cabecera
        writer.writerow(lista_labels)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        # 50k filas / 500 por chunk = 100 chunks en vez de 50.000
        count = 0
        for celda in query.yield_per(BATCH_CSV):
            fila_completa = construir_fila(
                celda, celda.caja_destino, celda.palet_origen
            )
            writer.writerow([fila_completa.get(key, "") for key in lista_keys])
            count += 1

            if count % BATCH_CSV == 0:
                yield output.getvalue()
                output.seek(0)
                output.truncate(0)

        # Flush del último batch que no llegó a BATCH_CSV filas
        tail = output.getvalue()
        if tail:
            yield tail

    response = StreamingResponse(iterar_filas(), media_type="text/csv")

    response.headers["Content-Disposition"] = (
        f'attachment; filename="Reporte_{date.today()}.csv"'
    )
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    return response
