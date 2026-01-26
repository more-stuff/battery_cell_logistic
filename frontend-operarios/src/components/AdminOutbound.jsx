import { useState } from "react";
import Swal from "sweetalert2";
import { registrarSalida } from "../services/api";
import { estilos } from "../styles/AdminOutbound.styles";

export const AdminOutbound = () => {
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
      Swal.fire({
        icon: "warning",
        title: "Falta información",
        text: "⚠️ EL ID TEMPORAL ES OBLIGATORIO",
        confirmButtonColor: "#e67e22",
      });
      return;
    }

    setLoading(true);
    try {
      const respuesta = await registrarSalida(formData);
      Swal.fire({
        icon: "success",
        title: "¡Salida Registrada!",
        text: respuesta.mensaje,
        timer: 2000,
        showConfirmButton: false,
      });

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
        Swal.fire({
          icon: "error",
          title: "No encontrado",
          text: "❌ ID NO ENCONTRADO. Verifica el código escaneado.",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error de conexión",
          text: "❌ No se pudo conectar con el servidor.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={estilos.wrapper}>
      <div style={estilos.card}>
        <div style={estilos.header}>
          <span style={{ fontSize: "2.5rem" }}>🚚</span>
          <h2 style={estilos.titulo}>REGISTRO DE SALIDA</h2>
          <p style={{ margin: 0, color: "#95a5a6" }}>
            Completa los datos de envío final
          </p>
        </div>

        <form onSubmit={handleSubmit} style={estilos.form}>
          {/* ==================================================== */}
          {/* BLOQUE 1: IDENTIFICACIÓN (NARANJA)                   */}
          {/* ==================================================== */}
          <div style={estilos.grupoFull}>
            <label
              style={{ ...estilos.label, color: "#e67e22", fontWeight: "bold" }}
            >
              * 1. ID CAJA (TMP-...)
            </label>
            <input
              name="id_temporal"
              value={formData.id_temporal}
              onChange={handleChange}
              placeholder="Escanea el código aquí..."
              style={{
                ...estilos.input,
                border: "2px solid #e67e22", // Borde Naranja
                background: "#fffbf5", // Fondo Crema
                fontSize: "1.2rem",
              }}
              autoFocus
            />
          </div>

          {/* ==================================================== */}
          {/* BLOQUE 2: HU SILENA (AHORA TAMBIÉN NARANJA)          */}
          {/* ==================================================== */}
          <div style={estilos.grupoFull}>
            <label
              style={{ ...estilos.label, color: "#e67e22", fontWeight: "bold" }}
            >
              📦 2. HU Silena Outbound
            </label>
            <input
              type="text"
              name="hu_silena"
              value={formData.hu_silena}
              onChange={handleChange}
              placeholder="Ej: SIL-998877"
              style={{
                ...estilos.input,
                border: "2px solid #e67e22", // Borde Naranja (Igual que arriba)
                background: "#fffbf5", // Fondo Crema (Igual que arriba)
              }}
            />
          </div>

          {/* ==================================================== */}
          {/* BLOQUE 3: SECCIÓN POWERCO (AZUL)                     */}
          {/* ==================================================== */}
          <div
            style={{
              padding: "20px",
              marginTop: "10px",
              backgroundColor: "#ebf5fb",
              border: "2px solid #3498db",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
            <h4
              style={{
                margin: "0 0 10px 0",
                color: "#2980b9",
                borderBottom: "1px solid #a9cce3",
                paddingBottom: "5px",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              🔵 3. Datos PowerCo
            </h4>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
              }}
            >
              {/* Nº SALIDA */}
              <div style={estilos.grupo}>
                <label style={{ ...estilos.label, color: "#2980b9" }}>
                  📄 Nº Salida / Delivery
                </label>
                <input
                  type="text"
                  name="numero_salida"
                  value={formData.numero_salida}
                  onChange={handleChange}
                  placeholder="Ej: DEL-2024-55"
                  style={{ ...estilos.input, borderColor: "#a9cce3" }}
                />
              </div>

              {/* HANDLING UNIT */}
              <div style={estilos.grupo}>
                <label style={{ ...estilos.label, color: "#2980b9" }}>
                  🏷️ Handling Unit Final
                </label>
                <input
                  type="text"
                  name="handling_unit"
                  value={formData.handling_unit}
                  onChange={handleChange}
                  placeholder="Ej: FINAL-001"
                  style={{ ...estilos.input, borderColor: "#a9cce3" }}
                />
              </div>

              {/* FECHA ENVÍO */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ ...estilos.label, color: "#2980b9" }}>
                  🚀 Fecha y Hora de Envío
                </label>
                <input
                  type="datetime-local"
                  name="fecha_envio"
                  value={formData.fecha_envio}
                  onChange={handleChange}
                  style={{ ...estilos.input, borderColor: "#a9cce3" }}
                />
              </div>
            </div>
          </div>

          {/* BOTÓN */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...estilos.boton,
              marginTop: "20px",
              backgroundColor: loading ? "#95a5a6" : "#2c3e50",
            }}
          >
            {loading ? "GUARDANDO..." : "💾 CONFIRMAR SALIDA"}
          </button>
        </form>
      </div>
    </div>
  );
};
