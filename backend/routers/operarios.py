from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

# Imports relativos (salimos de la carpeta routers para buscar estos archivos)
import models, schemas
from database import get_db

router = APIRouter(
    prefix="/reempaque",  # Todas las rutas empezarán por /reempaque
    tags=["Operario Reempaque"],
)


@router.post("/finalizar", response_model=schemas.RespuestaReempaque)
def finalizar_reempaque(datos: schemas.ReempaqueInput, db: Session = Depends(get_db)):
    if not datos.celdas:
        raise HTTPException(status_code=400, detail="El paquete no contiene celdas")

    fechas_caducidad = [c.fecha_caducidad for c in datos.celdas]
    worst_case_date = min(fechas_caducidad)
    id_temp = f"TMP-{str(uuid.uuid4())[:6].upper()}"

    nueva_caja = models.Caja(
        usuario_reempaque_id=datos.usuario_id,
        fecha_inicio_reempaque=datos.fecha_inicio,
        fecha_reempaque=datos.fecha_fin,
        id_temporal=id_temp,
        hu_silena_outbound=None,
        registro_silena="PENDIENTE",
        fecha_caducidad_mas_antigua=worst_case_date,
        estado="CERRADA",
    )

    for c in datos.celdas:
        nueva_celda = models.Celda(
            dmc_code=c.dmc_code,
            fecha_caducidad=c.fecha_caducidad,
            hu_origen_celda=c.hu_origen,
        )
        nueva_caja.celdas.append(nueva_celda)

    try:
        db.add(nueva_caja)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"mensaje": "Caja guardada", "id_temporal": id_temp}
