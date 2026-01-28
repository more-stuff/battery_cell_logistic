# auth.py
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import models, database
import os
from dotenv import load_dotenv

# --- CONFIGURACIÓN ---
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "fallo_seguridad_clave_por_defecto")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas

# Contexto de encriptación (Bcrypt)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Esquema de OAuth2 (le dice a FastAPI dónde obtener el token)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/admin/login")


# --- FUNCIONES ÚTILES ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):

    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=120)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# --- DEPENDENCIAS (LO QUE PROTEGE LAS RUTAS) ---


# 1. Obtener el usuario actual del Token
def get_current_admin(
    token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        rol: str = payload.get("rol")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = (
        db.query(models.UsuarioAdmin)
        .filter(models.UsuarioAdmin.username == username)
        .first()
    )
    if user is None:
        raise credentials_exception
    return user


# 2. Verificar si es SUPERADMIN (Para configuración)
def require_super_admin(current_user: models.UsuarioAdmin = Depends(get_current_admin)):
    if current_user.rol != "superadmin":
        raise HTTPException(
            status_code=403,
            detail="⛔ Acceso denegado: Se requieren permisos de Super Administrador",
        )
    return current_user
