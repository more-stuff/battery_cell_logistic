from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models

# Importamos los routers que acabamos de crear
from routers import operarios, almacen, admin

# Inicializar Base de Datos
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sistema Industrial Modular")


# --- FUNCIÓN DE INICIALIZACIÓN (SEMILLA) ---
def initialize_config():
    from database import SessionLocal

    db = SessionLocal()
    try:
        # 1. Chequear ALERTA
        if not db.query(models.Configuracion).filter_by(clave="alerta_cada").first():
            print("⚙️ Creando configuración por defecto: alerta_cada = 15")
            db.add(models.Configuracion(clave="alerta_cada", valor="15"))

        # 2. Chequear LÍMITE
        if not db.query(models.Configuracion).filter_by(clave="limite_caja").first():
            print("⚙️ Creando configuración por defecto: limite_caja = 180")
            db.add(models.Configuracion(clave="limite_caja", valor="180"))

        # checquear limite de las defectuosas
        if (
            not db.query(models.Configuracion)
            .filter_by(clave="limite_defectuosa")
            .first()
        ):
            print("⚙️ Creando configuración por defecto: limite_defectuosa = 180")
            db.add(models.Configuracion(clave="limite_defectuosa", valor="180"))

        if not db.query(models.Configuracion).filter_by(clave="len_dmc").first():
            print("⚙️ Creando configuración por defecto: len_dmc = 86")
            db.add(models.Configuracion(clave="len_dmc", valor="87"))

        db.commit()
    except Exception as e:
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


@app.get("/")
def root():
    return {"mensaje": "Servidor Traceability Funcionando 🚀"}
