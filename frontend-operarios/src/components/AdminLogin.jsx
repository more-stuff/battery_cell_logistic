import { useState } from "react";
import Swal from "sweetalert2";
import { loginAdmin } from "../services/api";

export const AdminLogin = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await loginAdmin(username, password);

      // Guardamos credenciales
      localStorage.setItem("admin_token", data.access_token);
      localStorage.setItem(
        "admin_user",
        JSON.stringify({
          username: data.username,
          rol: data.rol,
        }),
      );

      onLoginSuccess({ username: data.username, rol: data.rol });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Acceso Denegado",
        text: "Usuario o contraseña incorrectos",
        background: "#2c3e50", // Alerta oscura también
        color: "#fff",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>
        <div style={estilos.header}>
          <span style={{ fontSize: "3rem" }}>🔐</span>
          <h2 style={estilos.title}>Portal Admin</h2>
          <p style={estilos.subtitle}>Inicia sesión para gestionar</p>
        </div>

        <form onSubmit={handleSubmit} style={estilos.form}>
          <div style={estilos.inputGroup}>
            <label style={estilos.label}>Usuario</label>
            <input
              type="text"
              placeholder="username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={estilos.input}
              autoFocus
            />
          </div>

          <div style={estilos.inputGroup}>
            <label style={estilos.label}>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={estilos.input}
            />
          </div>

          <button type="submit" disabled={loading} style={estilos.button}>
            {loading ? "VERIFICANDO..." : "ENTRAR AL SISTEMA"}
          </button>
        </form>
      </div>

      <p style={estilos.footer}>Battery Cell Logistic © 2024</p>
    </div>
  );
};

const estilos = {
  container: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    // 👇 FONDO OSCURO PARA NO AGOBIAR
    backgroundColor: "#1e293b",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "40px",
    borderRadius: "16px",
    // Sombra fuerte para dar profundidad
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  header: {
    textAlign: "center",
    marginBottom: "10px",
  },
  title: {
    color: "#1e293b",
    margin: "10px 0 5px 0",
    fontSize: "1.8rem",
    fontWeight: "800",
  },
  subtitle: {
    color: "#64748b",
    margin: 0,
    fontSize: "0.95rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    textAlign: "left",
  },
  label: {
    color: "#334155",
    fontWeight: "600",
    fontSize: "0.9rem",
    marginLeft: "4px",
  },
  input: {
    padding: "16px",
    fontSize: "1rem",
    borderRadius: "8px",
    // 👇 BORDE MÁS VISIBLE Y FONDO GRISÁCEO
    border: "2px solid #cbd5e1",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    outline: "none",
    transition: "border-color 0.2s",
  },
  button: {
    marginTop: "10px",
    padding: "16px",
    fontSize: "1rem",
    backgroundColor: "#2563eb", // Azul brillante
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    letterSpacing: "1px",
    boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
    transition: "transform 0.1s",
  },
  footer: {
    marginTop: "30px",
    color: "#475569",
    fontSize: "0.8rem",
  },
};
