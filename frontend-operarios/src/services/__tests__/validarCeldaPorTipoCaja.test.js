import { describe, expect, it } from "vitest";
import {
  MOTIVOS,
  TIPOS_CAJA,
  esCaducidadProxima,
  estaCaducada,
  validarCeldaPorTipoCaja,
} from "../validarCeldaPorTipoCaja";

const addDays = (date, dias) => {
  const copia = new Date(date);
  copia.setDate(copia.getDate() + dias);
  return copia;
};

const localDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const hoy = () => new Date();
const LEJANA = localDate(addDays(hoy(), 60));
const AYER = localDate(addDays(hoy(), -1));
const PROXIMA = localDate(addDays(hoy(), 5));

const MARGEN = 10;

describe("validarCeldaPorTipoCaja - matriz completa", () => {
  it("NORMAL + libre + no caducada + no proxima => ok", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.NORMAL,
      dmc: "DMC1",
      fechaCaducidad: LEJANA,
      motivoBloqueo: null,
      diasCaducidadProxima: MARGEN,
    });
    expect(r).toEqual({ ok: true });
  });

  it("NORMAL + DEFECTUOSO => rechaza, debe ir a DEFECTUOSA", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.NORMAL,
      dmc: "DMC1",
      fechaCaducidad: LEJANA,
      motivoBloqueo: MOTIVOS.DEFECTUOSO,
      diasCaducidadProxima: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("defect_error");
    expect(r.error).toContain("defectuosa");
  });

  it("NORMAL + COBRE => rechaza, debe ir a COBRE", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.NORMAL,
      dmc: "DMC1",
      fechaCaducidad: LEJANA,
      motivoBloqueo: MOTIVOS.COBRE,
      diasCaducidadProxima: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("defect_error");
    expect(r.error).toContain("de cobre");
  });

  it("NORMAL + libre + caducada => rechaza, caducada", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.NORMAL,
      dmc: "DMC1",
      fechaCaducidad: AYER,
      motivoBloqueo: null,
      diasCaducidadProxima: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("date_error");
    expect(r.error).toContain("CADUCADA");
  });

  it("NORMAL + libre + caducidad proxima (margen normal) => rechaza, debe ir a CADUCIDAD_PROXIMA", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.NORMAL,
      dmc: "DMC1",
      fechaCaducidad: PROXIMA,
      motivoBloqueo: null,
      diasCaducidadProxima: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("date_error");
    expect(r.error).toContain("CADUCIDAD PRÓXIMA");
  });

  it("CADUCIDAD_PROXIMA + libre + dentro del margen normal => ok", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.CADUCIDAD_PROXIMA,
      dmc: "DMC1",
      fechaCaducidad: PROXIMA,
      motivoBloqueo: null,
      diasCaducidadProxima: MARGEN,
    });
    expect(r).toEqual({ ok: true });
  });

  it("CADUCIDAD_PROXIMA + DEFECTUOSO => rechaza", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.CADUCIDAD_PROXIMA,
      dmc: "DMC1",
      fechaCaducidad: PROXIMA,
      motivoBloqueo: MOTIVOS.DEFECTUOSO,
      diasCaducidadProxima: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("defect_error");
  });

  it("CADUCIDAD_PROXIMA + COBRE => rechaza", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.CADUCIDAD_PROXIMA,
      dmc: "DMC1",
      fechaCaducidad: PROXIMA,
      motivoBloqueo: MOTIVOS.COBRE,
      diasCaducidadProxima: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("defect_error");
  });

  it("CADUCIDAD_PROXIMA + libre + caducada => rechaza, caducada", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.CADUCIDAD_PROXIMA,
      dmc: "DMC1",
      fechaCaducidad: AYER,
      motivoBloqueo: null,
      diasCaducidadProxima: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("date_error");
    expect(r.error).toContain("CADUCADA");
  });

  it("CADUCIDAD_PROXIMA + libre + fuera de umbral => rechaza", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.CADUCIDAD_PROXIMA,
      dmc: "DMC1",
      fechaCaducidad: LEJANA,
      motivoBloqueo: null,
      diasCaducidadProxima: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("date_error");
    expect(r.error).toContain("FUERA DE UMBRAL");
  });

  it("DEFECTUOSA + DEFECTUOSO + no caducada + no proxima(margen defectuosa) => ok", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.DEFECTUOSA,
      dmc: "DMC1",
      fechaCaducidad: LEJANA,
      motivoBloqueo: MOTIVOS.DEFECTUOSO,
      diasCaducidadProxima: MARGEN,
      diasCaducidadProximaDefectuosa: MARGEN,
    });
    expect(r).toEqual({ ok: true });
  });

  it("DEFECTUOSA + libre => rechaza, no esta marcado", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.DEFECTUOSA,
      dmc: "DMC1",
      fechaCaducidad: LEJANA,
      motivoBloqueo: null,
      diasCaducidadProximaDefectuosa: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("defect_error");
    expect(r.error).toContain("NO ");
  });

  it("DEFECTUOSA + COBRE => rechaza, marcado como cobre no defectuoso", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.DEFECTUOSA,
      dmc: "DMC1",
      fechaCaducidad: LEJANA,
      motivoBloqueo: MOTIVOS.COBRE,
      diasCaducidadProximaDefectuosa: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("defect_error");
    expect(r.error).toContain("CAJA EQUIVOCADA");
  });

  it("DEFECTUOSA + DEFECTUOSO + caducada => rechaza, caducada", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.DEFECTUOSA,
      dmc: "DMC1",
      fechaCaducidad: AYER,
      motivoBloqueo: MOTIVOS.DEFECTUOSO,
      diasCaducidadProximaDefectuosa: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("date_error");
    expect(r.error).toContain("CADUCADA");
  });

  it("DEFECTUOSA + DEFECTUOSO + proxima(margen defectuosa) => rechaza, y usa el margen defectuosa no el normal", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.DEFECTUOSA,
      dmc: "DMC1",
      fechaCaducidad: PROXIMA,
      motivoBloqueo: MOTIVOS.DEFECTUOSO,
      diasCaducidadProxima: 0,
      diasCaducidadProximaDefectuosa: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("date_error");
    expect(r.error).toContain("CADUCIDAD PRÓXIMA");
  });

  it("COBRE + COBRE + no caducada + no proxima(margen defectuosa) => ok", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.COBRE,
      dmc: "DMC1",
      fechaCaducidad: LEJANA,
      motivoBloqueo: MOTIVOS.COBRE,
      diasCaducidadProximaDefectuosa: MARGEN,
    });
    expect(r).toEqual({ ok: true });
  });

  it("COBRE + libre => rechaza, no esta marcado", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.COBRE,
      dmc: "DMC1",
      fechaCaducidad: LEJANA,
      motivoBloqueo: null,
      diasCaducidadProximaDefectuosa: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("defect_error");
  });

  it("COBRE + DEFECTUOSO => rechaza, marcado como defectuoso no cobre", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.COBRE,
      dmc: "DMC1",
      fechaCaducidad: LEJANA,
      motivoBloqueo: MOTIVOS.DEFECTUOSO,
      diasCaducidadProximaDefectuosa: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("defect_error");
    expect(r.error).toContain("CAJA EQUIVOCADA");
  });

  it("COBRE + COBRE + caducada => rechaza, caducada", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.COBRE,
      dmc: "DMC1",
      fechaCaducidad: AYER,
      motivoBloqueo: MOTIVOS.COBRE,
      diasCaducidadProximaDefectuosa: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("date_error");
    expect(r.error).toContain("CADUCADA");
  });

  it("COBRE + COBRE + proxima(margen defectuosa) => rechaza", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.COBRE,
      dmc: "DMC1",
      fechaCaducidad: PROXIMA,
      motivoBloqueo: MOTIVOS.COBRE,
      diasCaducidadProxima: 0,
      diasCaducidadProximaDefectuosa: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("date_error");
  });

  it.each([
    TIPOS_CAJA.NORMAL,
    TIPOS_CAJA.DEFECTUOSA,
    TIPOS_CAJA.COBRE,
    TIPOS_CAJA.CADUCIDAD_PROXIMA,
  ])("%s + motivo desconocido => rechaza siempre", (tipoCaja) => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja,
      dmc: "DMC1",
      fechaCaducidad: LEJANA,
      motivoBloqueo: "NIQUEL",
      diasCaducidadProxima: MARGEN,
      diasCaducidadProximaDefectuosa: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("defect_error");
    expect(r.error).toContain("desconocido");
  });
});

