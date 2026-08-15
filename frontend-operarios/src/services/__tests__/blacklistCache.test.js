import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let borrarCache;
let guardarCache;
let leerCache;

beforeEach(async () => {
  vi.resetModules();
  global.indexedDB = new IDBFactory();

  const modulo = await import("../blacklistCache");
  leerCache = modulo.leerCache;
  guardarCache = modulo.guardarCache;
  borrarCache = modulo.borrarCache;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("leerCache", () => {
  it("devuelve null cuando no hay nada guardado", async () => {
    await expect(leerCache()).resolves.toBeNull();
  });

  it("hace round-trip de version, defectuosos y cobre", async () => {
    const datos = { version: 7, defectuosos: ["A", "B"], cobre: ["C"] };

    await expect(guardarCache(datos)).resolves.toBe(true);
    await expect(leerCache()).resolves.toEqual(datos);
  });

  it("descarta y borra cuando version es un string numerico en vez de entero", async () => {
    const db = await new Promise((resolve, reject) => {
      const req = global.indexedDB.open("wms_blacklist", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("listas");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    await new Promise((resolve, reject) => {
      const tx = db.transaction("listas", "readwrite");
      tx.objectStore("listas").put(
        { version: "7", defectuosos: [], cobre: [] },
        "actual",
      );
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    await expect(leerCache()).resolves.toBeNull();

    const db2 = await new Promise((resolve, reject) => {
      const req = global.indexedDB.open("wms_blacklist", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const restante = await new Promise((resolve, reject) => {
      const tx = db2.transaction("listas", "readonly");
      const req = tx.objectStore("listas").get("actual");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db2.close();

    expect(restante).toBeUndefined();
  });

  it("descarta cuando defectuosos no es un array", async () => {
    await guardarCache({ version: 3, defectuosos: "no-es-array", cobre: [] });
    await expect(leerCache()).resolves.toBeNull();
  });

  it("descarta cuando cobre no es un array", async () => {
    await guardarCache({ version: 3, defectuosos: [], cobre: null });
    await expect(leerCache()).resolves.toBeNull();
  });

  it("devuelve null (sin lanzar) si indexedDB.open falla", async () => {
    const errorFalso = new Error("boom");
    vi.spyOn(global.indexedDB, "open").mockImplementation(() => {
      const req = {};
      queueMicrotask(() => {
        req.error = errorFalso;
        req.onerror?.();
      });
      return req;
    });

    await expect(leerCache()).resolves.toBeNull();
  });
});

describe("guardarCache", () => {
  it("resuelve a false en vez de lanzar si la transaccion falla", async () => {
    const errorFalso = new Error("boom");

    const txFalsa = {
      error: errorFalso,
      objectStore: () => ({ put: () => {} }),
    };

    vi.spyOn(global.indexedDB, "open").mockImplementation(() => {
      const req = {};
      queueMicrotask(() => {
        req.result = {
          transaction: () => {
            queueMicrotask(() => txFalsa.onerror?.());
            return txFalsa;
          },
          close: () => {},
        };
        req.onsuccess?.();
      });
      return req;
    });

    await expect(
      guardarCache({ version: 1, defectuosos: [], cobre: [] }),
    ).resolves.toBe(false);
  });
});

describe("borrarCache", () => {
  it("elimina la entrada guardada", async () => {
    await guardarCache({ version: 5, defectuosos: ["X"], cobre: [] });
    await expect(leerCache()).resolves.not.toBeNull();

    await borrarCache();

    await expect(leerCache()).resolves.toBeNull();
  });

  it("no lanza aunque indexedDB.open falle", async () => {
    vi.spyOn(global.indexedDB, "open").mockImplementation(() => {
      const req = {};
      queueMicrotask(() => {
        req.error = new Error("boom");
        req.onerror?.();
      });
      return req;
    });

    await expect(borrarCache()).resolves.toBeUndefined();
  });
});
