// CACHÉ LOCAL DE LA LISTA DE BLOQUEO
//
// Medio millón de códigos de 87 caracteres son ~48 MB: no caben en
// localStorage (5-10 MB según navegador, lanza QuotaExceededError). IndexedDB
// no tiene ese techo.
//
// Se guarda UN registro con las dos listas y la versión juntas. Nada de un
// registro por DMC: eso serían medio millón de escrituras y tarda minutos.

const DB_NOMBRE = "wms_blacklist";
const DB_VERSION = 1;
const ALMACEN = "listas";
const CLAVE = "actual";

const abrirDB = () =>
  new Promise((resolve, reject) => {
    const peticion = indexedDB.open(DB_NOMBRE, DB_VERSION);

    peticion.onupgradeneeded = () => {
      const db = peticion.result;
      if (!db.objectStoreNames.contains(ALMACEN)) {
        db.createObjectStore(ALMACEN);
      }
    };

    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });

// Devuelve el contenido guardado, o null si no hay nada o algo no cuadra.
//
// FAIL-CLOSED: cualquier duda sobre la integridad devuelve null, lo que obliga
// a descargar de cero. Nunca se opera con una lista a medias: una lista
// incompleta no da error, simplemente deja pasar celdas que debería bloquear.
export const leerCache = async () => {
  try {
    const db = await abrirDB();

    const datos = await new Promise((resolve, reject) => {
      const tx = db.transaction(ALMACEN, "readonly");
      const peticion = tx.objectStore(ALMACEN).get(CLAVE);
      peticion.onsuccess = () => resolve(peticion.result ?? null);
      peticion.onerror = () => reject(peticion.error);
    });

    db.close();

    if (!datos) return null;

    // Validación de forma. Si falta cualquier pieza, la copia no vale.
    const versionOk = Number.isInteger(datos.version) && datos.version > 0;
    const listasOk =
      Array.isArray(datos.defectuosos) && Array.isArray(datos.cobre);

    if (!versionOk || !listasOk) {
      await borrarCache();
      return null;
    }

    return datos;
  } catch (error) {
    console.error("Caché de lista de bloqueo ilegible, se descarta", error);
    return null;
  }
};

export const guardarCache = async ({ version, defectuosos, cobre }) => {
  try {
    const db = await abrirDB();

    await new Promise((resolve, reject) => {
      const tx = db.transaction(ALMACEN, "readwrite");
      tx.objectStore(ALMACEN).put({ version, defectuosos, cobre }, CLAVE);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
    return true;
  } catch (error) {
    // No poder guardar NO es motivo para fallar: la lista ya está en memoria y
    // el turno puede trabajar. Solo significa que el próximo arranque volverá
    // a descargarla.
    console.error("No se pudo guardar la caché de la lista de bloqueo", error);
    return false;
  }
};

export const borrarCache = async () => {
  try {
    const db = await abrirDB();
    await new Promise((resolve) => {
      const tx = db.transaction(ALMACEN, "readwrite");
      tx.objectStore(ALMACEN).delete(CLAVE);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch (error) {
    console.error("No se pudo borrar la caché", error);
  }
};
