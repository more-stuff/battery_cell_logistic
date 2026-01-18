import React from "react";

export default function Login({ usuario, setUsuario, onLogin }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Validación simple: que no esté vacío
    if (usuario.trim().length > 0) {
      onLogin();
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <h2>🔐 Acceso Operario</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="ID de Usuario (Numérico)"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="input-big" // Reutilizamos tu clase CSS
            autoFocus
          />
          <button type="submit" style={{ marginTop: "20px" }}>
            INICIAR TURNO
          </button>
        </form>
      </div>
    </div>
  );
}
