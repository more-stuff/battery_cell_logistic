from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import pandas as pd

import io

from database import get_db
from box_rules import (
    MOTIVO_DEFECTUOSO,
    MOTIVOS_VALIDOS,
    bump_blacklist_version,
    get_blacklist_version,
)
import models, schemas, auth

router = APIRouter(prefix="/admin", tags=["Defective"])


# El protocolo de PostgreSQL numera los parámetros con 16 bits, así que una
# sentencia admite como mucho 65535. Un .in_() gasta uno por código, de modo
# que un fichero grande se lo come de una sentada. Se trocea en lotes muy por
# debajo del techo: además de no reventar, el planificador conserva un plan
# limpio (con listas enormes se degrada).
#
# No afecta a bulk_save_objects: SQLAlchemy ya lo trocea por dentro.
LOTE_IN = 5000


def _por_lotes(items, tamano=LOTE_IN):
    items = list(items)
    for i in range(0, len(items), tamano):
        yield items[i : i + tamano]


@router.post("/importar-defectuosos")
async def importar_defectuosos(
    file: UploadFile = File(...),
    motivo: str = Form(MOTIVO_DEFECTUOSO),
    reclasificar: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(
        auth.require_roles(auth.ROL_SUPERADMIN)
    ),
):
    """
    motivo: a qué lista se sube el fichero (DEFECTUOSO o COBRE).

    reclasificar: qué hacer con los DMC que ya están en la lista con OTRO
    motivo. Los motivos son excluyentes, así que cambiar uno es una decisión
    real y no un efecto colateral de subir un fichero. Por defecto NO se tocan
    y se devuelven como conflictos; con reclasificar=True se cambian.
    """
    motivo = str(motivo).strip().upper()

    if motivo not in MOTIVOS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Motivo no válido: {motivo}. "
                f"Debe ser uno de {sorted(MOTIVOS_VALIDOS)}."
            ),
        )

    print(f"🔄 PASO 1: Recibiendo archivo {file.filename} como {motivo}...")

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
                texto = contents.decode("utf-8-sig", errors="replace")
                primera_linea = texto.splitlines()[0].strip().strip('"')

                file_obj.seek(0)

                if primera_linea.upper() == "DMC":
                    # CSV con una única columna:
                    # no se interpreta coma ni ; como separador.
                    # Cada línea es el DMC completo.
                    df = pd.read_csv(
                        file_obj,
                        sep="\t",
                        dtype=str,
                        keep_default_na=False,
                        encoding="utf-8-sig",
                    )
                else:
                    # CSV con varias columnas: Excel puede usar , o ;
                    df = pd.read_csv(
                        file_obj,
                        sep=None,
                        engine="python",
                        dtype=str,
                        keep_default_na=False,
                        encoding="utf-8-sig",
                    )

            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"No se ha podido leer el CSV: {str(e)}",
                )

        # 3. Validación de columnas
        df.columns = [str(c).strip() for c in df.columns]

        if "DMC" not in df.columns:
            return {
                "error": "El archivo no tiene la columna 'DMC'.",
                "columnas": df.columns.tolist(),
            }

        # 4. Limpieza de datos
        print("💾 PASO 6: Limpiando datos...")

        df["DMC"] = df["DMC"].astype(str).str.strip()
        filtro_basura = ~df["DMC"].str.lower().isin(["nan", "none", "", "null"])
        df = df[filtro_basura]

        codigos_nuevos = set(df["DMC"].unique())

        # 5. Estado actual SOLO de los códigos que vienen en el fichero.
        #
        # Antes se traían TODAS las filas de la tabla a memoria de Python. Con
        # medio millón de registros eso es una barbaridad de RAM y de tiempo en
        # cada importación. Filtrando por los entrantes se usa el índice de la
        # PK y se trae únicamente lo relevante.
        motivo_actual = {}

        for lote in _por_lotes(codigos_nuevos):
            filas = (
                db.query(
                    models.DMCDefectuoso.dmc_code,
                    models.DMCDefectuoso.motivo,
                )
                .filter(models.DMCDefectuoso.dmc_code.in_(lote))
                .all()
            )
            motivo_actual.update({fila[0]: fila[1] for fila in filas})

        a_insertar = [c for c in codigos_nuevos if c not in motivo_actual]

        ya_con_este_motivo = [c for c, m in motivo_actual.items() if m == motivo]

        conflictos = [c for c, m in motivo_actual.items() if m != motivo]

        # 6. ALTA de los que no estaban.
        objetos = [
            models.DMCDefectuoso(dmc_code=cod, motivo=motivo) for cod in a_insertar
        ]

        if objetos:
            db.bulk_save_objects(objetos)

        # 7. RECLASIFICACIÓN, solo si se ha pedido explícitamente.
        reclasificados = 0

        if reclasificar and conflictos:
            for lote in _por_lotes(conflictos):
                reclasificados += (
                    db.query(models.DMCDefectuoso)
                    .filter(models.DMCDefectuoso.dmc_code.in_(lote))
                    .update(
                        {models.DMCDefectuoso.motivo: motivo},
                        synchronize_session=False,
                    )
                )

        # 8. La versión solo se toca si de verdad ha cambiado algo. Subirla sin
        #    cambios obligaría a todas las PDA a redescargar la lista para nada.
        #    Va dentro de la transacción: si esto acaba en rollback, la versión
        #    tampoco sube.
        if objetos or reclasificados:
            bump_blacklist_version(db, models)

        db.commit()

        print("✅ FIN: Operación completada.")

        return {
            "mensaje": "Importación completada con éxito.",
            "motivo": motivo,
            "total_archivo": len(codigos_nuevos),
            "nuevos_insertados": len(objetos),
            "ya_existian": len(ya_con_este_motivo),
            "conflictos_otro_motivo": len(conflictos),
            "reclasificados": reclasificados,
            # Muestra acotada: con miles de conflictos no se manda la lista
            # entera al navegador, solo lo justo para que el admin vea qué son.
            "muestra_conflictos": conflictos[:20],
            "blacklist_version": get_blacklist_version(db, models),
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"💥 ERROR: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dmc-defectuosos/version")
def version_lista_bloqueo(db: Session = Depends(get_db)):
    """
    Barato a propósito: es lo que consulta cada PDA al arrancar para decidir si
    su copia local sigue valiendo. Una sola fila, sin tocar dmc_defectuosos.
    """
    return {"version": get_blacklist_version(db, models)}


@router.get("/dmc-defectuosos")
def listar_bloqueados(db: Session = Depends(get_db)):
    """
    Listas separadas por motivo, más la versión con la que se generaron.

    La versión viaja DENTRO de la respuesta a propósito: si el terminal la
    pidiera aparte, podría acabar guardando una lista con una versión que ya no
    le corresponde si alguien importa justo entre las dos llamadas.

    Dos arrays en vez de un mapa {dmc: motivo}: el mapa repetiría la cadena del
    motivo una vez por código, y con medio millón de códigos eso son megabytes
    de más en cada arranque de PDA.
    """
    filas = db.query(
        models.DMCDefectuoso.dmc_code,
        models.DMCDefectuoso.motivo,
    ).all()

    defectuosos = []
    cobre = []

    for dmc, motivo in filas:
        if motivo == MOTIVO_DEFECTUOSO:
            defectuosos.append(dmc)
        else:
            cobre.append(dmc)

    return {
        "version": get_blacklist_version(db, models),
        "defectuosos": defectuosos,
        "cobre": cobre,
    }
