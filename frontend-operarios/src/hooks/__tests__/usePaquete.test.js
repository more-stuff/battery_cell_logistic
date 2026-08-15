import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePaquete } from "../usePaquete";
import { TIPOS_CAJA } from "../../services/validarCeldaPorTipoCaja";

import {
  enviarPaquete,
  obtenerConfiguracion,
  obtenerDmcDefectuosos,
  obtenerVersionBlacklist,
} from "../../services/api";

import {
  borrarCache,
  guardarCache,
  leerCache,
} from "../../services/blacklistCache";

vi.mock("../../services/api", () => ({
  obtenerConfiguracion: vi.fn(),
  obtenerDmcDefectuosos: vi.fn(),
  obtenerVersionBlacklist: vi.fn(),
  enviarPaquete: vi.fn(),
}));

vi.mock("../../services/blacklistCache", () => ({
  leerCache: vi.fn(),
  guardarCache: vi.fn(),
  borrarCache: vi.fn(),
}));

vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn(() => Promise.resolve({ isConfirmed: false })) },
}));

const DEFAULT_CONFIG = {
  alerta_cada: 15,
  limite_caja: 180,
  limite_defectuosa: 180,
  limite_caducidad_proxima: 180,
  len_dmc: 20,
  caducidad_proxima_dias: 30,
  caducidad_proxima_defectuosa_dias: 30,
  tamano_nivel: 45,
};

const addDays = (date, dias) => {
  const copia = new Date(date);
  copia.setDate(copia.getDate() + dias);
  return copia;
};

const dmcConFecha = (fecha, sufijo = "0000000000") => {
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const yy = String(fecha.getFullYear()).slice(-2);
  const base = `DMC${sufijo}`.padEnd(14, "0").slice(0, 14);
  return `${base}${dd}${mm}${yy}`;
};

const FECHA_LEJANA = addDays(new Date(), 60);

let contadorUsuario = 0;
const nuevoUsuario = () => `operario_${++contadorUsuario}`;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();

  obtenerConfiguracion.mockResolvedValue(DEFAULT_CONFIG);
  obtenerVersionBlacklist.mockResolvedValue(1);
  leerCache.mockResolvedValue(null);
  obtenerDmcDefectuosos.mockResolvedValue({
    version: 1,
    defectuosos: [],
    cobre: [],
  });
  guardarCache.mockResolvedValue(true);
  borrarCache.mockResolvedValue(undefined);
  enviarPaquete.mockResolvedValue({ id_temporal: "temp-1" });
});

afterEach(() => {
  cleanup();
});

describe("fail-closed: bloqueo no cargado", () => {
  it("agregarDmc rechaza y no agrega la celda mientras bloqueoCargado siga false", async () => {
    let liberarVersion;
    obtenerVersionBlacklist.mockImplementation(
      () => new Promise((resolve) => { liberarVersion = resolve; }),
    );

    const usuario = nuevoUsuario();
    const { result } = renderHook(() =>
      usePaquete(usuario, TIPOS_CAJA.NORMAL),
    );

    await waitFor(() => expect(result.current.configCargada).toBe(true));
    expect(result.current.bloqueoCargado).toBe(false);

    act(() => {
      result.current.setHuActual("HU1");
    });

    act(() => {
      result.current.setCeldaInput(dmcConFecha(FECHA_LEJANA));
    });

    let resultado;
    act(() => {
      resultado = result.current.agregarCelda();
    });

    expect(resultado.type).toBe("defect_error");
    expect(resultado.error).toBeTruthy();
    expect(result.current.celdas).toHaveLength(0);

    liberarVersion?.(1);
  });
});

