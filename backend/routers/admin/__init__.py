"""
Panel de administración. Un solo router de cara a fuera, tres ficheros dentro:

- login.py      -> acceso: autenticación y alta de usuarios.
- datos.py      -> relleno de datos administrativos de entrada y salida.
- modificar.py  -> corrección de cajas ya cerradas.
- guards.py     -> reglas de edición que comparten los de arriba.

El prefijo vive aquí y solo aquí: los sub-routers declaran rutas relativas, así
que ninguna URL cambia al mover un endpoint de fichero.
"""

from fastapi import APIRouter

from . import login, datos, modificar

router = APIRouter(prefix="/admin", tags=["Admin"])

router.include_router(login.router)
router.include_router(datos.router)
router.include_router(modificar.router)