describe("validarCeldaPorTipoCaja - fallback de dias de caducidad proxima defectuosa", () => {
  it("DEFECTUOSA sin diasCaducidadProximaDefectuosa cae a diasCaducidadProxima", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.DEFECTUOSA,
      dmc: "DMC1",
      fechaCaducidad: PROXIMA,
      motivoBloqueo: MOTIVOS.DEFECTUOSO,
      diasCaducidadProxima: MARGEN,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("date_error");
  });

  it("DEFECTUOSA sin ninguno de los dos cae al default de 30 dias", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.DEFECTUOSA,
      dmc: "DMC1",
      fechaCaducidad: PROXIMA,
      motivoBloqueo: MOTIVOS.DEFECTUOSO,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("date_error");
  });

  it("NORMAL sin diasCaducidadProxima cae al default de 30 dias", () => {
    const r = validarCeldaPorTipoCaja({
      tipoCaja: TIPOS_CAJA.NORMAL,
      dmc: "DMC1",
      fechaCaducidad: PROXIMA,
      motivoBloqueo: null,
    });
    expect(r.ok).toBe(false);
    expect(r.type).toBe("date_error");
  });
});

describe("esCaducidadProxima", () => {
  it("true cuando la fecha cae dentro del margen (inclusive)", () => {
    expect(esCaducidadProxima(PROXIMA, MARGEN)).toBe(true);
  });

  it("false cuando la fecha esta fuera del margen", () => {
    expect(esCaducidadProxima(LEJANA, MARGEN)).toBe(false);
  });

  it("false para fechas ya caducadas", () => {
    expect(esCaducidadProxima(AYER, MARGEN)).toBe(false);
  });

  it("false para dias invalidos (negativo, NaN)", () => {
    expect(esCaducidadProxima(PROXIMA, -1)).toBe(false);
    expect(esCaducidadProxima(PROXIMA, "no-numero")).toBe(false);
  });

  it("true cuando la fecha es exactamente hoy", () => {
    expect(esCaducidadProxima(localDate(hoy()), MARGEN)).toBe(true);
  });
});

describe("estaCaducada", () => {
  it("true para fechas pasadas", () => {
    expect(estaCaducada(AYER)).toBe(true);
  });

  it("false para fechas futuras", () => {
    expect(estaCaducada(LEJANA)).toBe(false);
  });

  it("false para hoy", () => {
    expect(estaCaducada(localDate(hoy()))).toBe(false);
  });

  it("false cuando no hay fecha", () => {
    expect(estaCaducada(null)).toBe(false);
    expect(estaCaducada(undefined)).toBe(false);
  });
});
