from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Caja(Base):
    __tablename__ = "cajas"

    # ID interno de base de datos (Primary Key)
    id = Column(Integer, primary_key=True, index=True)

    # ==============================================================================
    # 0. DATOS OPERATIVOS INTERNOS (NO SALEN EN LA FOTO, PERO SON VITALES)
    # ==============================================================================
    # Este es el código de la etiqueta que imprimes al cerrar la caja (ej: "TMP-001")
    # Sirve para que el mozo escanee y ubique la caja antes de tener el HU final.
    id_temporal = Column(String(50), unique=True, index=True, nullable=True)

    # ==============================================================================
    # 1. TRACEABILITY EN ÁREA DE RECIBO (ZONA VERDE)
    # ==============================================================================
    fecha_recibo_almacen = Column(
        DateTime, nullable=True
    )  # "Delivery date in warehouse"
    awb_swb = Column(String(50), nullable=True)  # "AWB / SWB"
    np_packing_list = Column(String(50), nullable=True)  # "NP en Packing List"
    generation_status = Column(String(50), nullable=True)  # "Generation Status s/a"
    hu_palet_proveedor = Column(
        String(100), index=True, nullable=True
    )  # "HU en palet de proveedor"
    fecha_caducidad_proveedor = Column(Date, nullable=True)

    # ==============================================================================
    # 2. TRACEABILITY EN ÁREA DE REEMPAQUE (ZONA ROSA)
    # ==============================================================================
    usuario_reempaque_id = Column(Integer, index=True)

    fecha_inicio_reempaque = Column(DateTime)
    fecha_reempaque = Column(DateTime)

    registro_silena = Column(String(50), default="OK")  # "Register in Silena"

    # Calculado automáticamente por el backend (la menor de las 180 celdas)
    fecha_caducidad_mas_antigua = Column(Date, nullable=True)

    fecha_almacenamiento = Column(DateTime, nullable=True)  # "Storage date"

    # HU FINAL DE SALIDA (Outbound)
    hu_silena_outbound = Column(String(100), unique=True, index=True)

    # ==============================================================================
    # 3. TRACEABILITY EN ÁREA IN-HOUSE (ZONA NARANJA)
    # ==============================================================================
    # Aquí es donde el mozo usa el ID TEMPORAL para actualizar este campo
    ubicacion_estanteria = Column(
        String(50), nullable=True
    )  # "Location... in the shelf"

    # ==============================================================================
    # 4. TRACEABILITY EN ÁREA EMBARQUES (ZONA AZUL)
    # ==============================================================================
    numero_salida_delivery = Column(String(50), nullable=True)  # "Nº de salida"
    hu_final_embarque = Column(String(100), nullable=True)  # "Handling Unit"
    fecha_envio = Column(DateTime, nullable=True)  # "Delivery date"

    # Estado de flujo
    estado = Column(String(20), default="EN_PROCESO")

    # Relación con las celdas (DMC)
    celdas = relationship("Celda", back_populates="caja", cascade="all, delete-orphan")


class Celda(Base):
    __tablename__ = "celdas"

    id = Column(Integer, primary_key=True, index=True)
    caja_id = Column(Integer, ForeignKey("cajas.id"))

    # Datos de la foto (DMC y Caducidad)
    dmc_code = Column(String(200))  # Columna "DMC"
    fecha_caducidad = Column(Date)  # Columna "Fecha de caducidad de la celda"

    # Dato extra para trazabilidad
    hu_origen_celda = Column(String(100))

    caja = relationship("Caja", back_populates="celdas")
