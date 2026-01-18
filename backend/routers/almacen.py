from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import models, schemas
from database import get_db

router = APIRouter(prefix="/almacen", tags=["Mozo Almacén"])


@router.post("/ubicar")
def ubicar_caja(datos: schemas.UbicacionInput, db: Session = Depends(get_db)):
    # Buscamos en la tabla NUEVA (CajaReempaque)
    caja = (
        db.query(models.CajaReempaque)
        .filter(models.CajaReempaque.id_temporal == datos.id_temporal)
        .first()
    )

    if not caja:
        raise HTTPException(status_code=404, detail="Etiqueta no encontrada")

    caja.ubicacion_estanteria = datos.ubicacion
    caja.fecha_almacenamiento = datetime.now()  # <--- AHORA GUARDAMOS LA FECHA AQUÍ

    db.commit()
    return {"mensaje": "Ubicada", "ubicacion": datos.ubicacion}
