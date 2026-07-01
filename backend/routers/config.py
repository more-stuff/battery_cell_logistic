from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from box_rules import normalizar_modelo
import models, schemas, auth

router = APIRouter(prefix="/admin", tags=["Config"])


def obtener_modelo_valido(modelo: str) -> str:
    try:
        return normalizar_modelo(modelo)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.get("/config", response_model=schemas.ConfigResponse)
def obtener_configuracion(
    modelo: str = "MODELO1",
    db: Session = Depends(get_db),
):
    modelo = obtener_modelo_valido(modelo)

    configuraciones = (
        db.query(models.Configuracion)
        .filter(models.Configuracion.modelo == modelo)
        .all()
    )

    valores = {
        configuracion.clave: configuracion.valor for configuracion in configuraciones
    }

    def get_valor_entero(clave: str, defecto: int) -> int:
        try:
            valor = int(valores.get(clave, defecto))
            if valor > -2 and clave == "alerta_cada" or valor > 0:
                return valor
            else:
                defecto
        except (TypeError, ValueError):
            return defecto

    return {
        "alerta_cada": get_valor_entero("alerta_cada", 15),
        "limite_caja": get_valor_entero("limite_caja", 180),
        "limite_defectuosa": get_valor_entero("limite_defectuosa", 180),
        "limite_caducidad_proxima": get_valor_entero(
            "limite_caducidad_proxima",
            180,
        ),
        "tamano_nivel": get_valor_entero("tamano_nivel", 45),
        "len_dmc": get_valor_entero("len_dmc", 87),
        "caducidad_proxima_dias": get_valor_entero(
            "caducidad_proxima_dias",
            30,
        ),
    }


# --- ENDPOINT 2: MODIFICAR CONFIGURACIÓN (Para Admin) ---
@router.put("/config")
def actualizar_configuracion(
    datos: schemas.ConfigInput,
    modelo: str = "MODELO1",
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(
        auth.require_roles(auth.ROL_SUPERADMIN)
    ),
):
    # Buscamos la clave (ej: "alerta_cada")
    modelo = obtener_modelo_valido(modelo)

    if datos.clave == "tamano_nivel":
        try:
            if int(datos.valor) <= 0:
                raise ValueError
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=400,
                detail="El tamaño de nivel debe ser un número entero mayor que 0.",
            )

    config = (
        db.query(models.Configuracion)
        .filter(
            models.Configuracion.modelo == modelo,
            models.Configuracion.clave == datos.clave,
        )
        .first()
    )

    if not config:
        # Si no existe, la creamos
        config = models.Configuracion(
            modelo=modelo,
            clave=datos.clave,
            valor=datos.valor,
        )
        db.add(config)
        mensaje = "✅ Configuración creada"
    else:
        # Si existe, actualizamos
        config.valor = datos.valor
        mensaje = "🔄 Configuración actualizada"

    db.commit()
    return {
        "mensaje": mensaje,
        "modelo": modelo,
        "clave": datos.clave,
        "nuevo_valor": datos.valor,
    }
