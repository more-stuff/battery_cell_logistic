import { useState } from "react";

// Importamos tus 4 pantallas
import { AdminIncoming } from "./AdminIncoming";
import { AdminOutbound } from "./AdminOutbound";
import { AdminConsulta } from "./AdminConsulta";
import { AdminConfig } from "./AdminConfig"; // <--- NUEVO IMPORT

export const AdminDashboard = () => {
  const [pestanaActual, setPestanaActual] = useState("incoming");

  const renderizarContenido = () => {
    switch (pestanaActual) {
      case "incoming":
        return <AdminIncoming />;
      case "outbound":
        return <AdminOutbound />;
      case "consulta":
        return <AdminConsulta />;
      case "config": // <--- NUEVO CASO
        return <AdminConfig />;
      default:
        return <AdminIncoming />;
    }
  };

  return (
    <div style={estilos.layout}>
      {/* === BARRA LATERAL === */}
      <div style={estilos.sidebar}>
        <div style={estilos.logo}>⚙️ ADMIN PANEL</div>

        <nav style={estilos.menu}>
          <button
            onClick={() => setPestanaActual("incoming")}
            style={
              pestanaActual === "incoming" ? estilos.botonActivo : estilos.boton
            }
          >
            📥 REGISTRAR ENTRADA
          </button>

          <button
            onClick={() => setPestanaActual("outbound")}
            style={
              pestanaActual === "outbound" ? estilos.botonActivo : estilos.boton
            }
          >
            📤 REGISTRAR SALIDA
          </button>

          <button
            onClick={() => setPestanaActual("consulta")}
            style={
              pestanaActual === "consulta" ? estilos.botonActivo : estilos.boton
            }
          >
            🔍 CONSULTAR INFO
          </button>

          {/* ESPACIADOR PARA SEPARAR LA CONFIGURACIÓN */}
          <div style={{ flex: 1 }}></div>

          <button
            onClick={() => setPestanaActual("config")}
            style={
              pestanaActual === "config" ? estilos.botonActivo : estilos.boton
            }
          >
            ⚙️ CONFIGURACIÓN GLOBAL
          </button>
        </nav>
      </div>

      {/* === CONTENIDO === */}
      <div style={estilos.contenido}>{renderizarContenido()}</div>
    </div>
  );
};

// --- ESTILOS ---
const estilos = {
  layout: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    fontFamily: "Arial, sans-serif",
    overflow: "hidden",
  },
  sidebar: {
    width: "280px",
    backgroundColor: "#2c3e50",
    color: "white",
    display: "flex",
    flexDirection: "column",
    padding: "20px",
    boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
  },
  logo: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: "40px",
    paddingBottom: "20px",
    borderBottom: "1px solid #34495e",
    color: "#ecf0f1",
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    height: "100%", // Para que el espaciador funcione
  },
  contenido: {
    flex: 1,
    backgroundColor: "#ecf0f1",
    overflowY: "auto",
    padding: "20px", // Un poco de padding al contenido general queda bien
  },
  // BOTÓN INACTIVO
  boton: {
    padding: "15px 20px",
    textAlign: "left",
    backgroundColor: "transparent",
    color: "#bdc3c7",
    border: "none",
    borderLeft: "5px solid transparent",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  // BOTÓN ACTIVO
  botonActivo: {
    padding: "15px 20px",
    textAlign: "left",
    backgroundColor: "#34495e",
    color: "white",
    border: "none",
    borderLeft: "5px solid #3498db",
    borderRadius: "0 8px 8px 0",
    fontWeight: "bold",
    cursor: "default",
    fontSize: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
};
