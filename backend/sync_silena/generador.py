# GENERADOR DEL FICHERO DE INTERCAMBIO CON SILENA


# el contenido del fichero y depositarlo en la carpeta de salida de forma
# atómica (.tmp + rename), para que SILENA nunca lea un fichero a medias.

# Modulo encargado de escribir una caja unicamente

import os

from sync_silena.config import (
    CARPETA_SALIDA,
    SEPARADOR,
    FIN_LINEA,
    ENCODING,
)

# Tipos de caja que ya tienen formato de fichero confirmado.
TIPO_NORMAL = "NORMAL"
TIPO_DEFECTUOSA = "DEFECTUOSA"
TIPO_CADUCIDAD_PROXIMA = "CADUCIDAD_PROXIMA"
TIPO_COBRE = "COBRE"


BLOCKING_REASON = {
    TIPO_DEFECTUOSA: "DEFECTIVE",
    TIPO_CADUCIDAD_PROXIMA: "EXPIRING_SOON",
    TIPO_COBRE: "COPPER",
}


CABECERA_BASE = [
    "ID input palette",
    "ID black box",
    "ID baterry in black box",
    "Battery code",
    "USER",
]
COLUMNA_BLOCKING = "Blocking reason"


# FICHERO NORMAL (caja de 180 celdas OK)

# Columnas confirmadas con SILENA (una línea por celda, 180 líneas):
#   1) SILENA HU              -> celda.hu_origen_id
#   2) ID black box           -> caja.blackbox_id (QR crudo del contenedor)
#   3) Position in black box  -> celda.posicion_en_caja + 1  (1..180)
#   4) Battery code (DMC)     -> celda.dmc_code (crudo, tal cual escaneado)
#   5) USER                   -> caja.usuario_id (quién hizo el reempaque)


# ESCRITURA ATÓMICA (.tmp + rename)
# se escribe .tmp para evitar lectura a medias


def _campos_base(caja, celda):
    return [
        celda.hu_origen_id or "",
        caja.blackbox_id or "",
        str((celda.posicion_en_caja or 0) + 1),  # 0-indexada en BD -> 1..180
        celda.dmc_code or "",
        caja.usuario_id or "",
    ]


def _celdas_ordenadas(caja):
    # Ordenadas por posición para que el fichero salga 1..180 en orden.
    return sorted(caja.celdas, key=lambda c: (c.posicion_en_caja or 0))


def _construir_normal(caja):
    cabecera = SEPARADOR.join(CABECERA_BASE)
    lineas = [
        SEPARADOR.join(_campos_base(caja, celda)) for celda in _celdas_ordenadas(caja)
    ]
    return FIN_LINEA.join([cabecera] + lineas) + FIN_LINEA


def _construir_bloqueo(caja):
    # Toda la caja es del mismo tipo -> mismo motivo para las 180 líneas.
    motivo = BLOCKING_REASON[caja.tipo_caja]
    cabecera = SEPARADOR.join(CABECERA_BASE + [COLUMNA_BLOCKING])
    lineas = [
        SEPARADOR.join(_campos_base(caja, celda) + [motivo])
        for celda in _celdas_ordenadas(caja)
    ]
    return FIN_LINEA.join([cabecera] + lineas) + FIN_LINEA


def _escribir_atomico(nombre_base, contenido):
    destino = os.path.join(CARPETA_SALIDA, f"{nombre_base}.csv")
    tmp = os.path.join(CARPETA_SALIDA, f".{nombre_base}.csv.tmp")

    with open(tmp, "w", encoding=ENCODING, newline="") as f:
        f.write(contenido)
        f.flush()
        os.fsync(f.fileno())  # en disco antes del rename

    os.replace(tmp, destino)  # atómico dentro del mismo directorio/share


def generar_fichero(caja):
    if caja.tipo_caja == TIPO_NORMAL:
        contenido = _construir_normal(caja)
    elif caja.tipo_caja in BLOCKING_REASON:
        contenido = _construir_bloqueo(caja)
    else:
        # Tipo desconocido: mejor fallar visible que exportar algo dudoso.
        raise ValueError(
            f"Tipo de caja no soportado para exportación: '{caja.tipo_caja}'"
        )

    _escribir_atomico(caja.id_temporal, contenido)
