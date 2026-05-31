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

import Swal from "sweetalert2";

export const usePaquete = (usuario, tipoCaja = TIPOS_CAJA.NORMAL) => {
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
  });

  const [huActual, setHuActual] = useState("");
  const [celdaInput, setCeldaInput] = useState("");
  const [celdas, setCeldas] = useState([]);
  const [fechaInicio, setFechaInicio] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [idGuardado, setIdGuardado] = useState(null); //  Para guardar el ID que nos devuelve el servidor

  const [blacklist, setBlacklist] = useState(new Set());

  useEffect(() => {
    const cargarDatosBackend = async () => {
      console.log("🔄 Cargando configuración desde Backend...");
      try {
        const datos = await obtenerConfiguracion();
        // Si todo va bien, actualizamos el estado con lo que diga la base de datos
        setConfig({
          alerta_cada: Number(datos.alerta_cada),
          limite_caja: Number(datos.limite_caja),
          limite_defectuosa: Number(datos.limite_defectuosa),
          limite_caducidad_proxima: Number(
            datos.limite_caducidad_proxima || 180,
          ),
          caducidad_proxima_dias: Number(datos.caducidad_proxima_dias || 30),
          len_dmc: Number(datos.len_dmc),
          level_size: LEVEL_SIZE,
        });
        console.log("✅ Configuración cargada:", datos);
      } catch (error) {
        console.error(
          "⚠️ Error cargando config, usando valores por defecto: ",
          error,
        );
      }
    };

    cargarDatosBackend();
    refrescarListaNegra();
  }, []);

  // gestion del localstorage
  const userKey = usuario ? `_${usuario}` : "";
  const tipoKey = `_${tipoCaja.toLowerCase()}`;

  const KEY_CELDAS = `paquete_en_curso${userKey}${tipoKey}`;
  const KEY_HU = `hu_actual${userKey}${tipoKey}`;
  const KEY_FECHA = `fecha_inicio${userKey}${tipoKey}`;

  const limiteActivo =
    tipoCaja === TIPOS_CAJA.DEFECTUOSA
      ? config.limite_defectuosa
      : tipoCaja === TIPOS_CAJA.CADUCIDAD_PROXIMA
        ? config.limite_caducidad_proxima
        : config.limite_caja;

  useEffect(() => {
    if (!usuario) {
      // Si no hay usuario (estamos en login), limpiamos la memoria del hook
      setCeldas([]);
      setHuActual("");
      setFechaInicio(null);
      return;
    }

    // Intentamos leer del LocalStorage PERSONALIZADO de este usuario
    const savedCeldas = localStorage.getItem(KEY_CELDAS);

    const savedHu = localStorage.getItem(KEY_HU);
    const savedFecha = localStorage.getItem(KEY_FECHA);

    if (savedCeldas) {
      try {
        setCeldas(JSON.parse(savedCeldas));
      } catch (error) {
        console.error("Datos locales corruptos, reiniciando caja:", error);
        localStorage.removeItem(KEY_CELDAS); // Autocuración
        setCeldas([]);
      }
    } else {
      setCeldas([]); // Si es un usuario nuevo, empezamos limpio
    }

    if (savedHu) setHuActual(savedHu);
    else setHuActual("");

    if (savedFecha) setFechaInicio(savedFecha);
    else setFechaInicio(null);
  }, [usuario, KEY_CELDAS, KEY_HU, KEY_FECHA]);

  // --- PERSISTENCIA (useEffect) --
  useEffect(() => {
    if (usuario) {
      localStorage.setItem(KEY_CELDAS, JSON.stringify(celdas));
    }
  }, [celdas, usuario, KEY_CELDAS]); // Añadimos 'usuario' a dependencias

  useEffect(() => {
    if (usuario) {
      localStorage.setItem(KEY_HU, huActual);
    }
  }, [huActual, usuario, KEY_HU]);

  useEffect(() => {
    if (usuario) {
      if (fechaInicio) localStorage.setItem(KEY_FECHA, fechaInicio);
      else localStorage.removeItem(KEY_FECHA);
    }
  }, [fechaInicio, usuario, KEY_FECHA]);

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
      total_celdas % config.level_size === 0 && total_celdas < limiteActivo;
    const numeroNivel = Math.floor(total_celdas / config.level_size);

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
    setCeldaInput(""); // Limpia el input de pieza
    setCeldas([]); // <--- ESTA ES LA CLAVE: vacía el array de la tabla
    setIdGuardado(null); // Quita el modal de éxito
  };

  const enviarDatos = async () => {
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

    setEnviando(true);
    try {
      // Mapeo para el Backend
      const payload = {
        usuario_id: usuario,
        fecha_inicio: fechaInicio || new Date().toISOString(),
        fecha_fin: new Date().toISOString(),
        is_defective: tipoCaja === TIPOS_CAJA.DEFECTUOSA,
        tipo_caja: tipoCaja,
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

      await refrescarListaNegra();

      // Reset
      setCeldas([]);
      setFechaInicio(null);
      setHuActual("");
      localStorage.removeItem(KEY_CELDAS);
      localStorage.removeItem(KEY_HU);
      localStorage.removeItem(KEY_FECHA);
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
    celdaInput,
    setCeldaInput,
    celdas,
    enviando,
    idGuardado,
    resetProceso,
    agregarCelda,
    borrarCelda,
    borrarDesde,
    enviarDatos,
    limite: limiteActivo,
    limite_normal: config.limite_caja,
    limite_defectuosas: config.limite_defectuosa,
    limite_caducidad_proxima: config.limite_caducidad_proxima,
    level_size: config.level_size,
  };
};
