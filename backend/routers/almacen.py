from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import models, schemas
from database import get_db

router = APIRouter(prefix="/almacen", tags=["Mozo Almacén"])


@router.post("/ubicar")
def ubicar_caja_estanteria(
    datos: schemas.UbicacionInput, db: Session = Depends(get_db)
):
    caja = (
        db.query(models.Caja)
        .filter(models.Caja.id_temporal == datos.id_temporal)
        .first()
    )

    if not caja:
        raise HTTPException(status_code=404, detail="Etiqueta temporal no encontrada")

    caja.ubicacion_estanteria = datos.ubicacion
    caja.fecha_almacenamiento = datetime.now()
    caja.estado = "ALMACENADA"

    db.commit()
    return {"mensaje": f"Caja {datos.id_temporal} ubicada en {datos.ubicacion}"}
