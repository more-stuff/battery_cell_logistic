from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import pandas as pd

import io

from database import get_db
import models, schemas, auth

# Fíjate que NO importamos schemas aquí para el modelo de entrada,
# lo definimos localmente para evitar el error que tienes.

router = APIRouter(prefix="/admin", tags=["Defective"])


@router.post("/importar-defectuosos")
async def importar_defectuosos(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    print(f"🔄 PASO 1: Recibiendo archivo {file.filename}...")

    try:
        # 1. Leer bytes crudos
        contents = await file.read()
        print(f"✅ PASO 2: Leídos {len(contents)} bytes.")

        file_obj = io.BytesIO(contents)
        df = None

        # 2. DETECTOR DE FORMATO
        es_excel = contents.startswith(b"PK")

        if es_excel:
            print("📊 PASO 3: Es EXCEL (.xlsx).")
            try:
                # dtype=str obliga a que TODO sea texto, evitando que "001" se convierta en "1"
                df = pd.read_excel(file_obj, engine="openpyxl", dtype=str)
            except Exception as e:
                return {"error": f"Fallo excel: {str(e)}"}
        else:
            print("📝 PASO 3: Es CSV.")
            try:
                # Detectar separador manualmente
                primera_linea = (
                    contents[:1024].decode("utf-8", errors="ignore").split("\n")[0]
                )
                num_pyc = primera_linea.count(";")
                num_comas = primera_linea.count(",")
                separador = ";" if num_pyc > num_comas else ","
                print(f"🔧 PASO 4: Separador -> '{separador}'")

                file_obj.seek(0)
                # 👇 AQUÍ ESTÁ EL ARREGLO DEL DtypeWarning: dtype=str
                df = pd.read_csv(file_obj, sep=separador, dtype=str)

            except Exception as e:
                return {"error": f"Fallo CSV: {str(e)}"}

        # 3. Validación de Columnas
        # Limpiamos nombres de columnas
        df.columns = [str(c).strip() for c in df.columns]

        if "DMC" not in df.columns:
            return {
                "error": "El archivo no tiene la columna 'DMC'.",
                "columnas": df.columns.tolist(),
            }

        # 4. LIMPIEZA EXTREMA DE DATOS (Para evitar el error de PostgreSQL)
        print("💾 PASO 6: Limpiando datos...")

        df["DMC"] = df["DMC"].astype(str).str.strip()
        filtro_basura = ~df["DMC"].str.lower().isin(["nan", "none", "", "null"])
        df = df[filtro_basura]

        codigos_nuevos = set(df["DMC"].unique())
        existentes_query = db.query(models.DMCDefectuoso.dmc_code).all()
        existentes = set(x[0] for x in existentes_query)
        a_insertar_lista = list(codigos_nuevos - existentes)

        objetos = [models.DMCDefectuoso(dmc_code=cod) for cod in a_insertar_lista]

        if objetos:
            db.bulk_save_objects(objetos)
            db.commit()

        print("✅ FIN: Operación completada en milisegundos.")

        db.commit()
        print(f"🎉 FIN:  registros guardados.")

        return {
            "mensaje": "Importación completada con éxito.",
            "total_archivo": len(codigos_nuevos),
            "nuevos_insertados": len(objetos),
            "ya_existian": len(codigos_nuevos) - len(objetos),
        }

    except Exception as e:
        print(f"💥 ERROR: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dmc-defectuosos")
def listar_defectuosos(db: Session = Depends(get_db)):
    # Retornamos solo los strings en un array simple para el Frontend
    return [c.dmc_code for c in db.query(models.DMCDefectuoso).all()]
