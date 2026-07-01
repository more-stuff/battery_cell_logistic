// ─── TAMAÑO DE NIVEL ──────────────────────────────────────────────────────────
// Número de celdas por nivel (separador físico dentro de la caja).
// Cambia este valor si el proveedor cambia el formato de embalaje.
const LEVEL_SIZE = 45;
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import {
  enviarPaquete,
  obtenerConfiguracion,
  obtenerDmcDefectuosos,
} from "../services/api";

import {
  TIPOS_CAJA,
  validarCeldaPorTipoCaja,
} from "../services/validarCeldaPorTipoCaja";

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
  const is_caducidad_proxima = tipoCaja === TIPOS_CAJA.CADUCIDAD_PROXIMA;

  const [config, setConfig] = useState({
    alerta_cada: 15,
    limite_caja: 180,
    limite_defectuosa: 180,
    limite_caducidad_proxima: 180,
    len_dmc: 87,
    level_size: LEVEL_SIZE,
    caducidad_proxima_dias: 30,
    tamano_nivel: TAMANO_NIVEL_POR_DEFECTO,
  });

  const [configCargada, setConfigCargada] = useState(false);

  const [huActual, setHuActual] = useState("");
  const [blackboxId, setBlackboxId] = useState("");
  const [celdaInput, setCeldaInput] = useState("");
  const [celdas, setCeldas] = useState([]);
  const [fechaInicio, setFechaInicio] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // guardar info que nos devuelve el server para las etiquetas
  const [idGuardado, setIdGuardado] = useState(null);
  const [fechaCaducidadCajaGuardada, setFechaCaducidadCajaGuardada] =
    useState(null);

  const [blacklist, setBlacklist] = useState(new Set());

  useEffect(() => {
    let activo = true;

    const cargarDatosBackend = async () => {
      setConfigCargada(false);

      console.log(`🔄 Cargando configuración de ${modelo}...`);

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
          len_dmc: Number(datos.len_dmc ?? 87),
          level_size: LEVEL_SIZE,
          tamano_nivel: obtenerEnteroPositivo(
            datos.tamano_nivel,
            TAMANO_NIVEL_POR_DEFECTO,
          ),
        });

        console.log(`✅ Configuración ${modelo} cargada:`, datos);
      } catch (error) {
        console.error(`⚠️ Error cargando configuración de ${modelo}:`, error);
      } finally {
        if (activo) {
          setConfigCargada(true);
        }
      }
    };

    cargarDatosBackend();
    refrescarListaNegra();

    return () => {
      activo = false;
    };
  }, [modelo]);

  // gestion del localstorage
  const userKey = usuario ? `_${usuario}` : "";
  const modeloKey = `_${modelo.toLowerCase()}`;
  const tipoKey = `_${tipoCaja.toLowerCase()}`;

  const KEY_CELDAS = `paquete_en_curso${userKey}${modeloKey}${tipoKey}`;
  const KEY_HU = `hu_actual${userKey}${modeloKey}${tipoKey}`;
  const KEY_FECHA = `fecha_inicio${userKey}${modeloKey}${tipoKey}`;
  const KEY_BLACKBOX = `blackbox_id${userKey}${modeloKey}${tipoKey}`;

  // Guarda qué combinación de operario + modelo + tipo ya se ha restaurado.
  // Así no escribimos una caja anterior o vacía mientras se están recuperando datos.
  const storageScope = `${usuario}|${modelo}|${tipoCaja}`;
  const [storageHydratedScope, setStorageHydratedScope] = useState(null);

  const limiteActivo =
    tipoCaja === TIPOS_CAJA.DEFECTUOSA
      ? config.limite_defectuosa
      : tipoCaja === TIPOS_CAJA.CADUCIDAD_PROXIMA
        ? config.limite_caducidad_proxima
        : config.limite_caja;

  const tamanoNivelActivo = obtenerEnteroPositivo(
    config.tamano_nivel,
    TAMANO_NIVEL_POR_DEFECTO,
  );

  useEffect(() => {
    // Bloqueamos temporalmente la escritura mientras recuperamos datos.
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

    // Solo ahora permitimos que los efectos vuelvan a guardar.
    setStorageHydratedScope(storageScope);
  }, [usuario, storageScope, KEY_CELDAS, KEY_HU, KEY_FECHA, KEY_BLACKBOX]);

  // Solo persistimos cuando la caja correspondiente ya se ha restaurado.
  // Sin esta protección, el primer render guardaba [] y borraba la caja real.
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

  // --- ACCIONES ---

  const refrescarListaNegra = async () => {
    try {
      //console.log("🔄 Actualizando lista de defectuosos...");
      const lista = await obtenerDmcDefectuosos();
      setBlacklist(new Set(lista)); // Usamos Set para que la búsqueda sea instantánea
    } catch (e) {
      console.error("Error cargando lista negra", e);
    }
  };

  const agregarCelda = () => {
    // 1. VALIDACIONES BÁSICAS
    if (!configCargada) {
      return {
        error: `⏳ Cargando configuración de ${modelo}. Espera un momento.`,
        type: "short_error",
      };
    }
    if (!huActual)
      return {
        error: "⚠️ Introduce el HU de la caja primero.",
        type: "short_error",
      };
    if (!celdaInput) return;
    if (celdaInput.length < config.len_dmc)
      return {
        error: "⚠️ Código muy corto (Faltan datos).",
        type: "short_error",
      };
    if (celdas.length >= limiteActivo) {
      return { error: "📦 Paquete lleno.", type: "duplicate_error" };
    }

    // Evitar duplicados
    if (celdas.some((c) => c.codigo_celda === celdaInput)) {
      setCeldaInput("");
      return {
        error: "⛔ Pieza YA escaneada anteriormente.",
        type: "duplicate_error",
      };
    }

    // 2. EXTRACCIÓN Y VALIDACIÓN DE FECHA
    const rawDate = celdaInput.slice(-6); // Ej: 311225
    const dia = parseInt(rawDate.substring(0, 2));
    const mes = parseInt(rawDate.substring(2, 4));
    const year = parseInt("20" + rawDate.substring(4, 6));

    // Validar si es una fecha real (ej: que no sea mes 13 o día 32)
    const fechaObj = new Date(year, mes - 1, dia);
    const esFechaValida =
      fechaObj.getFullYear() === year &&
      fechaObj.getMonth() === mes - 1 &&
      fechaObj.getDate() === dia;

    if (!esFechaValida) {
      return {
        error: `❌ La fecha extraída (${dia}/${mes}/${year}) NO es válida. Revisa el código.`,
        type: "date_error",
      };
    }

    // Si pasamos aquí, la fecha es buena. Formateamos para el backend: YYYY-MM-DD
    // IMPORTANTE: Asegúrate de añadir ceros a la izquierda si hace falta (01 en vez de 1)
    const mesStr = mes.toString().padStart(2, "0");
    const diaStr = dia.toString().padStart(2, "0");
    const fechaFormateada = `${year}-${mesStr}-${diaStr}`;

    // 3. GESTIÓN DE FECHA INICIO
    if (celdas.length === 0 && !fechaInicio) {
      setFechaInicio(new Date().toISOString());
    }

    const validacionTipoCaja = validarCeldaPorTipoCaja({
      tipoCaja,
      dmc: celdaInput,
      fechaCaducidad: fechaFormateada,
      blacklist,
      diasCaducidadProxima: config.caducidad_proxima_dias,
    });

    if (!validacionTipoCaja.ok) {
      setCeldaInput("");
      return {
        error: validacionTipoCaja.error,
        type: validacionTipoCaja.type,
      };
    }

    let has_revision =
      config.alerta_cada === -1
        ? celdas.length + 1 === 1 || celdas.length + 1 === limiteActivo
        : config.alerta_cada > 0 &&
          (celdas.length + 1) % config.alerta_cada === 0;

    // 4. GUARDAR
    const nuevaCelda = {
      id: Date.now(),
      codigo_celda: celdaInput,
      hu_asociado: huActual,
      fecha_caducidad: fechaFormateada,
      timestamp: new Date().toISOString(),
      es_revision: has_revision,
    };

    const nuevasCeldas = [...celdas, nuevaCelda];
    setCeldas(nuevasCeldas);
    setCeldaInput("");

    // Alerta preventiva
    const total_celdas = nuevasCeldas.length;
    let requiereRevision = false;

    if (config.alerta_cada === -1) {
      requiereRevision =
        total_celdas === 0 || total_celdas + 1 === limiteActivo;
    } else if (config.alerta_cada > 0) {
      requiereRevision = (total_celdas + 1) % config.alerta_cada === 0;
    }

    const nivelCompletado =
      total_celdas % tamanoNivelActivo === 0 && total_celdas < limiteActivo;

    const numeroNivel = Math.floor(total_celdas / tamanoNivelActivo);

    return {
      success: true,
      revision: requiereRevision, // true o false
      numeroPieza: total_celdas + 1, // Para mostrarlo en la alerta
      nivelCompletado: nivelCompletado,
      numeroNivel: numeroNivel,
    };
  };

  const borrarCelda = (index) => {
    const nuevas = celdas.filter((_, i) => i !== index);
    setCeldas(nuevas);
    if (nuevas.length === 0) setFechaInicio(null);
  };

  const borrarDesde = (index) => {
    // Si l'índex és 2, volem quedar-nos amb 0 i 1.
    // slice(0, index) fa just això.
    const nuevas = celdas.slice(0, index);
    setCeldas(nuevas);
    if (nuevas.length === 0) setFechaInicio(null);
  };

  const resetProceso = () => {
    setHuActual(""); // Limpia el input de caja
    setBlackboxId(""); // Limpia el input de Blackbox ID
    setCeldaInput(""); // Limpia el input de pieza
    setCeldas([]); // <--- ESTA ES LA CLAVE: vacía el array de la tabla
    setIdGuardado(null); // Quita el modal de éxito
    setFechaCaducidadCajaGuardada(null); // Limpia la fecha de caducidad guardada
  };

  const enviarDatos = async (blackboxId) => {
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
    const blackboxIdLimpio = String(blackboxId ?? "").trim();

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
      // Mapeo para el Backend
      const payload = {
        usuario_id: usuario,
        fecha_inicio: fechaInicio || new Date().toISOString(),
        fecha_fin: new Date().toISOString(),
        is_defective: is_defective,
        tipo_caja: tipoCaja,
        modelo: modelo,
        blackbox_id: blackboxIdLimpio,
        celdas: celdas.map((c) => ({
          dmc_code: c.codigo_celda,
          fecha_caducidad: c.fecha_caducidad,
          hu_origen: c.hu_asociado,
          estado_calidad: c.es_revision ? "REVISION" : "OK",
        })),
      };
      console.log(payload);

      const respuesta = await enviarPaquete(payload);
      console.log("RESPUESTA DEL SERVIDOR:", respuesta);
      // ÉXITO: Guardamos el ID para mostrarlo en el modal
      setIdGuardado(respuesta.id_temporal);
      setFechaCaducidadCajaGuardada(respuesta.fecha_caducidad_caja ?? null);

      await refrescarListaNegra();

      // Reset
      setCeldas([]);
      setFechaInicio(null);
      setHuActual("");
      setBlackboxId("");

      localStorage.removeItem(KEY_CELDAS);
      localStorage.removeItem(KEY_HU);
      localStorage.removeItem(KEY_FECHA);
      localStorage.removeItem(KEY_BLACKBOX);
    } catch (error) {
      if (error.response && error.response.status === 409) {
        // 409 = CONFLICTO (Duplicados o Lista Negra detectados por el backend)

        const mensajeError =
          error.response.data.detail || "Conflicto de datos.";

        // Reproducir sonido de error si tienes acceso a los audios, o solo la alerta
        // const audio = new Audio("/sounds/defect_error.mp3"); audio.play();

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
        // Error 500 u otros
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

  // ... dentro de src/hooks/usePaquete.js

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
    limite: limiteActivo,
    limite_normal: config.limite_caja,
    limite_defectuosas: config.limite_defectuosa,
    limite_caducidad_proxima: config.limite_caducidad_proxima,

    level_size: tamanoNivelActivo,
  };
};
