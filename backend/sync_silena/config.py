# CONFIGURACIÓN DEL WORKER DE EXPORTACIÓN A SILENA

# Constantes centralizadas. Todo lo ajustable (ritmo, carpeta, formato del
# fichero) vive aquí para no tocar la lógica del bucle ni la del generador.


import os

# Carpeta donde el worker deposita los ficheros.
#   - En producción: bind-mount al NAS (Synology montado por SMB) -> /nas
#   - En desarrollo: carpeta local ./nas_test montada como /nas
# Se puede sobreescribir por variable de entorno sin tocar código.


CARPETA_SALIDA = os.getenv("SILENA_OUTPUT_DIR", "/nas")


# Ritmo de drenado.
#   LOTE        -> cajas procesadas por vuelta. Es el "throttle": aunque haya
#                  miles de cajas PENDIENTE, nunca se tocan más de LOTE a la vez.
#   PAUSA       -> segundos entre vueltas cuando SÍ hay trabajo.
#   PAUSA_VACIA -> segundos entre vueltas cuando no hay nada pendiente
#                  (evita machacar la BD cada segundo sin motivo).
#   MAX_INTENTOS-> tras este nº de fallos, la caja pasa a ERROR y deja de
#                  reintentarse, para que un fallo permanente no bloquee la cola.


LOTE = 20
PAUSA = 5
PAUSA_VACIA = 30
MAX_INTENTOS = 5


# Formato del fichero (según especificación de SILENA).
#
#   SEPARADOR -> separador de columnas. La spec usa ';'.
#   FIN_LINEA -> fin de línea. SILENA corre sobre Windows, por lo que lo más
#                probable es CRLF ('\r\n'). PENDIENTE de confirmar contra un
#                fichero de ejemplo del proceso manual.
#   ENCODING  -> codificación del fichero. Por defecto UTF-8 SIN BOM.
#                PENDIENTE de confirmar (SILENA podría querer latin-1).
#

# NOTA: estos tres son los que hay que clavar contra el fichero de ejemplo del
# proceso manual para garantizar paridad byte a byte. Están aquí, aislados,


SEPARADOR = ";"
FIN_LINEA = "\r\n"
ENCODING = "utf-8"


# Estados de sincronización (deben coincidir con el CHECK de la migración
# y con los default del modelo).

ESTADO_PENDIENTE = "PENDIENTE"
ESTADO_EXPORTADO = "EXPORTADO"
ESTADO_ERROR = "ERROR"
