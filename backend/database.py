# database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:admin@localhost/trazabilidad"
)

db_connection_args = {"options": "-c statement_timeout=30000"}  # 30000 ms = 30 segundos

# 2. CREAR EL MOTOR (Con Pooling activado para concurrencia)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args=db_connection_args,
)

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
