# database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. URL DE CONEXIÓN
# Si usaste Docker con mi comando anterior, la DB se llama "app_industrial_db"
# Si la instalaste a mano y no creaste DB, cambia "app_industrial_db" por "postgres"
SQLALCHEMY_DATABASE_URL = (
    "postgresql://postgres:mi_contraseña_segura@localhost/app_industrial_db"
)

# 2. CREAR EL MOTOR (Con Pooling activado para concurrencia)
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_size=20, max_overflow=10)

# 3. SESIÓN
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependencia para obtener la DB en cada petición
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
