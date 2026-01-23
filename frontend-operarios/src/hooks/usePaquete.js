import { useState, useEffect } from "react";
import { enviarPaquete, obtenerConfiguracion } from "../services/api";
import Swal from "sweetalert2";

export const usePaquete = (usuario) => {
  const [config, setConfig] = useState({
    alerta_cada: 15, // Valor por defecto si falla la red
    limite_caja: 180, // Valor por defecto
  });

  const [huActual, setHuActual] = useState("");
  const [celdaInput, setCeldaInput] = useState("");
  const [celdas, setCeldas] = useState([]);
  const [fechaInicio, setFechaInicio] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [idGuardado, setIdGuardado] = useState(null); //  Para guardar el ID que nos devuelve el servidor

  useEffect(() => {
    const cargarDatosBackend = async () => {
      console.log("🔄 Cargando configuración desde Backend...");
      try {
        const datos = await obtenerConfiguracion();
        // Si todo va bien, actualizamos el estado con lo que diga la base de datos
        setConfig({
          alerta_cada: Number(datos.alerta_cada),
          limite_caja: Number(datos.limite_caja),
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
  }, []);

  // gestion del localstorage
  const userKey = usuario ? `_${usuario}` : "";

  const KEY_CELDAS = `paquete_en_curso${userKey}`;
  const KEY_HU = `hu_actual${userKey}`;
  const KEY_FECHA = `fecha_inicio${userKey}`;

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
      setCeldas(JSON.parse(savedCeldas));
    } else {
      setCeldas([]); // Si es un usuario nuevo, empezamos limpio
    }

    if (savedHu) setHuActual(savedHu);
    else setHuActual("");

    if (savedFecha) setFechaInicio(savedFecha);
    else setFechaInicio(null);
  }, [usuario]);

  // --- PERSISTENCIA (useEffect) --
  useEffect(() => {
    if (usuario) {
      localStorage.setItem(KEY_CELDAS, JSON.stringify(celdas));
    }
  }, [celdas, usuario]); // Añadimos 'usuario' a dependencias

  useEffect(() => {
    if (usuario) {
      localStorage.setItem(KEY_HU, huActual);
    }
  }, [huActual, usuario]);

  useEffect(() => {
    if (usuario) {
      if (fechaInicio) localStorage.setItem(KEY_FECHA, fechaInicio);
      else localStorage.removeItem(KEY_FECHA);
    }
  }, [fechaInicio, usuario]);

  // --- ACCIONES ---

  const agregarCelda = () => {
    // 1. VALIDACIONES BÁSICAS
    if (!huActual)
      return {
        error: "⚠️ Introduce el HU de la caja primero.",
        type: "short_error",
      };
    if (!celdaInput) return;
    if (celdaInput.length < 6)
      return {
        error: "⚠️ Código muy corto (Faltan datos).",
        type: "short_error",
      };
    if (celdas.length >= config.limite_caja)
      return { error: "📦 Paquete lleno.", type: "duplicate_error" };

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

    // 4. GUARDAR
    const nuevaCelda = {
      id: Date.now(),
      codigo_celda: celdaInput,
      hu_asociado: huActual,
      fecha_caducidad: fechaFormateada,
      es_revision: (celdas.length + 1) % config.alerta_cada === 0,
      timestamp: new Date().toISOString(),
    };

    const nuevasCeldas = [...celdas, nuevaCelda];
    setCeldas(nuevasCeldas);
    setCeldaInput("");

    // Alerta preventiva
    const siguientePieza = nuevasCeldas.length + 1;
    const requiereRevision =
      siguientePieza % config.alerta_cada === 0 &&
      siguientePieza <= config.limite_caja;

    return {
      success: true,
      revision: requiereRevision, // true o false
      numeroPieza: siguientePieza, // Para mostrarlo en la alerta
    };
  };

  const borrarCelda = (index) => {
    const nuevas = celdas.filter((_, i) => i !== index);
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
    if (celdas.length < config.limite_paquete) {
      //if (celdas.length < 1) {
      // por seguridad pero no le va a dejar igualmente
      const faltantes = config.limite_paquete - celdas.length;

      Swal.fire({
        icon: "error",
        title: "⛔ CAJA INCOMPLETA",
        text: `No se puede cerrar la caja. Faltan ${faltantes} piezas para llegar a ${config.limite_paquete}.`,
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
        celdas: celdas.map((c) => ({
          dmc_code: c.codigo_celda,
          fecha_caducidad: c.fecha_caducidad,
          hu_origen: c.hu_asociado,
        })),
      };

      const respuesta = await enviarPaquete(payload);
      console.log("RESPUESTA DEL SERVIDOR:", respuesta);
      // ÉXITO: Guardamos el ID para mostrarlo en el modal
      setIdGuardado(respuesta.id_temporal);

      // Reset
      setCeldas([]);
      setFechaInicio(null);
      setHuActual("");
      localStorage.removeItem("paquete_en_curso");
      localStorage.removeItem("fecha_inicio_paquete");
    } catch (error) {
      Swal.fire({
        title: "Error de Servidor",
        text: "No se pudieron enviar los datos. Inténtalo de nuevo.",
        icon: "error",
      });
      console.error(error);
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
    //alertaRevision,
    //setAlertaRevision,
    enviando,
    idGuardado,
    resetProceso,
    agregarCelda,
    borrarCelda,
    enviarDatos,
    limite: config.limite_caja,
  };
};
