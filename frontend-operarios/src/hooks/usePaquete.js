import { useCallback, useEffect, useState } from "react";
import {
  enviarPaquete,
  obtenerConfiguracion,
  obtenerDmcDefectuosos,
  obtenerVersionBlacklist,
} from "../services/api";

import {
  leerCache,
  guardarCache,
  borrarCache,
} from "../services/blacklistCache";

import {
  MOTIVOS,
  TIPOS_CAJA,
  validarCeldaPorTipoCaja,
} from "../services/validarCeldaPorTipoCaja";

import {
  TIPO_ENTRADA,
  calcularControlCalidad,
  calcularNivelCompletado,
  clasificarEntradaEscaneo,
  extraerFechaCaducidadDmc,
} from "../services/entradaEscaneo";

import { MODELO_POR_DEFECTO } from "../services/modelos";

import Swal from "sweetalert2";

const TAMANO_NIVEL_POR_DEFECTO = 45;

const obtenerEnteroPositivo = (valor, defecto) => {
  const numero = Number(valor);

  return Number.isInteger(numero) && numero > 0 ? numero : defecto;
};

export const usePaquete = (
  usuario,
  tipoCaja = TIPOS_CAJA.NORMAL,
  modelo = MODELO_POR_DEFECTO,
) => {
  const is_defective = tipoCaja === TIPOS_CAJA.DEFECTUOSA;

  const [config, setConfig] = useState({
    alerta_cada: 15,
    limite_caja: 180,
    limite_defectuosa: 180,
    limite_caducidad_proxima: 180,
    len_dmc: 87,
    caducidad_proxima_dias: 30,
    caducidad_proxima_defectuosa_dias: 30,
    tamano_nivel: TAMANO_NIVEL_POR_DEFECTO,
  });

  const [configCargada, setConfigCargada] = useState(false);

  const [huActual, setHuActual] = useState("");
  const [blackboxId, setBlackboxId] = useState("");
  const [celdaInput, setCeldaInput] = useState("");
  const [celdas, setCeldas] = useState([]);
  const [fechaInicio, setFechaInicio] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const [idGuardado, setIdGuardado] = useState(null);
  const [fechaCaducidadCajaGuardada, setFechaCaducidadCajaGuardada] =
    useState(null);

  // Dos Sets separados. El motivo de un DMC se resuelve mirando en cuál está.
  const [bloqueo, setBloqueo] = useState({
    defectuosos: new Set(),
    cobre: new Set(),
  });

  // FAIL-CLOSED: mientras esto sea false NO se puede escanear.
  //
  // Es el punto crítico de todo el mecanismo. Si la lista no está cargada y
  // dejáramos escanear, la validación no fallaría: daría "libre" a todo y
  // metería cobre y defectuosas en cajas normales sin un solo aviso. Un fallo
  // silencioso es peor que un puesto parado.
  const [bloqueoCargado, setBloqueoCargado] = useState(false);
  const [errorBloqueo, setErrorBloqueo] = useState(null);

  const aplicarListas = useCallback((datos) => {
    setBloqueo({
      defectuosos: new Set(datos.defectuosos),
      cobre: new Set(datos.cobre),
    });
    setBloqueoCargado(true);
    setErrorBloqueo(null);
  }, []);

  const cargarListaBloqueo = useCallback(async () => {
    setBloqueoCargado(false);
    setErrorBloqueo(null);

    try {
      // 1. Preguntamos SOLO la versión: unos bytes en vez de decenas de MB.
      const versionServidor = await obtenerVersionBlacklist();

      // 2. ¿Sirve lo que tenemos guardado?
      const cache = await leerCache();

      if (cache && cache.version === versionServidor) {
        aplicarListas(cache);
        return;
      }

      // 3. No sirve: se descarga entera y se reemplaza.
      const datos = await obtenerDmcDefectuosos();

      if (
        !Array.isArray(datos?.defectuosos) ||
        !Array.isArray(datos?.cobre) ||
        !Number.isInteger(datos?.version)
      ) {
        // Respuesta con forma inesperada. Cortamos: mejor puesto parado que
        // validando con una lista incompleta.
        throw new Error("Respuesta inesperada del servidor.");
      }

      aplicarListas(datos);

      // La versión que se guarda es la que VIENE CON LAS LISTAS, no la del
      // paso 1. Si alguien importa entre ambas llamadas, guardar la del paso 1
      // dejaría una copia etiquetada con una versión que no le corresponde y
      // que nunca se refrescaría.
      await guardarCache(datos);
    } catch (error) {
      console.error("Error cargando la lista de bloqueo", error);

      // La copia local podría estar desfasada respecto al servidor, así que no
      // se usa como respaldo: se descarta y el puesto queda bloqueado.
      await borrarCache();

      setBloqueo({ defectuosos: new Set(), cobre: new Set() });
      setBloqueoCargado(false);
      setErrorBloqueo(
        "No se ha podido cargar la lista de bloqueo. No se puede escanear hasta que se recupere la conexión.",
      );
    }
  }, [aplicarListas]);

  // null = DMC libre. Los motivos son excluyentes, así que en cuanto aparece
  // en una lista no hace falta mirar la otra.
  const motivoDeBloqueo = useCallback(
    (dmc) => {
      if (bloqueo.defectuosos.has(dmc)) return MOTIVOS.DEFECTUOSO;
      if (bloqueo.cobre.has(dmc)) return MOTIVOS.COBRE;
      return null;
    },
    [bloqueo],
  );

  useEffect(() => {
    let activo = true;

    const cargarDatosBackend = async () => {
      setConfigCargada(false);

      try {
        const datos = await obtenerConfiguracion(modelo);

        if (!activo) return;

        setConfig({
          alerta_cada: Number(datos.alerta_cada ?? 15),
          limite_caja: Number(datos.limite_caja ?? 180),
          limite_defectuosa: Number(datos.limite_defectuosa ?? 180),
          limite_caducidad_proxima: Number(
            datos.limite_caducidad_proxima ?? 180,
          ),
          caducidad_proxima_dias: Number(datos.caducidad_proxima_dias ?? 30),
          caducidad_proxima_defectuosa_dias: Number(
            datos.caducidad_proxima_defectuosa_dias ??
              datos.caducidad_proxima_dias ??
              30,
          ),
          len_dmc: Number(datos.len_dmc ?? 87),
          tamano_nivel: obtenerEnteroPositivo(
            datos.tamano_nivel,
            TAMANO_NIVEL_POR_DEFECTO,
          ),
        });
      } catch (error) {
        console.error(`Error cargando configuración de ${modelo}:`, error);
      } finally {
        if (activo) {
          setConfigCargada(true);
        }
      }
    };

    cargarDatosBackend();
    cargarListaBloqueo();

    return () => {
      activo = false;
    };
  }, [modelo, cargarListaBloqueo]);

  // ─── LocalStorage ───────────────────────────────────────────────────────

  const userKey = usuario ? `_${usuario}` : "";
  const modeloKey = `_${modelo.toLowerCase()}`;
  const tipoKey = `_${tipoCaja.toLowerCase()}`;

  const KEY_CELDAS = `paquete_en_curso${userKey}${modeloKey}${tipoKey}`;
  const KEY_HU = `hu_actual${userKey}${modeloKey}${tipoKey}`;
  const KEY_FECHA = `fecha_inicio${userKey}${modeloKey}${tipoKey}`;
  const KEY_BLACKBOX = `blackbox_id${userKey}${modeloKey}${tipoKey}`;

  const storageScope = `${usuario}|${modelo}|${tipoCaja}`;
  const [storageHydratedScope, setStorageHydratedScope] = useState(null);

  // COBRE comparte límite con DEFECTUOSA: es la misma caja física. Tiene que
  // coincidir con get_limite_por_tipo_caja() del backend, o el operario
  // escanearía 180 piezas para que finalizar_reempaque le rechace la caja.
  const limiteActivo =
    tipoCaja === TIPOS_CAJA.DEFECTUOSA || tipoCaja === TIPOS_CAJA.COBRE
      ? config.limite_defectuosa
      : tipoCaja === TIPOS_CAJA.CADUCIDAD_PROXIMA
        ? config.limite_caducidad_proxima
        : config.limite_caja;

  const tamanoNivelActivo = obtenerEnteroPositivo(
    config.tamano_nivel,
    TAMANO_NIVEL_POR_DEFECTO,
  );

  useEffect(() => {
    setStorageHydratedScope(null);

    if (!usuario) {
      setCeldas([]);
      setHuActual("");
      setBlackboxId("");
      setFechaInicio(null);
      return;
    }

    const savedCeldas = localStorage.getItem(KEY_CELDAS);
    const savedHu = localStorage.getItem(KEY_HU);
    const savedFecha = localStorage.getItem(KEY_FECHA);
    const savedBlackboxId = localStorage.getItem(KEY_BLACKBOX);

    if (savedCeldas) {
      try {
        const parsedCeldas = JSON.parse(savedCeldas);

        if (!Array.isArray(parsedCeldas)) {
          throw new Error("El contenido de celdas no es un array.");
        }

        setCeldas(parsedCeldas);
      } catch (error) {
        console.error("Datos locales corruptos, reiniciando caja:", error);
        localStorage.removeItem(KEY_CELDAS);
        setCeldas([]);
      }
    } else {
      setCeldas([]);
    }

    setHuActual(savedHu ?? "");
    setFechaInicio(savedFecha ?? null);
    setBlackboxId(savedBlackboxId ?? "");
    setStorageHydratedScope(storageScope);
  }, [usuario, storageScope, KEY_CELDAS, KEY_HU, KEY_FECHA, KEY_BLACKBOX]);

  const storageReady =
    Boolean(usuario) && storageHydratedScope === storageScope;

  useEffect(() => {
    if (!storageReady) return;

    localStorage.setItem(KEY_CELDAS, JSON.stringify(celdas));
  }, [celdas, storageReady, KEY_CELDAS]);

  useEffect(() => {
    if (!storageReady) return;

    localStorage.setItem(KEY_HU, huActual);
  }, [huActual, storageReady, KEY_HU]);

  useEffect(() => {
    if (!storageReady) return;

    const blackboxLimpio = String(blackboxId ?? "").trim();

    if (blackboxLimpio) {
      localStorage.setItem(KEY_BLACKBOX, blackboxLimpio);
    } else {
      localStorage.removeItem(KEY_BLACKBOX);
    }
  }, [blackboxId, storageReady, KEY_BLACKBOX]);

  useEffect(() => {
    if (!storageReady) return;

    if (fechaInicio) {
      localStorage.setItem(KEY_FECHA, fechaInicio);
    } else {
      localStorage.removeItem(KEY_FECHA);
    }
  }, [fechaInicio, storageReady, KEY_FECHA]);

  // ─── Acciones ───────────────────────────────────────────────────────────

  const asignarVoltajeUltimaCelda = (voltaje) => {
    if (celdas.length === 0) {
      setCeldaInput("");

      return {
        error: "⚠️ Escanea una celda antes de registrar su voltaje.",
        type: "short_error",
      };
    }

    setCeldas((celdasActuales) => {
      const indiceUltimaCelda = celdasActuales.length - 1;

      return celdasActuales.map((celda, indice) =>
        indice === indiceUltimaCelda
          ? { ...celda, voltaje_medido: voltaje }
          : celda,
      );
    });

    setCeldaInput("");

    return {
      success: true,
      type: "ok",
      voltajeAsignado: true,
      voltaje,
    };
  };

  const agregarDmc = (dmc) => {
    if (!configCargada) {
      return {
        error: `⏳ Cargando configuración de ${modelo}. Espera un momento.`,
        type: "short_error",
      };
    }

    // FAIL-CLOSED. Sin la lista cargada no se valida nada: pasaría cualquier
    // celda, incluidas las bloqueadas, y sin ningún aviso.
    if (!bloqueoCargado) {
      return {
        error:
          errorBloqueo ??
          "⏳ Cargando lista de bloqueo. No se puede escanear todavía.",
        type: "defect_error",
      };
    }

    if (!huActual) {
      return {
        error: "⚠️ Introduce el HU de la caja primero.",
        type: "short_error",
      };
    }

    if (dmc.length < config.len_dmc) {
      return {
        error: "⚠️ Código muy corto (Faltan datos).",
        type: "short_error",
      };
    }

    if (celdas.length >= limiteActivo) {
      return {
        error: "📦 Paquete lleno.",
        type: "duplicate_error",
      };
    }

    if (celdas.some((celda) => celda.codigo_celda === dmc)) {
      setCeldaInput("");

      return {
        error: "⛔ Pieza YA escaneada anteriormente.",
        type: "duplicate_error",
      };
    }

    const resultadoFecha = extraerFechaCaducidadDmc(dmc);

    if (!resultadoFecha.ok) {
      return {
        error: resultadoFecha.error,
        type: resultadoFecha.type,
      };
    }

    const resultado = validarCeldaPorTipoCaja({
      tipoCaja,
      dmc,
      fechaCaducidad: resultadoFecha.fechaCaducidad,
      motivoBloqueo: motivoDeBloqueo(dmc),
      diasCaducidadProxima: config.caducidad_proxima_dias,
      diasCaducidadProximaDefectuosa: config.caducidad_proxima_defectuosa_dias,
    });

    if (!resultado.ok) {
      setCeldaInput("");

      return {
        error: resultado.error,
        type: resultado.type,
      };
    }

    const controlCalidad = calcularControlCalidad({
      cantidadActual: celdas.length,
      alertaCada: config.alerta_cada,
      limite: limiteActivo,
    });

    const nuevaCelda = {
      id: Date.now(),
      codigo_celda: dmc,
      hu_asociado: huActual,
      fecha_caducidad: resultadoFecha.fechaCaducidad,
      voltaje_medido: null,
      timestamp: new Date().toISOString(),
      es_revision: controlCalidad.esRevision,
    };

    const nuevasCeldas = [...celdas, nuevaCelda];

    const datosNivel = calcularNivelCompletado({
      cantidadActual: nuevasCeldas.length,
      limite: limiteActivo,
      tamanoNivel: tamanoNivelActivo,
    });

    if (celdas.length === 0 && !fechaInicio) {
      setFechaInicio(new Date().toISOString());
    }

    setCeldas(nuevasCeldas);
    setCeldaInput("");

    return {
      success: true,

      // Ejemplo alerta_cada = 5:
      // al escanear la 4 avisa que la próxima, la 5, será revisión.
      revision: controlCalidad.avisarRevisionProxima,
      numeroPieza: controlCalidad.numeroPiezaSiguiente,

      ...datosNivel,
    };
  };

  const agregarCelda = () => {
    const entrada = clasificarEntradaEscaneo(celdaInput);

    if (entrada.tipo === TIPO_ENTRADA.VACIA) {
      return;
    }

    if (entrada.tipo === TIPO_ENTRADA.VOLTAJE_INVALIDO) {
      setCeldaInput("");

      return {
        error: entrada.error,
        type: "short_error",
      };
    }

    if (entrada.tipo === TIPO_ENTRADA.VOLTAJE) {
      // Funciona incluso si la caja acaba de llenarse,
      // para poder medir la última celda antes de cerrarla.
      return asignarVoltajeUltimaCelda(entrada.voltaje);
    }

    return agregarDmc(entrada.dmc);
  };

  const borrarCelda = (index) => {
    const nuevas = celdas.filter((_, i) => i !== index);

    setCeldas(nuevas);

    if (nuevas.length === 0) {
      setFechaInicio(null);
    }
  };

  const borrarDesde = (index) => {
    const nuevas = celdas.slice(0, index);

    setCeldas(nuevas);

    if (nuevas.length === 0) {
      setFechaInicio(null);
    }
  };

  const resetProceso = () => {
    setHuActual("");
    setBlackboxId("");
    setCeldaInput("");
    setCeldas([]);
    setFechaInicio(null);
    setIdGuardado(null);
    setFechaCaducidadCajaGuardada(null);

    localStorage.removeItem(KEY_CELDAS);
    localStorage.removeItem(KEY_HU);
    localStorage.removeItem(KEY_FECHA);
    localStorage.removeItem(KEY_BLACKBOX);
  };

  const enviarDatos = async (blackboxIdRecibido = blackboxId) => {
    if (celdas.length < limiteActivo) {
      const faltantes = limiteActivo - celdas.length;

      Swal.fire({
        icon: "error",
        title: "⛔ CAJA INCOMPLETA",
        text: `No se puede cerrar la caja. Faltan ${faltantes} piezas para llegar a ${limiteActivo}.`,
        confirmButtonColor: "#d33",
        confirmButtonText: "Entendido, seguir escaneando",
      });

      return;
    }

    const blackboxIdLimpio = String(blackboxIdRecibido ?? "").trim();

    if (!blackboxIdLimpio) {
      Swal.fire({
        icon: "warning",
        title: "Falta Blackbox ID",
        text: "Escanea la Blackbox ID antes de finalizar la caja.",
        confirmButtonColor: "#d97706",
      });

      return;
    }

    setEnviando(true);

    try {
      const payload = {
        usuario_id: usuario,
        fecha_inicio: fechaInicio || new Date().toISOString(),
        fecha_fin: new Date().toISOString(),
        is_defective,
        tipo_caja: tipoCaja,
        modelo,
        blackbox_id: blackboxIdLimpio,

        celdas: celdas.map((celda) => ({
          dmc_code: celda.codigo_celda,
          fecha_caducidad: celda.fecha_caducidad,
          hu_origen: celda.hu_asociado,
          estado_calidad: celda.es_revision ? "REVISION" : "OK",
          voltaje_medido: celda.voltaje_medido ?? null,
        })),
      };

      const respuesta = await enviarPaquete(payload);

      setIdGuardado(respuesta.id_temporal);
      setFechaCaducidadCajaGuardada(respuesta.fecha_caducidad_caja ?? null);

      // Con la versión en juego, esto ya no redescarga 48 MB por caja cerrada:
      // pregunta la versión y, si no ha cambiado, tira de la copia local.
      await cargarListaBloqueo();

      setCeldas([]);
      setFechaInicio(null);
      setHuActual("");
      setBlackboxId("");

      localStorage.removeItem(KEY_CELDAS);
      localStorage.removeItem(KEY_HU);
      localStorage.removeItem(KEY_FECHA);
      localStorage.removeItem(KEY_BLACKBOX);
    } catch (error) {
      if (error.response?.status === 409) {
        const mensajeError =
          error.response.data.detail || "Conflicto de datos.";

        Swal.fire({
          title: "⛔ NO SE PUEDE CERRAR",
          html: `
            <div style="text-align: left;">
              <p>Se han encontrado errores críticos:</p>
              <div style="background: #ffebee; color: #c62828; padding: 10px; border-radius: 5px; border: 1px solid #ef9a9a; font-family: monospace; white-space: pre-wrap;">
                ${mensajeError}
              </div>
            </div>
          `,
          icon: "error",
          confirmButtonText: "Entendido, voy a revisar",
          confirmButtonColor: "#d33",
          width: 600,
        });
      } else {
        Swal.fire({
          title: "Error de Servidor",
          text: "Hubo un problema de conexión. Inténtalo de nuevo.",
          icon: "error",
        });
      }
    } finally {
      setEnviando(false);
    }
  };

  return {
    huActual,
    setHuActual,

    blackboxId,
    setBlackboxId,

    celdaInput,
    setCeldaInput,

    celdas,
    enviando,

    idGuardado,
    fechaCaducidadCajaGuardada,

    resetProceso,
    agregarCelda,
    borrarCelda,
    borrarDesde,
    enviarDatos,

    configCargada,

    // Estado de la lista de bloqueo, para que la pantalla pueda avisar y
    // ofrecer reintentar en vez de dejar al operario escaneando en vacío.
    bloqueoCargado,
    errorBloqueo,
    recargarListaBloqueo: cargarListaBloqueo,

    limite: limiteActivo,
    limite_normal: config.limite_caja,
    limite_defectuosas: config.limite_defectuosa,
    limite_caducidad_proxima: config.limite_caducidad_proxima,

    level_size: tamanoNivelActivo,
  };
};
