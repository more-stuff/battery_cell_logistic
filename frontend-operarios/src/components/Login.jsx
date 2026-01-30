import React, { useState } from "react";

export default function Login({
  usuario,
  setUsuario,
  onLogin,
  esDefectuoso = false,
}) {
  const [isHover, setIsHover] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (usuario.trim().length > 0) {
      onLogin();
    }
  };

  // --- CONFIGURACIÓN DE TEMAS ---
  const tema = esDefectuoso
    ? {
        // MODO SCRAP: Industrial de Advertencia
        // CAMBIO AQUÍ: Un tono más oscuro y perceptible (gris rojizo cálido)
        fondoGlobal: "#f5eaea",

        // Borde superior de cinta de precaución a rayas
        bordeTop: "12px solid transparent",
        borderImage:
          "repeating-linear-gradient(45deg, #c0392b, #c0392b 20px, #f1f2f6 20px, #f1f2f6 40px) 1",
        tituloColor: "#c0392b", // Rojo profesional
        textoColor: "#7f8c8d",
        botonBg: "#c0392b",
        botonSombraHover: "rgba(192, 57, 43, 0.4)",
        icono: "🛑", // Icono de Stop/Precaución
        // Sombra de la tarjeta con un tinte rojizo
        cardShadow: "0 20px 40px rgba(192, 57, 43, 0.15)",
        inputFocusBorder: "#c0392b",
      }
    : {
        // MODO NORMAL: Limpio Corporativo
        fondoGlobal: "#f0f4f8", // Gris azulado claro
        bordeTop: "8px solid #3498db", // Azul sólido
        borderImage: "none",
        tituloColor: "#2c3e50",
        textoColor: "#95a5a6",
        botonBg: "#3498db",
        botonSombraHover: "rgba(52, 152, 219, 0.4)",
        icono: "👤", // Icono de usuario
        cardShadow: "0 20px 40px rgba(0, 0, 0, 0.08)",
        inputFocusBorder: "#3498db",
      };

  // --- ESTILOS JS ---
  const styles = {
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
    // Un fondo sutil para darle textura (opcional)
    backgroundPattern: esDefectuoso
      ? {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.06, // Un pelín más de opacidad al patrón también
          backgroundImage: "radial-gradient(#c0392b 1px, transparent 1px)",
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
      // Aplicamos el borde especial
      borderTop: tema.bordeTop,
      borderImage: tema.borderImage,
      textAlign: "center",
      zIndex: 1,
      border: esDefectuoso ? "1px solid #eee" : "none", // Borde lateral sutil en scrap
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
  };

  return (
    <div style={styles.wrapper}>
      {/* Capa de patrón de fondo sutil para scrap */}
      <div style={styles.backgroundPattern}></div>

      <div style={styles.box}>
        <div style={{ fontSize: "4rem", marginBottom: "0px", lineHeight: 1 }}>
          {tema.icono}
        </div>

        <h2 style={styles.title}>
          {esDefectuoso
            ? "ACCESO OPERARIO DEFETUOSAS"
            : "ACCESO OPERARIO VÁLIDAS"}
        </h2>

        <p style={styles.subtitle}>
          {esDefectuoso
            ? "Zona de control de material no conforme."
            : "Introduce tu ID para iniciar el turno."}
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={esDefectuoso ? "ID AUTORIZADO" : "ID NUMÉRICO"}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            style={styles.input}
            autoFocus
            // Cambiamos el color del borde al hacer foco según el modo
            onFocus={(e) =>
              (e.target.style.borderColor = tema.inputFocusBorder)
            }
            onBlur={(e) => (e.target.style.borderColor = "#e1e8ed")}
          />
          <button
            type="submit"
            style={styles.button}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
          >
            {esDefectuoso ? "Confirmar Acceso" : "Conectar"}
          </button>
        </form>
      </div>

      {/* Aviso inferior discreto */}
      {esDefectuoso && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            color: "#c0392b",
            opacity: 0.7,
            fontWeight: 600,
            zIndex: 1,
          }}
        >
          ⚠️ Atención: Modo de registro de merma activo
        </div>
      )}
    </div>
  );
}
