from datetime import date, timedelta
from typing import Optional
from sqlalchemy import text
from sqlalchemy import func, cast, Integer

TIPO_NORMAL = "NORMAL"
TIPO_DEFECTUOSA = "DEFECTUOSA"
TIPO_CADUCIDAD_PROXIMA = "CADUCIDAD_PROXIMA"
TIPO_COBRE = "COBRE"


TIPOS_CAJA_VALIDOS = {
    TIPO_NORMAL,
    TIPO_DEFECTUOSA,
    TIPO_CADUCIDAD_PROXIMA,
    TIPO_COBRE,
}

MOTIVO_DEFECTUOSO = "DEFECTUOSO"
MOTIVO_COBRE = "COBRE"

MOTIVOS_VALIDOS = {
    MOTIVO_DEFECTUOSO,
    MOTIVO_COBRE,
}

MOTIVO_POR_TIPO_CAJA = {
    TIPO_DEFECTUOSA: MOTIVO_DEFECTUOSO,
    TIPO_COBRE: MOTIVO_COBRE,
}

# Texto legible para los mensajes de error del operario.
ETIQUETA_MOTIVO = {
    MOTIVO_DEFECTUOSO: "defectuoso",
    MOTIVO_COBRE: "con partículas de cobre",
}

MODELO1 = "MODELO1"
MODELO2 = "MODELO2"

MODELO_POR_DEFECTO = MODELO1

MODELOS_VALIDOS = {
    MODELO1,
    MODELO2,
}


def normalizar_modelo(modelo: str | None) -> str:
    modelo_normalizado = (modelo or MODELO_POR_DEFECTO).strip().upper()

    if modelo_normalizado not in MODELOS_VALIDOS:
        raise ValueError(f"Modelo no válido: {modelo}")

    return modelo_normalizado


def esta_caducada(fecha_caducidad: Optional[date]) -> bool:
    if fecha_caducidad is None:
        return False

    return fecha_caducidad < date.today()


def es_caducidad_proxima(
    fecha_caducidad: Optional[date],
    dias_caducidad_proxima: int,
) -> bool:
    """
    Devuelve True cuando la fecha está entre hoy y el número de días configurado.

    Esta función no modifica la fecha real de la celda.
    """
    if fecha_caducidad is None:
        return False

    if dias_caducidad_proxima < 0:
        return False

    hoy = date.today()
    limite = hoy + timedelta(days=dias_caducidad_proxima)

    return hoy <= fecha_caducidad <= limite


def validar_celda_para_tipo_caja(
    *,
    tipo_caja: str,
    dmc: str,
    fecha_caducidad: date,
    motivo_bloqueo: Optional[str],
    caducidad_proxima_dias: int,
    caducidad_proxima_defectuosa_dias: int,
) -> None:
    """
    motivo_bloqueo: None si el DMC está libre, o MOTIVO_DEFECTUOSO /
    MOTIVO_COBRE si está en la lista de bloqueo. Son excluyentes.

    Reglas:

    - NORMAL:
      no admite material bloqueado. Usa caducidad_proxima_dias.

    - CADUCIDAD_PROXIMA:
      no admite material bloqueado. Usa caducidad_proxima_dias.

    - DEFECTUOSA:
      solo admite motivo DEFECTUOSO.
      Usa exclusivamente caducidad_proxima_defectuosa_dias.

    - COBRE:
      solo admite motivo COBRE.
      Usa caducidad_proxima_defectuosa_dias, igual que DEFECTUOSA: es la
      misma caja física y el mismo tipo de material retenido.

    Si la celda es válida, no devuelve nada.
    Si no lo es, lanza ValueError.
    """

    if tipo_caja not in TIPOS_CAJA_VALIDOS:
        raise ValueError(f"Tipo de caja no válido: {tipo_caja}")

    if motivo_bloqueo is not None and motivo_bloqueo not in MOTIVOS_VALIDOS:
        # Defensivo: si en BD apareciera un motivo desconocido, mejor cortar
        # que dejar pasar la celda por no reconocerlo.
        raise ValueError(
            f"El DMC {dmc} tiene un motivo de bloqueo desconocido: {motivo_bloqueo}."
        )

    caducada = esta_caducada(fecha_caducidad)

    caducidad_proxima_normal = es_caducidad_proxima(
        fecha_caducidad,
        caducidad_proxima_dias,
    )

    caducidad_proxima_defectuosa = es_caducidad_proxima(
        fecha_caducidad,
        caducidad_proxima_defectuosa_dias,
    )

    # ---- CAJAS QUE NO ADMITEN MATERIAL BLOQUEADO ----

    if tipo_caja in (TIPO_NORMAL, TIPO_CADUCIDAD_PROXIMA):
        if motivo_bloqueo is not None:
            caja_destino = next(
                t for t, m in MOTIVO_POR_TIPO_CAJA.items() if m == motivo_bloqueo
            )
            raise ValueError(
                f"El DMC {dmc} está marcado como "
                f"{ETIQUETA_MOTIVO[motivo_bloqueo]} y debe entrar en una caja "
                f"{caja_destino}, no en una caja {tipo_caja}."
            )

        if caducada:
            raise ValueError(
                f"El DMC {dmc} está caducado y no puede entrar en una caja {tipo_caja}."
            )

        if tipo_caja == TIPO_NORMAL and caducidad_proxima_normal:
            raise ValueError(
                f"El DMC {dmc} tiene caducidad próxima y debe entrar en una caja CADUCIDAD_PROXIMA."
            )

        if tipo_caja == TIPO_CADUCIDAD_PROXIMA and not caducidad_proxima_normal:
            raise ValueError(
                f"El DMC {dmc} no está dentro del umbral de caducidad próxima."
            )

        return

    # ---- CAJAS DE MATERIAL BLOQUEADO (DEFECTUOSA y COBRE) ----

    motivo_esperado = MOTIVO_POR_TIPO_CAJA[tipo_caja]

    if motivo_bloqueo is None:
        raise ValueError(
            f"El DMC {dmc} no está marcado como "
            f"{ETIQUETA_MOTIVO[motivo_esperado]} y no puede entrar en una caja {tipo_caja}."
        )

    if motivo_bloqueo != motivo_esperado:
        caja_correcta = next(
            t for t, m in MOTIVO_POR_TIPO_CAJA.items() if m == motivo_bloqueo
        )
        raise ValueError(
            f"El DMC {dmc} está marcado como {ETIQUETA_MOTIVO[motivo_bloqueo]}, "
            f"no como {ETIQUETA_MOTIVO[motivo_esperado]}. Debe entrar en una "
            f"caja {caja_correcta}."
        )

    if caducada:
        raise ValueError(
            f"El DMC {dmc} está caducado y no puede entrar en una caja {tipo_caja}."
        )

    if caducidad_proxima_defectuosa:
        raise ValueError(
            f"El DMC {dmc} entra dentro del margen especial de caducidad "
            f"próxima ({caducidad_proxima_defectuosa_dias} días) y no puede "
            f"entrar en una caja {tipo_caja}."
        )

    return


