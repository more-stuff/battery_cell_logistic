export const TIPOS_CAJA = {
  NORMAL: "NORMAL",
  DEFECTUOSA: "DEFECTUOSA",
  CADUCIDAD_PROXIMA: "CADUCIDAD_PROXIMA",
};

const normalizarFechaLocal = (date) => {
  const copia = new Date(date);
  copia.setHours(0, 0, 0, 0);
  return copia;
};

export const esCaducidadProxima = (fechaCaducidad, diasCaducidadProxima) => {
  const fecha = normalizarFechaLocal(fechaCaducidad);

  const dias = Number(diasCaducidadProxima);

  if (!fecha || !Number.isFinite(dias) || dias < 0) {
    return false;
  }

  const hoy = normalizarFechaLocal(new Date());

  const fechaLimite = normalizarFechaLocal(new Date());
  fechaLimite.setDate(fechaLimite.getDate() + dias);

  return fecha >= hoy && fecha <= fechaLimite;
};

export const estaCaducada = (fechaCaducidad) => {
  if (!fechaCaducidad) return false;

  const hoy = normalizarFechaLocal(new Date());
  const fecha = normalizarFechaLocal(new Date(fechaCaducidad));

  return fecha < hoy;
};

export const validarCeldaPorTipoCaja = ({
  tipoCaja,
  dmc,
  fechaCaducidad,
  blacklist,
  diasCaducidadProxima,
  diasCaducidadProximaDefectuosa,
}) => {
  const estaEnBlacklist = blacklist?.has?.(dmc) ?? false;

  const diasAplicables =
    tipoCaja === TIPOS_CAJA.DEFECTUOSA
      ? Number(diasCaducidadProximaDefectuosa ?? diasCaducidadProxima ?? 30)
      : Number(diasCaducidadProxima ?? 30);

  const caducidadProxima = esCaducidadProxima(fechaCaducidad, diasAplicables);

  const caducada = estaCaducada(fechaCaducidad);

  if (tipoCaja === TIPOS_CAJA.NORMAL) {
    if (estaEnBlacklist) {
      return {
        ok: false,
        type: "defect_error",
        error:
          "🚨 PIEZA DEFECTUOSA: Este DMC está marcado como defectuoso y no puede entrar en una caja normal.",
      };
    }

    if (caducada) {
      return {
        ok: false,
        type: "date_error",
        error:
          "⛔ PIEZA CADUCADA: Esta celda ya está caducada y no puede entrar en una caja normal.",
      };
    }

    if (caducidadProxima) {
      return {
        ok: false,
        type: "date_error",
        error:
          "⏳ CADUCIDAD PRÓXIMA: Esta celda debe ir a una caja de caducidad próxima, no a una caja normal.",
      };
    }

    return { ok: true };
  }

  if (tipoCaja === TIPOS_CAJA.DEFECTUOSA) {
    if (!estaEnBlacklist) {
      return {
        ok: false,
        type: "defect_error",
        error:
          "🚨 PIEZA NO DEFECTUOSA: Este DMC no está marcado como defectuoso y no puede entrar en una caja defectuosa.",
      };
    }

    if (caducada) {
      return {
        ok: false,
        type: "date_error",
        error:
          "⛔ PIEZA CADUCADA: Esta celda ya está caducada y no puede entrar en una caja defectuosa.",
      };
    }

    if (caducidadProxima) {
      return {
        ok: false,
        type: "date_error",
        error:
          "error: `⏳ CADUCIDAD PRÓXIMA EN DEFECTUOSAS: Esta celda está dentro del margen especial de ${diasAplicables} días configurado para defectuosas y no puede entrar en esta caja.`,",
      };
    }

    return { ok: true };
  }

  if (tipoCaja === TIPOS_CAJA.CADUCIDAD_PROXIMA) {
    if (estaEnBlacklist) {
      return {
        ok: false,
        type: "defect_error",
        error:
          "🚨 PIEZA DEFECTUOSA: Este DMC está marcado como defectuoso y debe ir a una caja defectuosa, no a caducidad próxima.",
      };
    }

    if (caducada) {
      return {
        ok: false,
        type: "date_error",
        error:
          "⛔ PIEZA CADUCADA: Esta celda ya está caducada y no puede entrar en una caja de caducidad próxima.",
      };
    }

    if (!caducidadProxima) {
      return {
        ok: false,
        type: "date_error",
        error:
          "⏳ PIEZA FUERA DE UMBRAL: Esta celda no está dentro del rango de caducidad próxima.",
      };
    }

    return { ok: true };
  }

  return {
    ok: false,
    type: "date_error",
    error: `Tipo de caja no reconocido: ${tipoCaja}`,
  };
};
