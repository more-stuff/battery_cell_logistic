from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models

# Importamos los routers que acabamos de crear
from routers import operarios, almacen, admin

# Inicializar Base de Datos
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sistema Industrial Modular")

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
