from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime


# --- PARTE 1: LO QUE ENVÍA EL OPERARIO (REEMPAQUE) ---
# Datos de una sola celda (DMC)
class CeldaInput(BaseModel):
    dmc_code: str  # El código escaneado
    fecha_caducidad: date  # Extraída o seleccionada
    hu_origen: str  # El HU de la caja de donde salió (Sticky input)
    estado_calidad: Optional[str] = "OK"  # si ha tenido revision manual o no


# El paquete completo de 180 celdas
class ReempaqueInput(BaseModel):
    usuario_id: str
    celdas: List[CeldaInput]
    fecha_inicio: datetime
    fecha_fin: datetime
    modelo: Optional[str] = "MODELO1"
    tipo_caja: Optional[str] = None
    blackbox_id: str
    is_defective: Optional[bool] = False  # retrocompatibilidad


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


class IncomingData(BaseModel):
    hu_entrada: str  # El HU del proveedor (Clave Primaria)
    generation_status: Optional[str] = None
    fecha_recibo: Optional[datetime | str] = (
        None  # <--- AHORA ES DATETIME (Fecha + Hora)
    )
    awb_swb: Optional[str] = None
    np_packing_list: Optional[str] = None
    fecha_caducidad: Optional[date | str] = None


# Para rellenar la Zona Azul (Outbound)
class OutboundData(BaseModel):
    # EL ÚNICO OBLIGATORIO (Tu llave de búsqueda)
    id_temporal: str

    # OPCIONALES (Se rellenan según se tenga la info)
    hu_silena: Optional[str] = None  # HU Silena Outbound
    numero_salida: Optional[str] = None  # Nº Salida / Delivery
    handling_unit: Optional[str] = None  # HU Final Embarque
    fecha_envio: Optional[datetime | str] = None


# --- PARTE 4: CONFIGURACIÓN ---

# --- PARTE 5: SUSTITUCIÓN DE CELDAS EN CAJA CERRADA ---


# Info de una celda individual para devolver al frontend
class CeldaDetalle(BaseModel):
    dmc_code: str
    fecha_caducidad: date
    hu_origen: Optional[str] = None
    estado_calidad: str
    posicion_en_caja: Optional[int] = None

    class Config:
        from_attributes = True


# Detalle completo de una caja con sus celdas (para el panel de sustitución)
class CajaConCeldas(BaseModel):
    id_temporal: str
    fecha_caducidad_caja: Optional[date]
    is_defective: bool
    total_celdas: int
    modelo: str
    celdas: List[CeldaDetalle]
    tipo_caja: Optional[str] = None


# Petición de sustitución de una celda
class SustitucionInput(BaseModel):
    id_temporal: str  # La caja donde está la celda a sustituir
    dmc_antiguo: str  # DMC de la celda que sale
    nueva_celda: CeldaInput  # Datos completos de la celda que entra
    usuario_id: Optional[str] = None  # Quién hace la sustitución (auditoría)


# Respuesta tras una sustitución exitosa
class SustitucionResponse(BaseModel):
    mensaje: str
    id_temporal: str
    dmc_antiguo: str
    dmc_nuevo: str
    nueva_fecha_caducidad_caja: Optional[date]  # La caducidad puede cambiar


class ConfigInput(BaseModel):
    clave: str
    valor: str


class ConfigResponse(BaseModel):
    alerta_cada: int
    limite_caja: int
    limite_defectuosa: int
    limite_caducidad_proxima: int
    len_dmc: int
    caducidad_proxima_dias: int
    tamano_nivel: int


class AdminCreate(BaseModel):
    username: str
    password: str
    rol: str = "operario_linea"


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    rol: str


class TokenData(BaseModel):
    username: Optional[str] = None
    rol: Optional[str] = None
