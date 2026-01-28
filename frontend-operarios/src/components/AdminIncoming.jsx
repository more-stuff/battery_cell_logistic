import { useState } from "react";
import Swal from "sweetalert2"; // <--- IMPORTANTE: Importar SweetAlert
import { actualizarIncoming } from "../services/api";
import { estilos } from "../styles/AdminIncoming.styles";

export const AdminIncoming = () => {
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

  const handleKeyDown = (e) => {
    // Si pulsan Enter en el HU, pasamos al siguiente campo en vez de enviar
    if (e.key === "Enter") {
      e.preventDefault();
      fechaRef.current?.focus(); // Mueve el cursor a la fecha
    }
  };
  // ENVÍO DEL FORMULARIO
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. VALIDACIÓN (WARNING)
    if (!formData.hu_entrada.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Falta información",
        text: "⚠️ EL HU DE ENTRADA ES OBLIGATORIO",
        confirmButtonColor: "#e74c3c",
      });
      return;
    }

    setLoading(true);
    try {
      // 🚀 LLAMADA A LA API
      const respuesta = await actualizarIncoming(formData);

      // 2. ÉXITO (SUCCESS)
      Swal.fire({
        icon: "success",
        title: "¡Registrado!",
        text: respuesta.mensaje,
        timer: 2000,
        showConfirmButton: false,
      });

      // Limpiamos formulario
      setFormData({
        hu_entrada: "",
        fecha_recibo: "",
        awb_swb: "",
        np_packing_list: "",
        fecha_caducidad: "",
      });
    } catch (error) {
      console.error(error);

      // 3. ERROR (ERROR)
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "❌ No se pudo conectar con el servidor.",
      });
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
              onKeyDown={handleKeyDown}
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
                type="datetime-local"
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
                type="date"
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
