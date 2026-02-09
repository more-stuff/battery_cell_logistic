from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import models, schemas, auth


router = APIRouter(prefix="/admin", tags=["Config"])


# --- ENDPOINT 1: OBTENER CONFIGURACIÓN (Para Frontend) ---
@router.get("/config", response_model=schemas.ConfigResponse)
def obtener_configuracion(
    db: Session = Depends(get_db),
):
    # Buscamos los valores en la DB
    conf_alerta = db.query(models.Configuracion).filter_by(clave="alerta_cada").first()
    conf_limite = db.query(models.Configuracion).filter_by(clave="limite_caja").first()
    limite_defectuosa = (
        db.query(models.Configuracion).filter_by(clave="limite_defectuosa").first()
    )
    len_dmc = db.query(models.Configuracion).filter_by(clave="len_dmc").first()

    # Si no existen, devolvemos valores por defecto (Safety check)
    return {
        "alerta_cada": int(conf_alerta.valor) if conf_alerta else 15,
        "limite_caja": int(conf_limite.valor) if conf_limite else 180,
        "limite_defectuosa": int(limite_defectuosa.valor) if limite_defectuosa else 180,
        "len_dmc": int(len_dmc.valor) if len_dmc else 87,
    }


# --- ENDPOINT 2: MODIFICAR CONFIGURACIÓN (Para Admin) ---
@router.put("/config")
def actualizar_configuracion(
    datos: schemas.ConfigInput,
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(auth.require_super_admin),
):
    # Buscamos la clave (ej: "alerta_cada")
    config = db.query(models.Configuracion).filter_by(clave=datos.clave).first()

    if not config:
        # Si no existe, la creamos
        config = models.Configuracion(clave=datos.clave, valor=datos.valor)
        db.add(config)
        mensaje = "✅ Configuración creada"
    else:
        # Si existe, actualizamos
        config.valor = datos.valor
        mensaje = "🔄 Configuración actualizada"

    db.commit()
    return {"mensaje": mensaje, "clave": datos.clave, "nuevo_valor": datos.valor}
