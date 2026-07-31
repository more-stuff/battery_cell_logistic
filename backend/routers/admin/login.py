"""Acceso al panel de administración: autenticación y alta de usuarios."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
import models, schemas, auth

router = APIRouter()


@router.post("/login", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    # Buscamos usuario
    user = (
        db.query(models.UsuarioAdmin)
        .filter(models.UsuarioAdmin.username == form_data.username)
        .first()
    )

    # Verificamos contraseña
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Creamos token
    access_token = auth.create_access_token(
        data={"sub": user.username, "rol": user.rol}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "rol": user.rol,
    }


# --- ENDPOINT "SECRETO" PARA CREAR USUARIOS (Usar con Postman) ---
@router.post("/register", status_code=201)
def registrar_admin(
    usuario: schemas.AdminCreate,
    db: Session = Depends(get_db),
    current_user: models.UsuarioAdmin = Depends(
        auth.require_roles(auth.ROL_SUPERADMIN)
    ),
):
    # Ver si ya existe
    existe = (
        db.query(models.UsuarioAdmin)
        .filter(models.UsuarioAdmin.username == usuario.username)
        .first()
    )
    if existe:
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    # Hashear password
    print(f"👀 USUARIO RECIBIDO: {usuario.username}")
    print(f"👀 LONGITUD PASSWORD: {len(usuario.password)}")

    hashed_pw = auth.get_password_hash(usuario.password)

    nuevo_admin = models.UsuarioAdmin(
        username=usuario.username,
        hashed_password=hashed_pw,
        rol=usuario.rol,
    )
    db.add(nuevo_admin)
    db.commit()
    return {"mensaje": f"Usuario {usuario.username} creado con rol {usuario.rol}"}
