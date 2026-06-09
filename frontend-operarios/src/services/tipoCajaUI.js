import { TIPOS_CAJA } from "./validarCeldaPorTipoCaja";

export const TIPO_CAJA_UI = {
  [TIPOS_CAJA.NORMAL]: {
    label: "VÁLIDAS",
    tituloLogin: "ACCESO OPERARIO VÁLIDAS",
    subtituloLogin: "Introduce tu ID para iniciar el turno.",
    tituloPanel: "📥 Entrada de Datos",
    modoBanner: "MODO: REGISTRO DE CELDAS VÁLIDAS",
    tituloModal: "✅ CAJA CERRADA",
    textoBotonFinalizar: "✅ FINALIZAR",
    colorPrincipal: "#3498db",
    fondoLogin: "#f0f4f8",
    icono: "👤",
    documentTitle: "Etiqueta_NORMAL",
  },

  [TIPOS_CAJA.DEFECTUOSA]: {
    label: "DEFECTUOSAS",
    tituloLogin: "ACCESO OPERARIO DEFECTUOSAS",
    subtituloLogin: "Zona de control de material no conforme.",
    tituloPanel: "🗑️ Escaneo de Datos defectuosos",
    modoBanner: "MODO: REGISTRO DE DEFECTUOSOS",
    tituloModal: "⚠️ CAJA DEFECTUOSA CERRADA",
    textoBotonFinalizar: "⚠️ FINALIZAR SCRAP",
    colorPrincipal: "#c0392b",
    fondoLogin: "#f5eaea",
    icono: "🛑",
    documentTitle: "Etiqueta_DEFECTUOSA",
  },

  [TIPOS_CAJA.CADUCIDAD_PROXIMA]: {
    label: "CADUCIDAD PRÓXIMA",
    tituloLogin: "ACCESO CADUCIDAD PRÓXIMA",
    subtituloLogin: "Zona de registro de celdas con caducidad próxima.",
    tituloPanel: "⏳ Escaneo caducidad próxima",
    modoBanner: "MODO: REGISTRO DE CADUCIDAD PRÓXIMA",
    tituloModal: "⏳ CAJA CADUCIDAD PRÓXIMA CERRADA",
    textoBotonFinalizar: "⏳ FINALIZAR CADUCIDAD",
    colorPrincipal: "#f39c12",
    fondoLogin: "#fff7ed",
    icono: "⏳",
    documentTitle: "Etiqueta_CADUCIDAD_PROXIMA",
  },
};

export const getTipoCajaUI = (tipoCaja) => {
  return TIPO_CAJA_UI[tipoCaja] || TIPO_CAJA_UI[TIPOS_CAJA.NORMAL];
};
