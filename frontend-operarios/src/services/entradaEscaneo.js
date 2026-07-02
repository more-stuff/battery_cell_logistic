const PREFIJO_VOLTAJE = /^V\s*:\s*/i;

export const TIPO_ENTRADA = Object.freeze({
  VACIA: "VACIA",
  DMC: "DMC",
  VOLTAJE: "VOLTAJE",
  VOLTAJE_INVALIDO: "VOLTAJE_INVALIDO",
});

export const clasificarEntradaEscaneo = (valor) => {
  const texto = String(valor ?? "").trim();

  if (!texto) {
    return { tipo: TIPO_ENTRADA.VACIA };
  }

  if (!PREFIJO_VOLTAJE.test(texto)) {
    return {
      tipo: TIPO_ENTRADA.DMC,
      dmc: texto,
    };
  }

  const valorMedido = texto.replace(PREFIJO_VOLTAJE, "").trim();

  // No convierte entre V y mV.
  // V:3672 se guarda como 3672.
  if (!/^[+-]?\d+(?:[.,]\d+)?$/.test(valorMedido)) {
    return {
      tipo: TIPO_ENTRADA.VOLTAJE_INVALIDO,
      error: "⚠️ Voltaje no válido. Usa el formato V:3672 o V:3.672.",
    };
  }

  const voltaje = Number(valorMedido.replace(",", "."));

  if (!Number.isFinite(voltaje)) {
    return {
      tipo: TIPO_ENTRADA.VOLTAJE_INVALIDO,
      error: "⚠️ Voltaje no válido.",
    };
  }

  return {
    tipo: TIPO_ENTRADA.VOLTAJE,
    voltaje,
  };
};

export const extraerFechaCaducidadDmc = (dmc) => {
  const fechaCruda = dmc.slice(-6);

  const dia = Number.parseInt(fechaCruda.slice(0, 2), 10);
  const mes = Number.parseInt(fechaCruda.slice(2, 4), 10);
  const year = Number.parseInt(`20${fechaCruda.slice(4, 6)}`, 10);

  const fecha = new Date(year, mes - 1, dia);

  const esValida =
    fecha.getFullYear() === year &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia;

  if (!esValida) {
    return {
      ok: false,
      error: `❌ La fecha extraída (${dia}/${mes}/${year}) NO es válida. Revisa el código.`,
      type: "date_error",
    };
  }

  return {
    ok: true,
    fechaCaducidad: `${year}-${String(mes).padStart(2, "0")}-${String(
      dia,
    ).padStart(2, "0")}`,
  };
};

export const calcularControlCalidad = ({
  cantidadActual,
  alertaCada,
  limite,
}) => {
  const numeroPiezaEscaneada = cantidadActual + 1;
  const numeroPiezaSiguiente = numeroPiezaEscaneada + 1;

  const esRevision =
    alertaCada === -1
      ? numeroPiezaEscaneada === 1 || numeroPiezaEscaneada === limite
      : alertaCada > 0 && numeroPiezaEscaneada % alertaCada === 0;

  const avisarRevisionProxima =
    alertaCada === -1
      ? numeroPiezaSiguiente === limite
      : alertaCada > 0 && numeroPiezaSiguiente % alertaCada === 0;

  return {
    esRevision,
    avisarRevisionProxima,
    numeroPiezaEscaneada,
    numeroPiezaSiguiente,
  };
};

export const calcularNivelCompletado = ({
  cantidadActual,
  limite,
  tamanoNivel,
}) => ({
  nivelCompletado:
    cantidadActual % tamanoNivel === 0 && cantidadActual < limite,

  numeroNivel: Math.floor(cantidadActual / tamanoNivel),
});
