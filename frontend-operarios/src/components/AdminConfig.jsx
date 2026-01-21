import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { obtenerConfiguracion, guardarConfiguracion } from "../services/api";

export const AdminConfig = () => {
  // Estados para los valores
  const [config, setConfig] = useState({
    alerta_cada: "",
    limite_caja: "",
  });

  const [loading, setLoading] = useState(true);

  // Cargar valores al iniciar
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const datos = await obtenerConfiguracion();
      setConfig({
        alerta_cada: datos.alerta_cada,
        limite_caja: datos.limite_caja,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio en inputs
  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  // Guardar cuando el usuario hace click en "Guardar"
  const handleGuardar = async (clave) => {
    try {
      const valor = config[clave];
      if (!valor) return;

      await guardarConfiguracion(clave, valor);

      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
      Toast.fire({
        icon: "success",
        title: "Configuración actualizada",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar el cambio",
      });
    }
  };

  if (loading) return <p>Cargando configuración...</p>;

  return (
    <div style={estilos.card}>
      <h2 style={estilos.titulo}>⚙️ Configuración Global</h2>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Estos cambios afectan a <strong>todos los operarios</strong>{" "}
        inmediatamente.
      </p>

      <div style={estilos.grid}>
        {/* CONFIG 1: LÍMITE DE CAJA */}
        <div style={estilos.item}>
          <label style={estilos.label}>📦 Límite de Piezas por Caja</label>
          <div style={estilos.inputGroup}>
            <input
              type="number"
              name="limite_caja"
              value={config.limite_caja}
              onChange={handleChange}
              style={estilos.input}
            />
            <button
              onClick={() => handleGuardar("limite_caja")}
              style={estilos.btnGuardar}
            >
              Guardar
            </button>
          </div>
          <small style={estilos.help}>
            El operario verá la caja llena al llegar a este número.
          </small>
        </div>

        {/* CONFIG 2: FRECUENCIA DE REVISIÓN */}
        <div style={estilos.item}>
          <label style={estilos.label}>
            ⚠️ Alerta de Revisión (Cada X piezas)
          </label>
          <div style={estilos.inputGroup}>
            <input
              type="number"
              name="alerta_cada"
              value={config.alerta_cada}
              onChange={handleChange}
              style={estilos.input}
            />
            <button
              onClick={() => handleGuardar("alerta_cada")}
              style={estilos.btnGuardar}
            >
              Guardar
            </button>
          </div>
          <small style={estilos.help}>
            Saltará una alerta de calidad cada vez que el contador sea múltiplo
            de este número.
          </small>
        </div>
      </div>
    </div>
  );
};

// ESTILOS SENCILLOS
const estilos = {
  card: {
    background: "white",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    maxWidth: "800px",
    margin: "20px auto",
    fontFamily: "Segoe UI, sans-serif",
  },
  titulo: {
    margin: "0 0 10px 0",
    color: "#2c3e50",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "30px",
  },
  item: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontWeight: "bold",
    color: "#34495e",
  },
  inputGroup: {
    display: "flex",
    gap: "10px",
  },
  input: {
    padding: "10px",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "6px",
    flex: 1,
  },
  btnGuardar: {
    padding: "10px 20px",
    background: "#3498db",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  help: {
    color: "#7f8c8d",
    fontSize: "0.85rem",
  },
};
