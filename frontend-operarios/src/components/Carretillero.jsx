import { useState, useRef } from "react";
import Swal from "sweetalert2"; // <--- IMPORTANTE
import { guardarUbicacion } from "../services/api";

export const Carretillero = () => {
  const [idCaja, setIdCaja] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const ubicacionRef = useRef(null);
  const idRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. VALIDACIÓN (WARNING)
    if (!idCaja.trim() || !ubicacion.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Faltan datos",
        text: "⚠️ Debes escanear tanto la CAJA como la UBICACIÓN.",
        confirmButtonColor: "#e67e22",
      });
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        id_temporal: idCaja,
        ubicacion: ubicacion,
      };

      await guardarUbicacion(payload);

      // 2. ÉXITO (SUCCESS)
      // Usamos un timer para que se cierre sola y pueda seguir trabajando rápido
      await Swal.fire({
        icon: "success",
        title: "¡Ubicada!",
        html: `Caja: <b>${idCaja}</b><br>Ubicación: <b>${ubicacion}</b>`,
        timer: 1500,
        showConfirmButton: false,
      });

      // Limpieza y foco
      setIdCaja("");
      setUbicacion("");
      if (idRef.current) idRef.current.focus();
    } catch (error) {
      console.error(error);

      // 3. ERROR (ERROR)
      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: "❌ Revisa que el ID de la caja exista en el sistema.",
      });
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
    padding: "20px",
    boxSizing: "border-box",
  },
  card: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "15px",
    width: "100%",
    maxWidth: "500px",
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
    gap: "30px",
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
    width: "100%",
    boxSizing: "border-box",
    padding: "15px 20px",
    fontSize: "1.8rem",
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
