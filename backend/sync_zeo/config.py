# CONFIGURACIÓN DE LA INTEGRACIÓN CON ZEO

# Constantes centralizadas. Todo lo ajustable (URL de la API, timeout, qué
# unidades productivas nos interesan) vive aquí para no tocar la lógica de
# sincronización ni la del endpoint.

import os

# Dirección de la API de integraciones de ZEO.
#   - PRE:  192.168.96.154:8205/integration
#   - PRO:  192.168.96.153:8205/integration
# Se fija por variable de entorno para cambiar de entorno sin tocar código.
ZEO_API_URL = os.getenv("ZEO_API_URL", "http://192.168.96.154:8205/integration")

# Segundos máximos de espera a que ZEO responda antes de caer a la caché local.
# Corto a propósito: si ZEO tarda, el operario no puede quedarse esperando en
# la pantalla de login.
ZEO_TIMEOUT = int(os.getenv("ZEO_TIMEOUT", "5"))

# Endpoints concretos (se cuelgan de ZEO_API_URL).
ENDPOINT_PRODUCTION_UNITS = "/get-production-units"
ENDPOINT_INCREASE_COUNTER = "/increase-counter-values"

PREFIJOS_PUESTOS = ("PWC-MESA", "PWC-VOLTAJE", "PWC-SORTE")
