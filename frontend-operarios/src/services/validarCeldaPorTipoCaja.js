export const TIPOS_CAJA = {
  NORMAL: "NORMAL",
  DEFECTUOSA: "DEFECTUOSA",
  CADUCIDAD_PROXIMA: "CADUCIDAD_PROXIMA",
  COBRE: "COBRE",
};

export const MOTIVOS = {
  DEFECTUOSO: "DEFECTUOSO",
  COBRE: "COBRE",
};

const MOTIVO_POR_TIPO_CAJA = {
  [TIPOS_CAJA.DEFECTUOSA]: MOTIVOS.DEFECTUOSO,
  [TIPOS_CAJA.COBRE]: MOTIVOS.COBRE,
};

const CAJA_POR_MOTIVO = {
  [MOTIVOS.DEFECTUOSO]: TIPOS_CAJA.DEFECTUOSA,
  [MOTIVOS.COBRE]: TIPOS_CAJA.COBRE,
};

const ETIQUETA_MOTIVO = {
  [MOTIVOS.DEFECTUOSO]: "DEFECTUOSA",
  [MOTIVOS.COBRE]: "CON PARTÍCULAS DE COBRE",
};

const ICONO_MOTIVO = {
  [MOTIVOS.DEFECTUOSO]: "🚨",
  [MOTIVOS.COBRE]: "🟠",
};

const NOMBRE_CAJA = {
  [TIPOS_CAJA.NORMAL]: "normal",
  [TIPOS_CAJA.DEFECTUOSA]: "defectuosa",
  [TIPOS_CAJA.CADUCIDAD_PROXIMA]: "de caducidad próxima",
  [TIPOS_CAJA.COBRE]: "de cobre",
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
  motivoBloqueo, // null si el DMC está libre
  diasCaducidadProxima,
  diasCaducidadProximaDefectuosa,
}) => {
  const bloqueo = motivoBloqueo ?? null;

  // Las cajas de material bloqueado comparten margen de caducidad: son la
  // misma caja física y el mismo tipo de material retenido.
  const esCajaBloqueo =
    tipoCaja === TIPOS_CAJA.DEFECTUOSA || tipoCaja === TIPOS_CAJA.COBRE;

  const diasAplicables = esCajaBloqueo
    ? Number(diasCaducidadProximaDefectuosa ?? diasCaducidadProxima ?? 30)
    : Number(diasCaducidadProxima ?? 30);

  const caducidadProxima = esCaducidadProxima(fechaCaducidad, diasAplicables);
  const caducada = estaCaducada(fechaCaducidad);

  if (bloqueo !== null && !CAJA_POR_MOTIVO[bloqueo]) {
    // Motivo desconocido: cortar es más seguro que dejarla pasar por no
    // reconocerlo. Puede ocurrir si el backend añade un motivo y la PDA aún
    // no se ha actualizado.
    return {
      ok: false,
      type: "defect_error",
      error: `⛔ Este DMC tiene un motivo de bloqueo desconocido (${bloqueo}). Avisa a mantenimiento.`,
    };
  }

  // --- CAJAS QUE NO ADMITEN MATERIAL BLOQUEADO ---
  if (
    tipoCaja === TIPOS_CAJA.NORMAL ||
    tipoCaja === TIPOS_CAJA.CADUCIDAD_PROXIMA
  ) {
    if (bloqueo !== null) {
      return {
        ok: false,
        type: "defect_error",
        error:
          `${ICONO_MOTIVO[bloqueo]} PIEZA ${ETIQUETA_MOTIVO[bloqueo]}: ` +
          `debe ir a una caja ${NOMBRE_CAJA[CAJA_POR_MOTIVO[bloqueo]]}, ` +
          `no a una caja ${NOMBRE_CAJA[tipoCaja]}.`,
      };
    }

    if (caducada) {
      return {
        ok: false,
        type: "date_error",
        error: `⛔ PIEZA CADUCADA: no puede entrar en una caja ${NOMBRE_CAJA[tipoCaja]}.`,
      };
    }

    if (tipoCaja === TIPOS_CAJA.NORMAL && caducidadProxima) {
      return {
        ok: false,
        type: "date_error",
        error:
          "⏳ CADUCIDAD PRÓXIMA: esta celda debe ir a una caja de caducidad próxima.",
      };
    }

    if (tipoCaja === TIPOS_CAJA.CADUCIDAD_PROXIMA && !caducidadProxima) {
      return {
        ok: false,
        type: "date_error",
        error:
          "⏳ PIEZA FUERA DE UMBRAL: esta celda no está dentro del rango de caducidad próxima.",
      };
    }

    return { ok: true };
  }

  // --- CAJAS DE MATERIAL BLOQUEADO (DEFECTUOSA y COBRE) ---
  const motivoEsperado = MOTIVO_POR_TIPO_CAJA[tipoCaja];

  if (!motivoEsperado) {
    return {
      ok: false,
      type: "date_error",
      error: `Tipo de caja no reconocido: ${tipoCaja}`,
    };
  }

  if (bloqueo === null) {
    return {
      ok: false,
      type: "defect_error",
      error:
        `${ICONO_MOTIVO[motivoEsperado]} PIEZA NO ${ETIQUETA_MOTIVO[motivoEsperado]}: ` +
        `este DMC no está marcado y no puede entrar en una caja ${NOMBRE_CAJA[tipoCaja]}.`,
    };
  }

  if (bloqueo !== motivoEsperado) {
    return {
      ok: false,
      type: "defect_error",
      error:
        `${ICONO_MOTIVO[bloqueo]} CAJA EQUIVOCADA: este DMC está marcado como ` +
        `${ETIQUETA_MOTIVO[bloqueo]}, no como ${ETIQUETA_MOTIVO[motivoEsperado]}. ` +
        `Debe ir a una caja ${NOMBRE_CAJA[CAJA_POR_MOTIVO[bloqueo]]}.`,
    };
  }

  if (caducada) {
    return {
      ok: false,
      type: "date_error",
      error: `⛔ PIEZA CADUCADA: no puede entrar en una caja ${NOMBRE_CAJA[tipoCaja]}.`,
    };
  }

  if (caducidadProxima) {
    return {
      ok: false,
      type: "date_error",
      error:
        `⏳ CADUCIDAD PRÓXIMA: esta celda está dentro del margen especial de ` +
        `${diasAplicables} días y no puede entrar en una caja ${NOMBRE_CAJA[tipoCaja]}.`,
    };
  }

  return { ok: true };
};