describe("carga de la lista de bloqueo", () => {
  it("si obtenerVersionBlacklist rechaza, bloqueoCargado queda false y se borra la cache", async () => {
    obtenerVersionBlacklist.mockRejectedValue(new Error("network down"));

    const usuario = nuevoUsuario();
    const { result } = renderHook(() =>
      usePaquete(usuario, TIPOS_CAJA.NORMAL),
    );

    await waitFor(() => expect(result.current.errorBloqueo).not.toBeNull());

    expect(result.current.bloqueoCargado).toBe(false);
    expect(borrarCache).toHaveBeenCalled();
  });

  it("cache hit (misma version): no descarga la lista completa", async () => {
    obtenerVersionBlacklist.mockResolvedValue(5);
    leerCache.mockResolvedValue({
      version: 5,
      defectuosos: ["DEF1"],
      cobre: ["COB1"],
    });

    const usuario = nuevoUsuario();
    const { result } = renderHook(() =>
      usePaquete(usuario, TIPOS_CAJA.NORMAL),
    );

    await waitFor(() => expect(result.current.bloqueoCargado).toBe(true));

    expect(obtenerDmcDefectuosos).not.toHaveBeenCalled();
  });

  it("cache miss por version distinta: descarga la lista completa y la guarda", async () => {
    obtenerVersionBlacklist.mockResolvedValue(6);
    leerCache.mockResolvedValue({
      version: 5,
      defectuosos: [],
      cobre: [],
    });
    const datosCompletos = {
      version: 6,
      defectuosos: ["DEF2"],
      cobre: ["COB2"],
    };
    obtenerDmcDefectuosos.mockResolvedValue(datosCompletos);

    const usuario = nuevoUsuario();
    const { result } = renderHook(() =>
      usePaquete(usuario, TIPOS_CAJA.NORMAL),
    );

    await waitFor(() => expect(result.current.bloqueoCargado).toBe(true));

    expect(obtenerDmcDefectuosos).toHaveBeenCalled();
    expect(guardarCache).toHaveBeenCalledWith(datosCompletos);
  });

  it("cache miss porque leerCache resuelve null: descarga la lista completa y la guarda", async () => {
    obtenerVersionBlacklist.mockResolvedValue(9);
    leerCache.mockResolvedValue(null);
    const datosCompletos = {
      version: 9,
      defectuosos: ["DEF3"],
      cobre: [],
    };
    obtenerDmcDefectuosos.mockResolvedValue(datosCompletos);

    const usuario = nuevoUsuario();
    const { result } = renderHook(() =>
      usePaquete(usuario, TIPOS_CAJA.NORMAL),
    );

    await waitFor(() => expect(result.current.bloqueoCargado).toBe(true));

    expect(obtenerDmcDefectuosos).toHaveBeenCalled();
    expect(guardarCache).toHaveBeenCalledWith(datosCompletos);
  });
});

describe("integracion con validarCeldaPorTipoCaja via motivoDeBloqueo", () => {
  it("un DMC marcado DEFECTUOSO escaneado en una caja COBRE se rechaza por motivo equivocado", async () => {
    const dmcDefectuoso = dmcConFecha(FECHA_LEJANA, "AAAAAAAAAA");

    obtenerVersionBlacklist.mockResolvedValue(1);
    leerCache.mockResolvedValue(null);
    obtenerDmcDefectuosos.mockResolvedValue({
      version: 1,
      defectuosos: [dmcDefectuoso],
      cobre: [],
    });

    const usuario = nuevoUsuario();
    const { result } = renderHook(() =>
      usePaquete(usuario, TIPOS_CAJA.COBRE),
    );

    await waitFor(() => expect(result.current.configCargada).toBe(true));
    await waitFor(() => expect(result.current.bloqueoCargado).toBe(true));

    act(() => {
      result.current.setHuActual("HU1");
    });

    act(() => {
      result.current.setCeldaInput(dmcDefectuoso);
    });

    let resultado;
    act(() => {
      resultado = result.current.agregarCelda();
    });

    expect(resultado.ok).not.toBe(true);
    expect(resultado.type).toBe("defect_error");
    expect(result.current.celdas).toHaveLength(0);
  });
});

describe("limite activo por tipo de caja", () => {
  it("limite es limite_defectuosa cuando tipoCaja es COBRE", async () => {
    obtenerConfiguracion.mockResolvedValue({
      ...DEFAULT_CONFIG,
      limite_caja: 100,
      limite_defectuosa: 42,
      limite_caducidad_proxima: 77,
    });

    const usuario = nuevoUsuario();
    const { result } = renderHook(() =>
      usePaquete(usuario, TIPOS_CAJA.COBRE),
    );

    await waitFor(() => expect(result.current.configCargada).toBe(true));

    expect(result.current.limite).toBe(42);
    expect(result.current.limite).not.toBe(100);
  });

  it("limite es limite_defectuosa cuando tipoCaja es DEFECTUOSA (comparten caja fisica)", async () => {
    obtenerConfiguracion.mockResolvedValue({
      ...DEFAULT_CONFIG,
      limite_caja: 100,
      limite_defectuosa: 42,
      limite_caducidad_proxima: 77,
    });

    const usuario = nuevoUsuario();
    const { result } = renderHook(() =>
      usePaquete(usuario, TIPOS_CAJA.DEFECTUOSA),
    );

    await waitFor(() => expect(result.current.configCargada).toBe(true));

    expect(result.current.limite).toBe(42);
  });
});
