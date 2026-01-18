import { useState, useRef } from "react";
import { guardarUbicacion } from "../services/api";

export const Carretillero = () => {
  const [idCaja, setIdCaja] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const ubicacionRef = useRef(null);
  const idRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idCaja.trim() || !ubicacion.trim()) {
      alert("⚠️ FALTAN DATOS");
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        id_temporal: idCaja,
        ubicacion: ubicacion,
      };

      await guardarUbicacion(payload);

      // Feedback visual (opcional: podrías usar un toast, pero el alert es efectivo aquí)
      alert(
        `✅ GUARDADO CORRECTAMENTE\nCaja: ${idCaja} -> Ubicación: ${ubicacion}`,
      );

      setIdCaja("");
      setUbicacion("");
      if (idRef.current) idRef.current.focus();
    } catch (error) {
      console.error(error);
      alert("❌ ERROR. Revisa que el ID de la caja exista en el sistema.");
    } finally {
      setEnviando(false);
    }
  };

  const handleEnterID = (e) => {
    if (e.key === "Enter" && idCaja) {
      e.preventDefault();
      ubicacionRef.current.focus();
    }
  };

  return (
    <div style={estilos.fondo}>
      <div style={estilos.card}>
        {/* Título con Icono */}
        <div style={estilos.header}>
          <span style={{ fontSize: "3rem" }}>🚜</span>
          <h1 style={estilos.titulo}>UBICACIÓN</h1>
        </div>

        <form onSubmit={handleSubmit} style={estilos.form}>
          {/* GRUPO 1: ID */}
          <div style={estilos.grupoInput}>
            <label style={estilos.label}>1. ID ETIQUETA (TMP)</label>
            <input
              ref={idRef}
              type="text"
              value={idCaja}
              onChange={(e) => setIdCaja(e.target.value)}
              onKeyDown={handleEnterID}
              placeholder="ESCANEAR..."
              autoFocus
              style={estilos.input}
            />
          </div>

          {/* GRUPO 2: UBICACIÓN */}
          <div style={estilos.grupoInput}>
            <label style={estilos.label}>2. ESTANTERÍA / CALLE</label>
            <input
              ref={ubicacionRef}
              type="text"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="ESCANEAR..."
              style={estilos.input}
            />
          </div>

          {/* BOTÓN GRANDE */}
          <button
            type="submit"
            disabled={enviando}
            style={{
              ...estilos.boton,
              background: enviando ? "#95a5a6" : "#e67e22",
              cursor: enviando ? "not-allowed" : "pointer",
              transform: enviando ? "scale(0.98)" : "scale(1)",
            }}
          >
            {enviando ? "⏳ GUARDANDO..." : "💾 CONFIRMAR"}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- ESTILOS CORREGIDOS ---
const estilos = {
  fondo: {
    height: "100vh",
    width: "100vw",
    backgroundColor: "#2c3e50",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    padding: "20px", // Evita que la tarjeta toque los bordes en móviles
    boxSizing: "border-box",
  },
  card: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "15px",
    width: "100%",
    maxWidth: "500px", // Ancho máximo controlado
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  header: {
    textAlign: "center",
    marginBottom: "10px",
    borderBottom: "2px solid #eee",
    paddingBottom: "20px",
  },
  titulo: {
    margin: "10px 0 0 0",
    color: "#e67e22",
    fontSize: "2rem",
    textTransform: "uppercase",
    letterSpacing: "2px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "30px", // Espacio vertical entre los inputs
  },
  grupoInput: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    textAlign: "left",
  },
  label: {
    fontWeight: "bold",
    fontSize: "1rem",
    color: "#7f8c8d",
    textTransform: "uppercase",
    marginLeft: "5px",
  },
  input: {
    width: "100%", // Ocupa todo el ancho disponible
    boxSizing: "border-box", // <--- ¡CLAVE! Esto arregla el desbordamiento
    padding: "15px 20px",
    fontSize: "1.8rem", // Letra grande y legible
    textAlign: "center",
    border: "2px solid #bdc3c7",
    borderRadius: "10px",
    outline: "none",
    textTransform: "uppercase",
    fontWeight: "bold",
    color: "#2c3e50",
    backgroundColor: "#ecf0f1",
    transition: "border-color 0.3s",
  },
  boton: {
    width: "100%",
    padding: "20px",
    fontSize: "1.5rem",
    fontWeight: "900",
    color: "white",
    border: "none",
    borderRadius: "10px",
    marginTop: "10px",
    boxShadow: "0 5px 15px rgba(230, 126, 34, 0.4)",
    transition: "all 0.2s ease",
  },
};
