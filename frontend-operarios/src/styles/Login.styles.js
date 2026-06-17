import { TIPOS_CAJA } from "../services/validarCeldaPorTipoCaja";

export const LOGIN_UI = {
  [TIPOS_CAJA.NORMAL]: {
    fondoGlobal: "#f0f4f8",
    bordeTop: "8px solid #3498db",
    borderImage: "none",
    tituloColor: "#2c3e50",
    textoColor: "#95a5a6",
    botonBg: "#3498db",
    botonSombraHover: "rgba(52, 152, 219, 0.4)",
    icono: "👤",
    cardShadow: "0 20px 40px rgba(0, 0, 0, 0.08)",
    inputFocusBorder: "#3498db",
    titulo: "ACCESO OPERARIO VÁLIDAS",
    subtitulo: "Introduce tu ID para iniciar el turno.",
    placeholder: "ID NUMÉRICO",
    botonTexto: "Conectar",
    avisoInferior: null,
    patternColor: null,
  },

  [TIPOS_CAJA.DEFECTUOSA]: {
    fondoGlobal: "#f5eaea",
    bordeTop: "12px solid transparent",
    borderImage:
      "repeating-linear-gradient(45deg, #c0392b, #c0392b 20px, #f1f2f6 20px, #f1f2f6 40px) 1",
    tituloColor: "#c0392b",
    textoColor: "#7f8c8d",
    botonBg: "#c0392b",
    botonSombraHover: "rgba(192, 57, 43, 0.4)",
    icono: "🛑",
    cardShadow: "0 20px 40px rgba(192, 57, 43, 0.15)",
    inputFocusBorder: "#c0392b",
    titulo: "ACCESO OPERARIO DEFECTUOSAS",
    subtitulo: "Zona de control de material no conforme.",
    placeholder: "ID AUTORIZADO",
    botonTexto: "Confirmar Acceso",
    avisoInferior: "⚠️ Atención: Modo de registro de merma activo",
    patternColor: "#c0392b",
  },

  [TIPOS_CAJA.CADUCIDAD_PROXIMA]: {
    fondoGlobal: "#fff7ed",
    bordeTop: "8px solid #f39c12",
    borderImage: "none",
    tituloColor: "#f39c12",
    textoColor: "#7f8c8d",
    botonBg: "#f39c12",
    botonSombraHover: "rgba(243, 156, 18, 0.4)",
    icono: "⏳",
    cardShadow: "0 20px 40px rgba(243, 156, 18, 0.15)",
    inputFocusBorder: "#f39c12",
    titulo: "ACCESO CADUCIDAD PRÓXIMA",
    subtitulo: "Zona de registro de celdas con caducidad próxima.",
    placeholder: "ID AUTORIZADO",
    botonTexto: "Confirmar Acceso",
    avisoInferior: "⏳ Atención: Modo de registro de caducidad próxima activo",
    patternColor: "#f39c12",
  },
};

export const getLoginUI = (tipoCaja) => {
  return LOGIN_UI[tipoCaja] || LOGIN_UI[TIPOS_CAJA.NORMAL];
};

export const getLoginStyles = ({ tema, tieneModoEspecial, isHover }) => ({
  wrapper: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tema.fondoGlobal,
    fontFamily: "'Segoe UI', Roboto, Helvetica, sans-serif",
    transition: "background 0.3s ease",
    position: "relative",
    overflow: "hidden",
  },

  backgroundPattern:
    tieneModoEspecial && tema.patternColor
      ? {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.06,
          backgroundImage: `radial-gradient(${tema.patternColor} 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }
      : {},

  box: {
    width: "100%",
    maxWidth: "420px",
    padding: "45px",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow: tema.cardShadow,
    borderTop: tema.bordeTop,
    borderImage: tema.borderImage,
    textAlign: "center",
    zIndex: 1,
    border: tieneModoEspecial ? "1px solid #eee" : "none",
  },

  icono: {
    fontSize: "4rem",
    marginBottom: "0px",
    lineHeight: 1,
  },

  title: {
    margin: "15px 0 10px 0",
    color: tema.tituloColor,
    fontSize: "2.2rem",
    fontWeight: "800",
    letterSpacing: "-1px",
  },

  subtitle: {
    margin: "0 0 40px 0",
    color: tema.textoColor,
    fontSize: "1.05rem",
    lineHeight: "1.5",
  },

  selectorGroup: {
    width: "100%",
    textAlign: "left",
    marginBottom: "18px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    color: tema.tituloColor,
    fontWeight: "800",
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },

  select: {
    width: "100%",
    padding: "16px",
    fontSize: "1rem",
    borderRadius: "12px",
    border: "2px solid #e1e8ed",
    outline: "none",
    color: "#2c3e50",
    backgroundColor: "#fff",
    boxSizing: "border-box",
    fontWeight: "700",
  },
  input: {
    width: "100%",
    padding: "18px",
    fontSize: "1.3rem",
    borderRadius: "12px",
    border: "2px solid #e1e8ed",
    outline: "none",
    textAlign: "center",
    color: "#2c3e50",
    backgroundColor: "#fff",
    boxSizing: "border-box",
    transition: "all 0.3s ease",
    fontWeight: "600",
    letterSpacing: "1px",
  },

  button: {
    width: "100%",
    padding: "20px",
    fontSize: "1.1rem",
    fontWeight: "900",
    color: "#fff",
    backgroundColor: tema.botonBg,
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: "2px",
    marginTop: "25px",
    transition: "all 0.3s ease",
    transform: isHover ? "translateY(-3px)" : "none",
    boxShadow: isHover ? `0 10px 20px -5px ${tema.botonSombraHover}` : "none",
  },

  avisoInferior: {
    position: "absolute",
    bottom: 20,
    color: tema.tituloColor,
    opacity: 0.7,
    fontWeight: 600,
    zIndex: 1,
  },
});
