from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
import csv
import io
import uuid
from datetime import datetime

import models, schemas
from database import get_db

router = APIRouter(prefix="/admin", tags=["Admin & Reportes"])


# --- GESTIÓN DE CAJAS ---
@router.get("/cajas")
def listar_cajas(
    skip: int = 0,
    limit: int = 50,
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Caja)
    if estado:
        query = query.filter(models.Caja.estado == estado)
    return query.order_by(desc(models.Caja.id)).offset(skip).limit(limit).all()


@router.post("/generar-hu/{caja_id}")
def generar_hu_silena(caja_id: int, db: Session = Depends(get_db)):
    caja = db.query(models.Caja).filter(models.Caja.id == caja_id).first()
    if not caja:
        raise HTTPException(status_code=404, detail="Caja no encontrada")

    nuevo_hu = (
        f"SIL-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
    )
    caja.hu_silena_outbound = nuevo_hu
    caja.registro_silena = "OK"
    db.commit()
    return {"mensaje": "HU Generado", "hu_silena": nuevo_hu}


# --- ACTUALIZACIONES INCOMING/OUTBOUND ---
@router.patch("/actualizar-incoming")
def actualizar_incoming(datos: schemas.IncomingUpdate, db: Session = Depends(get_db)):
    db.query(models.Caja).filter(models.Caja.id.in_(datos.caja_ids)).update(
        {
            models.Caja.awb_swb: datos.awb_swb,
            models.Caja.np_packing_list: datos.np_packing_list,
            models.Caja.hu_palet_proveedor: datos.hu_palet_proveedor,
            models.Caja.fecha_recibo_almacen: datos.fecha_recibo,
        },
        synchronize_session=False,
    )
    db.commit()
    return {"mensaje": "Incoming actualizado"}


@router.patch("/actualizar-outbound")
def actualizar_outbound(datos: schemas.OutboundUpdate, db: Session = Depends(get_db)):
    db.query(models.Caja).filter(models.Caja.id.in_(datos.caja_ids)).update(
        {
            models.Caja.numero_salida_delivery: datos.numero_salida_delivery,
            models.Caja.fecha_envio: datos.fecha_envio,
            models.Caja.estado: "EXPEDIDA",
        },
        synchronize_session=False,
    )
    db.commit()
    return {"mensaje": "Outbound actualizado"}


# --- EXPORTACIÓN CSV ---
@router.get("/exportar-csv")
def exportar_reporte(db: Session = Depends(get_db)):
    def iterador():
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";")
        # Cabeceras completas
        writer.writerow(
            [
                "ID",
                "Fecha Recibo",
                "AWB",
                "Packing List",
                "HU Proveedor",
                "Caducidad Proveedor",
                "HU Origen Celda",
                "DMC",
                "Caducidad Celda",
                "Usuario",
                "Inicio",
                "Fin",
                "Reg. Silena",
                "Caducidad Peor Caso",
                "Fecha Almacen",
                "ID Temp",
                "HU Silena",
                "Ubicacion",
                "Delivery",
                "HU Final",
                "Fecha Envio",
            ]
        )
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        query = db.query(models.Caja).join(models.Celda).yield_per(1000)
        for caja in query:
            for celda in caja.celdas:
                writer.writerow(
                    [
                        caja.id,
                        caja.fecha_recibo_almacen,
                        caja.awb_swb,
                        caja.np_packing_list,
                        caja.hu_palet_proveedor,
                        caja.fecha_caducidad_proveedor,
                        celda.hu_origen_celda,
                        celda.dmc_code,
                        celda.fecha_caducidad,
                        caja.usuario_reempaque_id,
                        caja.fecha_inicio_reempaque,
                        caja.fecha_reempaque,
                        caja.registro_silena,
                        caja.fecha_caducidad_mas_antigua,
                        caja.fecha_almacenamiento,
                        caja.id_temporal,
                        caja.hu_silena_outbound,
                        caja.ubicacion_estanteria,
                        caja.numero_salida_delivery,
                        caja.hu_final_embarque,
                        caja.fecha_envio,
                    ]
                )
                yield output.getvalue()
                output.seek(0)
                output.truncate(0)

    return StreamingResponse(
        iterador(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reporte.csv"},
    )
