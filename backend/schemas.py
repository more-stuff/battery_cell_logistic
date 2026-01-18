from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime


# --- PARTE 1: LO QUE ENVÍA EL OPERARIO (REEMPAQUE) ---
# Datos de una sola celda (DMC)
class CeldaInput(BaseModel):
    dmc_code: str  # El código escaneado
    fecha_caducidad: date  # Extraída o seleccionada
    hu_origen: str  # El HU de la caja de donde salió (Sticky input)


# El paquete completo de 180 celdas
class ReempaqueInput(BaseModel):
    usuario_id: int
    celdas: List[CeldaInput]  # Lista de 180 celdas
    fecha_inicio: datetime
    fecha_fin: datetime


# Lo que devuelve el servidor al operario (para imprimir la etiqueta)
class RespuestaReempaque(BaseModel):
    mensaje: str
    id_temporal: str  # "TMP-XXXX" para la etiqueta


# --- PARTE 2: LO QUE ENVÍA EL MOZO (ALMACÉN) ---
class UbicacionInput(BaseModel):
    id_temporal: str  # Escanea la etiqueta TMP
    ubicacion: str  # Escanea la estantería


# --- PARTE 3: LO QUE ENVÍA EL ADMIN (OFICINA) ---
# Para rellenar la Zona Verde (Incoming)
class IncomingUpdate(BaseModel):
    caja_ids: List[int]  # A qué cajas aplicar esto
    awb_swb: Optional[str] = None
    np_packing_list: Optional[str] = None
    hu_palet_proveedor: Optional[str] = None
    fecha_recibo: Optional[datetime] = None


# Para rellenar la Zona Azul (Outbound)
class OutboundUpdate(BaseModel):
    caja_ids: List[int]
    numero_salida_delivery: str
    fecha_envio: datetime
