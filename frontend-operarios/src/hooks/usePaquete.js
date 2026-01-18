import { useState, useEffect } from "react";
import { enviarPaquete } from "../services/api";

const CONFIGURACION = {
  limite_paquete: 180,
  alerta_cada: 15,
};

export const usePaquete = (usuario) => {
  const [huActual, setHuActual] = useState("");
  const [celdaInput, setCeldaInput] = useState("");
  const [celdas, setCeldas] = useState([]);
  const [fechaInicio, setFechaInicio] = useState(null);
  const [alertaRevision, setAlertaRevision] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // NUEVO ESTADO: Para guardar el ID que nos devuelve el servidor
  const [idGuardado, setIdGuardado] = useState(null);

  // --- PERSISTENCIA (useEffect) ---
  useEffect(() => {
    const backupCeldas = localStorage.getItem("paquete_en_curso");
    if (backupCeldas) setCeldas(JSON.parse(backupCeldas));

    const backupHU = localStorage.getItem("hu_actual_persistente");
    if (backupHU) setHuActual(backupHU);

    const backupInicio = localStorage.getItem("fecha_inicio_paquete");
    if (backupInicio) setFechaInicio(backupInicio);
  }, []);

  useEffect(() => {
    localStorage.setItem("paquete_en_curso", JSON.stringify(celdas));
  }, [celdas]);

  useEffect(() => {
    localStorage.setItem("hu_actual_persistente", huActual);
  }, [huActual]);

  useEffect(() => {
    if (fechaInicio) localStorage.setItem("fecha_inicio_paquete", fechaInicio);
    else localStorage.removeItem("fecha_inicio_paquete");
  }, [fechaInicio]);

  // --- ACCIONES ---

  const agregarCelda = () => {
    // 1. VALIDACIONES BÁSICAS
    if (!huActual) return { error: "⚠️ Introduce el HU de la caja primero." };
    if (!celdaInput) return;
    if (celdaInput.length < 6)
      return { error: "⚠️ Código muy corto (Faltan datos)." };
    if (celdas.length >= CONFIGURACION.limite_paquete)
      return { error: "📦 Paquete lleno." };

    // Evitar duplicados
    if (celdas.some((c) => c.codigo_celda === celdaInput)) {
      setCeldaInput("");
      return { error: "⛔ Pieza YA escaneada anteriormente." };
    }

    // 2. EXTRACCIÓN Y VALIDACIÓN DE FECHA (¡NUEVO!)
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
      es_revision: (celdas.length + 1) % CONFIGURACION.alerta_cada === 0,
      timestamp: new Date().toISOString(),
    };

    const nuevasCeldas = [...celdas, nuevaCelda];
    setCeldas(nuevasCeldas);
    setCeldaInput("");

    // Alerta preventiva
    const siguientePieza = nuevasCeldas.length + 1;
    if (
      siguientePieza % CONFIGURACION.alerta_cada === 0 &&
      siguientePieza <= CONFIGURACION.limite_paquete
    ) {
      setAlertaRevision(true);
    }

    return { success: true };
  };

  const borrarCelda = (index) => {
    if (confirm("¿Borrar lectura?")) {
      const nuevas = celdas.filter((_, i) => i !== index);
      setCeldas(nuevas);
      if (nuevas.length === 0) setFechaInicio(null);
    }
  };

  const resetProceso = () => {
    setHuActual(""); // Limpia el input de caja
    setCeldaInput(""); // Limpia el input de pieza
    setCeldas([]); // <--- ESTA ES LA CLAVE: vacía el array de la tabla
    setIdGuardado(null); // Quita el modal de éxito
  };

  const enviarDatos = async () => {
    if (celdas.length < CONFIGURACION.limite_paquete) {
      if (!confirm("⚠️ Paquete incompleto. ¿Enviar igual?")) return;
    }

    setEnviando(true);
    try {
      // Mapeo para el Backend
      const payload = {
        usuario_id: parseInt(usuario) || 1,
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

      alert(`✅ GUARDADO. ETIQUETA: ${respuesta.id_temporal}`);
    } catch (error) {
      alert("❌ Error enviando datos al servidor");
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
    alertaRevision,
    setAlertaRevision,
    enviando,
    idGuardado,
    resetProceso,
    agregarCelda,
    borrarCelda,
    enviarDatos,
    limite: CONFIGURACION.limite_paquete,
  };
};
