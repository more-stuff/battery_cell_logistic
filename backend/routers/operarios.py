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


@router.post("/finalizar")
def finalizar_reempaque(datos: schemas.ReempaqueInput, db: Session = Depends(get_db)):

    # 1. CALCULAR LA PEOR CADUCIDAD (MIN)
    # Sacamos todas las fechas de las celdas que nos envía el frontend
    lista_fechas = [c.fecha_caducidad for c in datos.celdas]

    # Si hay fechas, cogemos la mínima. Si no, None.
    peor_caducidad = min(lista_fechas) if lista_fechas else None

    # 2. GENERAR ID TEMPORAL (Tu lógica de TMP-...)
    # (Aquí va tu código de generar ID, lo resumo)
    timestamp_code = int(datetime.now().timestamp())
    nuevo_id = f"TMP-{hex(timestamp_code)[2:].upper()}"

    # 3. CREAR LA CAJA (Con los nuevos nombres de campos)
    nueva_caja = models.CajaReempaque(
        id_temporal=nuevo_id,
        usuario_id=datos.usuario_id,
        # Guardamos las fechas de reempaque
        fecha_inicio_reempaque=datos.fecha_inicio,
        fecha_fin_reempaque=datos.fecha_fin,
        # Guardamos la caducidad calculada
        fecha_caducidad_caja=peor_caducidad,
        # El resto (Outbound, Almacén) se queda en NULL automáticamente
    )

    db.add(nueva_caja)
    db.commit()
    db.refresh(nueva_caja)

    # 4. GUARDAR CELDAS Y VINCULAR PALETS
    for celda_in in datos.celdas:
        # A. Asegurar Palet Origen
        hu_prov = celda_in.hu_origen
        if not db.query(models.PaletEntrada).filter_by(hu_proveedor=hu_prov).first():
            db.add(models.PaletEntrada(hu_proveedor=hu_prov))  # Crear placeholder
            db.commit()

        # B. Crear Celda
        nueva_celda = models.Celda(
            hu_origen_id=hu_prov,
            dmc_code=celda_in.dmc_code,
            fecha_caducidad=celda_in.fecha_caducidad,
        )
        db.add(nueva_celda)

    db.commit()

    return {"mensaje": "Caja guardada", "id_temporal": nueva_caja.id_temporal}
