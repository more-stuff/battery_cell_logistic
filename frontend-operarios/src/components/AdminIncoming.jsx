import { useState } from "react";
import { actualizarIncoming } from "../services/api"; // <--- IMPORTACIÓN DE LA API

export const AdminIncoming = () => {
  // Función auxiliar para obtener la hora actual en formato compatible con input (YYYY-MM-DDTHH:mm)

  // ESTADO DEL FORMULARIO
  const [formData, setFormData] = useState({
    hu_entrada: "",
    fecha_recibo: "",
    awb_swb: "",
    np_packing_list: "",
    fecha_caducidad: "",
  });

  const [loading, setLoading] = useState(false);

  // Manejador de cambios en los inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ENVÍO DEL FORMULARIO
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación básica
    if (!formData.hu_entrada.trim()) {
      alert("⚠️ EL HU DE ENTRADA ES OBLIGATORIO");
      return;
    }

    setLoading(true);
    try {
      // 🚀 LLAMADA A LA API (SEPARADA)
      const respuesta = await actualizarIncoming(formData);

      // Feedback usuario
      alert(respuesta.mensaje);

      // Limpiamos formulario manteniendo la hora actualizada
      setFormData({
        hu_entrada: "",
        fecha_recibo: "",
        awb_swb: "",
        np_packing_list: "",
        fecha_caducidad: "",
      });
    } catch (error) {
      console.error(error);
      alert("❌ ERROR: No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.card}>
        <h2
          style={{
            color: "#2c3e50",
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          🏢 REGISTRO DE ENTRADA (INCOMING)
        </h2>

        <form onSubmit={handleSubmit} style={estilos.form}>
          {/* 1. HU (CAMPO PRINCIPAL) */}
          <div style={estilos.grupo}>
            <label style={{ ...estilos.label, color: "#e74c3c" }}>
              * HU PROVEEDOR (Obligatorio)
            </label>
            <input
              name="hu_entrada"
              value={formData.hu_entrada}
              onChange={handleChange}
              placeholder="Escanear código..."
              style={{
                ...estilos.input,
                border: "2px solid #e74c3c",
                background: "#fff5f5",
              }}
              autoFocus
            />
          </div>

          <hr
            style={{
              margin: "15px 0",
              border: "0",
              borderTop: "1px solid #eee",
            }}
          />

          <div style={estilos.grid}>
            {/* 2. FECHA RECIBO (CON HORA) */}
            <div style={estilos.grupo}>
              <label style={estilos.label}>📅 Fecha y Hora Recibo</label>
              <input
                type="datetime-local" // <--- Selector de Fecha + Hora
                name="fecha_recibo"
                value={formData.fecha_recibo}
                onChange={handleChange}
                style={estilos.input}
              />
            </div>

            {/* 3. FECHA CADUCIDAD (SOLO FECHA) */}
            <div style={estilos.grupo}>
              <label style={estilos.label}>⏳ Fecha Caducidad</label>
              <input
                type="date" // <--- Selector solo de Fecha
                name="fecha_caducidad"
                value={formData.fecha_caducidad}
                onChange={handleChange}
                style={estilos.input}
              />
            </div>

            {/* 4. EXTRAS */}
            <div style={estilos.grupo}>
              <label style={estilos.label}>📝 AWB / SWB</label>
              <input
                type="text"
                name="awb_swb"
                value={formData.awb_swb}
                onChange={handleChange}
                placeholder="Opcional"
                style={estilos.input}
              />
            </div>

            <div style={estilos.grupo}>
              <label style={estilos.label}>📄 NP Packing List</label>
              <input
                type="text"
                name="np_packing_list"
                value={formData.np_packing_list}
                onChange={handleChange}
                placeholder="Opcional"
                style={estilos.input}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} style={estilos.boton}>
            {loading ? "GUARDANDO..." : "💾 CONFIRMAR DATOS"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ESTILOS CSS-IN-JS
const estilos = {
  contenedor: {
    minHeight: "100vh",
    background: "#ecf0f1",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial",
  },
  card: {
    background: "white",
    width: "100%",
    maxWidth: "700px",
    padding: "40px",
    borderRadius: "10px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
  },
  form: { display: "flex", flexDirection: "column", gap: "25px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  grupo: { display: "flex", flexDirection: "column", gap: "5px" },
  label: { fontWeight: "bold", fontSize: "0.9rem", color: "#34495e" },
  input: {
    padding: "12px",
    border: "1px solid #bdc3c7",
    borderRadius: "5px",
    fontSize: "1rem",
  },
  boton: {
    padding: "15px",
    background: "#2980b9",
    color: "white",
    border: "none",
    borderRadius: "5px",
    fontWeight: "bold",
    fontSize: "1.1rem",
    cursor: "pointer",
    transition: "0.3s",
  },
};
