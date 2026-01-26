import { useState, useEffect } from "react";
import { AdminIncoming } from "./AdminIncoming";
import { AdminOutbound } from "./AdminOutbound";
import { AdminConsulta } from "./AdminConsulta";
import { AdminConfig } from "./AdminConfig";
import { AdminLogin } from "./AdminLogin"; // <--- Importamos el Login

export const AdminDashboard = () => {
  const [user, setUser] = useState(null); // Estado del usuario logueado
  const [pestanaActual, setPestanaActual] = useState("incoming");

  // AL CARGAR: Comprobar si ya estamos logueados de antes
  useEffect(() => {
    const savedUser = localStorage.getItem("admin_user");
    const savedToken = localStorage.getItem("admin_token");

    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_token");
    setUser(null);
    setPestanaActual("incoming");
  };

  // SI NO HAY USUARIO -> MOSTRAMOS LOGIN
  if (!user) {
    return <AdminLogin onLoginSuccess={(userData) => setUser(userData)} />;
  }

  // SI HAY USUARIO -> MOSTRAMOS DASHBOARD
  const renderizarContenido = () => {
    switch (pestanaActual) {
      case "incoming":
        return <AdminIncoming />;
      case "outbound":
        return <AdminOutbound />;
      case "consulta":
        return <AdminConsulta />;
      case "config":
        // Protección extra por si alguien intenta forzar la vista
        return user.rol === "superadmin" ? (
          <AdminConfig />
        ) : (
          <p>Acceso Restringido</p>
        );
      default:
        return <AdminIncoming />;
    }
  };

  return (
    <div style={estilos.layout}>
      {/* === BARRA LATERAL === */}
      <div style={estilos.sidebar}>
        <div style={estilos.logo}>
          ⚙️ ADMIN PANEL
          <div
            style={{ fontSize: "0.8rem", color: "#95a5a6", marginTop: "5px" }}
          >
            Hola, {user.username}
          </div>
        </div>

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

          {/* ESPACIADOR */}
          <div style={{ flex: 1 }}></div>

          {/* 👇 SOLO VISIBLE PARA SUPERADMIN */}
          {user.rol === "superadmin" && (
            <button
              onClick={() => setPestanaActual("config")}
              style={
                pestanaActual === "config" ? estilos.botonActivo : estilos.boton
              }
            >
              ⚙️ CONFIGURACIÓN GLOBAL
            </button>
          )}

          {/* BOTÓN SALIR */}
          <button
            onClick={handleLogout}
            style={{
              ...estilos.boton,
              color: "#e74c3c",
              borderTop: "1px solid #34495e",
            }}
          >
            🚪 CERRAR SESIÓN
          </button>
        </nav>
      </div>

      {/* === CONTENIDO === */}
      <div style={estilos.contenido}>{renderizarContenido()}</div>
    </div>
  );
};

// ... (Los estilos se mantienen igual que en tu archivo original) ...
// Puedes copiar y pegar tus estilos aquí abajo.
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
    height: "100%",
  },
  contenido: {
    flex: 1,
    backgroundColor: "#ecf0f1",
    overflowY: "auto",
    padding: "20px",
  },
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
