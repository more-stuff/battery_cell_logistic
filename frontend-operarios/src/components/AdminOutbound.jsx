import { useState } from "react";
import Swal from "sweetalert2"; // <--- IMPORTANTE: Importar SweetAlert
import { registrarSalida } from "../services/api";
import { estilos } from "../styles/AdminOutbound.styles";

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
    fecha_envio: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. VALIDACIÓN (WARNING)
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

      // 2. ÉXITO (SUCCESS)
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

      // 3. ERRORES (ERROR)
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
