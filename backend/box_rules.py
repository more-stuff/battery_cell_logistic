from datetime import date, timedelta
from typing import Optional

TIPO_NORMAL = "NORMAL"
TIPO_DEFECTUOSA = "DEFECTUOSA"
TIPO_CADUCIDAD_PROXIMA = "CADUCIDAD_PROXIMA"

TIPOS_CAJA_VALIDOS = {
    TIPO_NORMAL,
    TIPO_DEFECTUOSA,
    TIPO_CADUCIDAD_PROXIMA,
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
    if fecha_caducidad is None:
        return False

    hoy = date.today()
    limite = hoy + timedelta(days=dias_caducidad_proxima)

    return hoy <= fecha_caducidad <= limite


def validar_celda_para_tipo_caja(
    *,
    tipo_caja: str,
    dmc: str,
    fecha_caducidad: date,
    dmc_es_defectuoso: bool,
    dias_caducidad_proxima: int,
) -> None:
    """
    Valida si una celda puede entrar en una caja de tipo:
    NORMAL / DEFECTUOSA / CADUCIDAD_PROXIMA.

    Si la celda es válida, no devuelve nada.
    Si no es válida, lanza ValueError.
    """

    if tipo_caja not in TIPOS_CAJA_VALIDOS:
        raise ValueError(f"Tipo de caja no válido: {tipo_caja}")

    caducada = esta_caducada(fecha_caducidad)
    caducidad_proxima = es_caducidad_proxima(
        fecha_caducidad,
        dias_caducidad_proxima,
    )

    if tipo_caja == TIPO_NORMAL:
        if dmc_es_defectuoso:
            raise ValueError(
                f"El DMC {dmc} está marcado como defectuoso y no puede entrar en una caja NORMAL."
            )

        if caducada:
            raise ValueError(
                f"El DMC {dmc} está caducado y no puede entrar en una caja NORMAL."
            )

        if caducidad_proxima:
            raise ValueError(
                f"El DMC {dmc} tiene caducidad próxima y debe entrar en una caja CADUCIDAD_PROXIMA."
            )

        return

    if tipo_caja == TIPO_DEFECTUOSA:
        if not dmc_es_defectuoso:
            raise ValueError(
                f"El DMC {dmc} no está marcado como defectuoso y no puede entrar en una caja DEFECTUOSA."
            )

        if caducada:
            raise ValueError(
                f"El DMC {dmc} está caducado y no puede entrar en una caja DEFECTUOSA."
            )

        if caducidad_proxima:
            raise ValueError(
                f"El DMC {dmc} tiene caducidad próxima y debe entrar en una caja CADUCIDAD_PROXIMA."
            )

        return

    if tipo_caja == TIPO_CADUCIDAD_PROXIMA:
        if dmc_es_defectuoso:
            raise ValueError(
                f"El DMC {dmc} está marcado como defectuoso y no puede entrar en una caja CADUCIDAD_PROXIMA."
            )

        if caducada:
            raise ValueError(
                f"El DMC {dmc} está caducado y no puede entrar en una caja CADUCIDAD_PROXIMA."
            )

        if not caducidad_proxima:
            raise ValueError(
                f"El DMC {dmc} no está dentro del umbral de caducidad próxima."
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


def get_limite_por_tipo_caja(
    db,
    models,
    modelo: Optional[str],
    tipo_caja: str,
) -> int:
    modelo = normalizar_modelo(modelo)

    if tipo_caja == TIPO_DEFECTUOSA:
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