def get_config_int(
    db,
    models,
    modelo: Optional[str],
    clave: str,
    default: int,
) -> int:
    modelo = normalizar_modelo(modelo)

    conf = (
        db.query(models.Configuracion)
        .filter(
            models.Configuracion.modelo == modelo,
            models.Configuracion.clave == clave,
        )
        .first()
    )

    if not conf:
        return default

    try:
        valor = int(conf.valor)
        return valor if valor > 0 else default
    except (TypeError, ValueError):
        return default


# INTERRUPTOR GLOBAL DE LA SINCRONIZACIÓN CON SILENA
#
# A diferencia del resto de configuración, este NO es por modelo: afecta a
# toda la instalación. Se guarda igualmente en `configuraciones` (una fila
# por modelo, siempre con el mismo valor) para reutilizar la pantalla de
# administración que ya existe.
#
#   sync_activo -> el worker escribe ficheros en el NAS y, por el mismo
#                  motivo, nadie puede editar ni borrar cajas: a partir del
#                  envío es SILENA quien gestiona modificaciones y bajas.
#
# Es un único interruptor a propósito. Exportar con la edición abierta dejaba
# que el worker exportase una caja mientras el admin la estaba modificando: el
# CSV se escribía con los datos viejos y la caja quedaba EXPORTADO, así que ya
# no se reexportaba nunca. Con un solo flag, worker y edición no pueden estar
# vivos a la vez y esa carrera es imposible por construcción.

CLAVE_SYNC_ACTIVO = "sync_activo"

# Por defecto NO se exporta: hay que activar la sincronización de forma
# explícita para que el worker empiece a enviar cajas a SILENA.
FLAGS_GLOBALES = {
    CLAVE_SYNC_ACTIVO: False,
}

VALORES_FLAG_ACTIVO = {"1", "true", "on", "si", "sí"}


def normalizar_valor_flag(valor) -> str:
    # Todo lo que no sea claramente afirmativo se guarda como "0".
    return "1" if str(valor).strip().lower() in VALORES_FLAG_ACTIVO else "0"


def get_flag_global(db, models, clave: str) -> bool:
    """
    Lee un interruptor global ignorando el modelo.

    Se evalúa en cada petición y NUNCA se guarda en la caja: apagar el
    interruptor devuelve el sistema al estado anterior de forma inmediata y
    retroactiva, sin dejar cajas congeladas.

    Basta con que una fila valga "1" para considerarlo activo.
    """
    default = FLAGS_GLOBALES[clave]

    filas = (
        db.query(models.Configuracion.valor)
        .filter(models.Configuracion.clave == clave)
        .all()
    )

    if not filas:
        return default

    return any(normalizar_valor_flag(fila[0]) == "1" for fila in filas)


def get_limite_por_tipo_caja(
    db,
    models,
    modelo: Optional[str],
    tipo_caja: str,
) -> int:
    modelo = normalizar_modelo(modelo)

    if tipo_caja in (TIPO_DEFECTUOSA, TIPO_COBRE):
        return get_config_int(
            db,
            models,
            modelo,
            "limite_defectuosa",
            180,
        )

    if tipo_caja == TIPO_CADUCIDAD_PROXIMA:
        return get_config_int(
            db,
            models,
            modelo,
            "limite_caducidad_proxima",
            180,
        )

    return get_config_int(
        db,
        models,
        modelo,
        "limite_caja",
        180,
    )


CLAVE_BLACKLIST_VERSION = "blacklist_version"


def get_blacklist_version(db, models) -> int:
    """MAX y no any(): si las dos filas divergieran, gana la más alta, que
    invalida caché de más — el lado seguro del error."""

    valor = (
        db.query(func.max(cast(models.Configuracion.valor, Integer)))
        .filter(models.Configuracion.clave == CLAVE_BLACKLIST_VERSION)
        .scalar()
    )

    return int(valor) if valor is not None else 0


def bump_blacklist_version(db, models) -> int:
    """
    Se llama desde CUALQUIER escritura sobre dmc_defectuosos.
    Sin filtro por modelo: las dos filas se mueven juntas.
    No hace commit — se une a la transacción de quien llama, para que la
    versión no suba si la escritura acaba en rollback.
    """

    db.execute(
        text(
            "UPDATE configuraciones SET valor = (valor::int + 1)::text "
            "WHERE clave = :clave"
        ),
        {"clave": CLAVE_BLACKLIST_VERSION},
    )

    return get_blacklist_version(db, models)
