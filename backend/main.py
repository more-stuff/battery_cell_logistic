from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models
from box_rules import MODELO1, MODELO2

# Importamos los routers que acabamos de crear
from routers import operarios, almacen, admin, config, consulta, defective

# Inicializar Base de Datos
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sistema Industrial Modular")


def initialize_config():
    from database import SessionLocal

    configuraciones_por_defecto = {
        "alerta_cada": "15",
        "limite_caja": "180",
        "limite_defectuosa": "180",
        "limite_caducidad_proxima": "180",
        "len_dmc": "87",
        "caducidad_proxima_dias": "30",
    }

    db = SessionLocal()

    try:
        for modelo in (MODELO1, MODELO2):
            for clave, valor in configuraciones_por_defecto.items():

                existe = (
                    db.query(models.Configuracion)
                    .filter(
                        models.Configuracion.modelo == modelo,
                        models.Configuracion.clave == clave,
                    )
                    .first()
                )

                if not existe:
                    print(
                        f"⚙️ Creando configuración por defecto: "
                        f"{modelo} / {clave} = {valor}"
                    )

                    db.add(
                        models.Configuracion(
                            modelo=modelo,
                            clave=clave,
                            valor=valor,
                        )
                    )

        db.commit()

    except Exception as e:
        db.rollback()
        print(f"Error inicializando config: {e}")

    finally:
        db.close()


initialize_config()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AQUÍ UNIMOS TODO:
app.include_router(operarios.router)
app.include_router(almacen.router)
app.include_router(admin.router)
app.include_router(config.router)
app.include_router(consulta.router)
app.include_router(defective.router)


@app.get("/")
def root():
    return {"mensaje": "Servidor Traceability Funcionando 🚀"}
