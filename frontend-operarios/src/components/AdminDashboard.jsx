import { useState } from "react";
import { AdminIncoming } from "./AdminIncoming";
import { AdminOutbound } from "./AdminOutbound";
import { AdminConsulta } from "./AdminConsulta";
import { AdminConfig } from "./AdminConfig";
import { AdminLogin } from "./AdminLogin";
import { AdminModificarCaja } from "./AdminModificarCaja";

const getSavedUser = () => {
  const savedUser = localStorage.getItem("admin_user");
  const savedToken = localStorage.getItem("admin_token");

  if (!savedUser || !savedToken) return null;

  try {
    return JSON.parse(savedUser);
  } catch {
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_token");
    return null;
  }
};

const getInitialTab = (user) => {
  if (user?.rol === "operario_linea") return "modificar";
  return "incoming";
};

export const AdminDashboard = () => {
  const [user, setUser] = useState(() => getSavedUser());
  const [pestanaActual, setPestanaActual] = useState(() =>
    getInitialTab(getSavedUser()),
  );

  const esOperarioLinea = user?.rol === "operario_linea";
  const esSuperadmin = user?.rol === "superadmin";

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setPestanaActual(getInitialTab(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_token");
    setUser(null);
    setPestanaActual("incoming");
  };

  if (!user) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  const renderizarContenido = () => {
    if (esOperarioLinea) {
      switch (pestanaActual) {
        case "consulta":
          return <AdminConsulta />;

        case "modificar":
        default:
          return <AdminModificarCaja />;
      }
    }

    switch (pestanaActual) {
      case "incoming":
        return <AdminIncoming />;

      case "outbound":
        return <AdminOutbound />;

      case "consulta":
        return <AdminConsulta />;

      case "modificar":
        return <AdminModificarCaja />;

      case "config":
        return esSuperadmin ? <AdminConfig /> : <p>Acceso Restringido</p>;

      default:
        return <AdminIncoming />;
    }
  };

  return (
    <div style={estilos.layout}>
      <div style={estilos.sidebar}>
        <div style={estilos.logo}>
          {esOperarioLinea ? "🔧 PANEL LÍNEA" : "⚙️ ADMIN PANEL"}

          <div
            style={{ fontSize: "0.8rem", color: "#95a5a6", marginTop: "5px" }}
          >
            Hola, {user.username}
          </div>

          <div
            style={{ fontSize: "0.75rem", color: "#7f8c8d", marginTop: "4px" }}
          >
            Rol: {user.rol}
          </div>
        </div>

        <nav style={estilos.menu}>
          {!esOperarioLinea && (
            <>
              <button
                onClick={() => setPestanaActual("incoming")}
                style={
                  pestanaActual === "incoming"
                    ? estilos.botonActivo
                    : estilos.boton
                }
              >
                📥 REGISTRAR ENTRADA
              </button>

              <button
                onClick={() => setPestanaActual("outbound")}
                style={
                  pestanaActual === "outbound"
                    ? estilos.botonActivo
                    : estilos.boton
                }
              >
                📤 REGISTRAR SALIDA
              </button>
            </>
          )}

          <button
            onClick={() => setPestanaActual("modificar")}
            style={
              pestanaActual === "modificar"
                ? estilos.botonActivo
                : estilos.boton
            }
          >
            🔧 MODIFICAR CAJA
          </button>

          <button
            onClick={() => setPestanaActual("consulta")}
            style={
              pestanaActual === "consulta" ? estilos.botonActivo : estilos.boton
            }
          >
            🔍 CONSULTAR INFO
          </button>

          <div style={{ flex: 1 }}></div>

          {!esOperarioLinea && esSuperadmin && (
            <button
              onClick={() => setPestanaActual("config")}
              style={
                pestanaActual === "config" ? estilos.botonActivo : estilos.boton
              }
            >
              ⚙️ CONFIGURACIÓN GLOBAL
            </button>
          )}

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

      <div style={estilos.contenido}>{renderizarContenido()}</div>
    </div>
  );
};

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
