from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


# ==============================================================================
# TABLA 1: ENTRADA (INCOMING) - El Palet del Proveedor
# ==============================================================================
class PaletEntrada(Base):
    __tablename__ = "palets_entrada"

    # HU del proveedor (ej: "SUP-101021") es la clave para buscar
    hu_proveedor = Column(String(100), primary_key=True, index=True)

    # Datos Administrativos
    fecha_recibo = Column(DateTime, nullable=True)
    awb_swb = Column(String(50), nullable=True)
    np_packing_list = Column(String(50), nullable=True)
    generation_status = Column(String(50), default="PENDING")
    fecha_caducidad_proveedor = Column(Date, nullable=True)

    # Relación: Un palet tiene muchas celdas hijas
    celdas_hijas = relationship("Celda", back_populates="palet_origen")


# ==============================================================================
# TABLA 2: REEMPAQUE Y SALIDA (OUTBOUND) - La Caja de 180
# ==============================================================================
class CajaReempaque(Base):
    __tablename__ = "cajas_reempaque"

    id = Column(Integer, primary_key=True, index=True)

    # --- FASE 1: REEMPAQUE (Operario) ---
    id_temporal = Column(String(50), unique=True, index=True)  # TMP-XXXX
    usuario_id = Column(String(100))

    # Fechas específicas de la labor de reempaque
    fecha_inicio_reempaque = Column(DateTime)
    fecha_fin_reempaque = Column(DateTime)

    # CALCULADO: La fecha de caducidad "más pronta" de las celdas interiores
    fecha_caducidad_caja = Column(Date, nullable=True)

    # --- FASE 2: ALMACÉN (Carretillero) ---
    ubicacion_estanteria = Column(String(50), nullable=True)
    fecha_almacenamiento = Column(DateTime, nullable=True)  # Cuándo se guardó

    # --- FASE 3: OUTBOUND / EMBARQUE (Administrativo Salida) ---
    # Todo esto se rellena al final, por eso es nullable=True
    hu_silena_outbound = Column(
        String(100), nullable=True, index=True
    )  # ID Final Cliente
    numero_salida_delivery = Column(String(50), nullable=True)
    hu_final_embarque = Column(String(100), nullable=True)  # Handling Unit Final
    fecha_envio = Column(DateTime, nullable=True)

    # Relación: Una caja contiene muchas celdas
    celdas = relationship(
        "Celda", back_populates="caja_destino", cascade="all, delete-orphan"
    )


# ==============================================================================
# TABLA 3: LA PIEZA (CELDA) - El nexo de unión
# ==============================================================================
class Celda(Base):
    __tablename__ = "celdas"

    id = Column(Integer, primary_key=True, index=True)

    # ¿DÓNDE ESTÁ AHORA? (Caja de Reempaque)
    caja_reempaque_id = Column(Integer, ForeignKey("cajas_reempaque.id"))
    caja_destino = relationship("CajaReempaque", back_populates="celdas")

    # ¿DE DÓNDE VINO? (Palet Proveedor)
    hu_origen_id = Column(
        String(100), ForeignKey("palets_entrada.hu_proveedor"), nullable=True
    )
    palet_origen = relationship("PaletEntrada", back_populates="celdas_hijas")

    # DATOS PROPIOS
    dmc_code = Column(String(200), unique=True, index=True)
    fecha_caducidad = Column(Date)


class Configuracion(Base):
    __tablename__ = "configuraciones"

    # Ejemplo: clave="alerta_cada", valor="15"
    clave = Column(String(50), primary_key=True, index=True)
    valor = Column(String(200))  # Lo guardamos como String para ser flexibles
