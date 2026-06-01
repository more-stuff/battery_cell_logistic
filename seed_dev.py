# seed_dev.py — ejecutar UNA vez en dev
# python seed_dev.py

from database import SessionLocal
import models
from datetime import date, datetime
import random
import string

db = SessionLocal()

print("Creando palet y cajas...")

# 1 palet de entrada
palet = models.PaletEntrada(
    hu_proveedor="SUP-DEV-TEST",
    fecha_recibo=datetime.now(),
    generation_status="PENDING",
    fecha_caducidad_proveedor=date(2026, 12, 31),
)
db.merge(palet)  # merge por si ya existe
db.commit()

# 300 cajas x 180 celdas = 54.000 filas
CAJAS = 3000
CELDAS_POR_CAJA = 180

cajas = []
for i in range(CAJAS):
    cajas.append(
        models.CajaReempaque(
            id_temporal=f"t3-{i:05d}",
            usuario_id="PUESTO_DEV",
            fecha_inicio_reempaque=datetime.now(),
            fecha_fin_reempaque=datetime.now(),
            fecha_caducidad_caja=date(2026, 12, 31),
            is_defective=False,
        )
    )

db.bulk_save_objects(cajas)
db.commit()
print(f"{CAJAS} cajas creadas")

# Recuperamos los ids
ids_cajas = [
    row.id
    for row in db.query(models.CajaReempaque.id)
    .filter(models.CajaReempaque.usuario_id == "PUESTO_DEV")
    .all()
]

# Generamos celdas en batches de 5000
celdas = []
total = 0
for caja_id in ids_cajas:
    for j in range(CELDAS_POR_CAJA):
        sufijo = "".join(random.choices(string.ascii_uppercase + string.digits, k=20))
        celdas.append(
            models.Celda(
                caja_reempaque_id=caja_id,
                hu_origen_id="SUP-DEV-TEST",
                dmc_code=f"DEV{caja_id:05d}{j:03d}{sufijo}261231",
                fecha_caducidad=date(2026, 12, 31),
                estado_calidad="OK",
            )
        )

    if len(celdas) >= 5000:
        db.bulk_save_objects(celdas)
        db.commit()
        total += len(celdas)
        print(f"  {total} celdas insertadas...")
        celdas = []

if celdas:
    db.bulk_save_objects(celdas)
    db.commit()
    total += len(celdas)

print(f"✅ Seed completo — {total} celdas en BD")
db.close()
