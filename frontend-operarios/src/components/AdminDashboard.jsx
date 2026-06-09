import { useState, useEffect } from "react";
import { AdminIncoming } from "./AdminIncoming";
import { AdminOutbound } from "./AdminOutbound";
import { AdminConsulta } from "./AdminConsulta";
import { AdminConfig } from "./AdminConfig";
import { AdminLogin } from "./AdminLogin";
import { AdminModificarCaja } from "./AdminModificarCaja";

export const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [pestanaActual, setPestanaActual] = useState("incoming");

  // AL CARGAR: Comprobar si ya estamos logueados de antes
  useEffect(() => {
    const savedUser = localStorage.getItem("admin_user");
    const savedToken = localStorage.getItem("admin_token");

    if (savedUser && savedToken) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);

      if (parsedUser.rol === "operario_linea") {
        setPestanaActual("modificar");
      }
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);

    if (userData.rol === "operario_linea") {
      setPestanaActual("modificar");
    } else {
      setPestanaActual("incoming");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_token");
    setUser(null);
    setPestanaActual("incoming");
  };

  // SI NO HAY USUARIO -> MOSTRAMOS LOGIN
  if (!user) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  const esOperarioLinea = user.rol === "operario_linea";

  // SI HAY USUARIO -> MOSTRAMOS DASHBOARD
  const renderizarContenido = () => {
    // Protección extra: el operario_linea solo puede ver Modificar Caja
    if (esOperarioLinea) {
      return <AdminModificarCaja />;
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
          {esOperarioLinea ? "🔧 LÍNEA" : "⚙️ ADMIN PANEL"}

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
          {/* 
            El operario_linea NO ve Incoming, Outbound ni Consulta.
            Solo ve Modificar Caja.
          */}
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

          {!esOperarioLinea && (
            <button
              onClick={() => setPestanaActual("consulta")}
              style={
                pestanaActual === "consulta"
                  ? estilos.botonActivo
                  : estilos.boton
              }
            >
              🔍 CONSULTAR INFO
            </button>
          )}

          {/* ESPACIADOR */}
          <div style={{ flex: 1 }}></div>

          {/* SOLO VISIBLE PARA SUPERADMIN */}
          {!esOperarioLinea && user.rol === "superadmin" && (
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
