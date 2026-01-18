import { useState } from "react";
import { registrarSalida } from "../services/api";

export const AdminOutbound = () => {
  // Función para obtener fecha y hora actual local
  const getNowString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    id_temporal: "",
    hu_silena: "",
    numero_salida: "",
    handling_unit: "",
    fecha_envio: getNowString(),
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id_temporal.trim()) {
      alert("⚠️ EL ID TEMPORAL ES OBLIGATORIO");
      return;
    }

    setLoading(true);
    try {
      const respuesta = await registrarSalida(formData);
      alert(respuesta.mensaje);
      setFormData({
        id_temporal: "",
        hu_silena: "",
        numero_salida: "",
        handling_unit: "",
        fecha_envio: getNowString(),
      });
    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 404) {
        alert("❌ ID NO ENCONTRADO");
      } else {
        alert("❌ Error de conexión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    // 1. CONTENEDOR PRINCIPAL (Para centrar en pantalla)
    <div style={estilos.wrapper}>
      {/* 2. TARJETA BLANCA */}
      <div style={estilos.card}>
        {/* ENCABEZADO */}
        <div style={estilos.header}>
          <span style={{ fontSize: "2.5rem" }}>🚚</span>
          <h2 style={estilos.titulo}>REGISTRO DE SALIDA</h2>
          <p style={{ margin: 0, color: "#95a5a6" }}>
            Completa los datos de envío final
          </p>
        </div>

        <form onSubmit={handleSubmit} style={estilos.form}>
          {/* SECCIÓN 1: ID OBLIGATORIO (ANCHO COMPLETO) */}
          <div style={estilos.grupoFull}>
            <label style={{ ...estilos.label, color: "#e67e22" }}>
              * ID CAJA (TMP-...) - OBLIGATORIO
            </label>
            <input
              name="id_temporal"
              value={formData.id_temporal}
              onChange={handleChange}
              placeholder="Escanea el código aquí..."
              style={{
                ...estilos.input,
                border: "2px solid #e67e22",
                background: "#fffbf5",
              }}
              autoFocus
            />
          </div>

          {/* SECCIÓN 2: GRID DE DATOS (2 COLUMNAS) */}
          <div style={estilos.grid}>
            <div style={estilos.grupo}>
              <label style={estilos.label}>📦 HU Silena Outbound</label>
              <input
                type="text"
                name="hu_silena"
                value={formData.hu_silena}
                onChange={handleChange}
                placeholder="Ej: SIL-998877"
                style={estilos.input}
              />
            </div>

            <div style={estilos.grupo}>
              <label style={estilos.label}>📄 Nº Salida / Delivery</label>
              <input
                type="text"
                name="numero_salida"
                value={formData.numero_salida}
                onChange={handleChange}
                placeholder="Ej: DEL-2024-55"
                style={estilos.input}
              />
            </div>

            <div style={{ ...estilos.grupo, gridColumn: "1 / -1" }}>
              {" "}
              {/* Ocupa ancho completo */}
              <label style={estilos.label}>🏷️ Handling Unit Final</label>
              <input
                type="text"
                name="handling_unit"
                value={formData.handling_unit}
                onChange={handleChange}
                placeholder="Ej: FINAL-001"
                style={estilos.input}
              />
            </div>

            {/* FECHA ENVÍO (ANCHO COMPLETO) */}
            <div style={{ ...estilos.grupo, gridColumn: "1 / -1" }}>
              <label style={estilos.label}>🚀 Fecha y Hora de Envío</label>
              <input
                type="datetime-local"
                name="fecha_envio"
                value={formData.fecha_envio}
                onChange={handleChange}
                style={estilos.input}
              />
            </div>
          </div>

          {/* BOTÓN */}
          <button type="submit" disabled={loading} style={estilos.boton}>
            {loading ? "GUARDANDO..." : "💾 CONFIRMAR SALIDA"}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- ESTILOS MEJORADOS ---
const estilos = {
  // 1. Wrapper que ocupa todo el alto disponible y centra el contenido
  wrapper: {
    height: "100%", // Ocupa todo el alto del dashboard
    width: "100%",
    display: "flex", // Flexbox para centrar
    justifyContent: "center", // Horizontalmente
    alignItems: "center", // Verticalmente
    padding: "20px", // Margen de seguridad
    boxSizing: "border-box",
  },
  card: {
    backgroundColor: "white",
    width: "100%",
    maxWidth: "700px", // Ancho máximo elegante
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.15)", // Sombra suave y profunda
    display: "flex",
    flexDirection: "column",
    gap: "30px",
  },
  header: {
    textAlign: "center",
    borderBottom: "2px solid #f0f2f5",
    paddingBottom: "20px",
  },
  titulo: {
    color: "#e67e22",
    margin: "10px 0 5px 0",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr", // Dos columnas iguales
    gap: "20px",
  },
  grupo: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  grupoFull: {
    // Para campos que ocupan todo el ancho
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
  },
  label: {
    fontWeight: "bold",
    fontSize: "0.85rem",
    color: "#7f8c8d",
    textTransform: "uppercase",
    marginLeft: "4px",
  },
  input: {
    width: "100%", // <--- CLAVE: Ocupa todo el ancho disponible
    boxSizing: "border-box", // <--- CLAVE: El padding no rompe el ancho
    padding: "15px",
    fontSize: "1.1rem",
    borderRadius: "10px",
    border: "2px solid #ecf0f1",
    outline: "none",
    transition: "border-color 0.3s",
    color: "#2c3e50",
  },
  boton: {
    width: "100%",
    padding: "18px",
    backgroundColor: "#e67e22",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "1.2rem",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "10px",
    boxShadow: "0 5px 15px rgba(230, 126, 34, 0.3)",
    transition: "transform 0.2s",
  },
};
