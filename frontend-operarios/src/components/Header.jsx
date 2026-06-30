export default function Header({
  usuario,
  progreso,
  total,
  modelo,
  onVolverLogin,
}) {
  const porcentaje = total > 0 ? (progreso / total) * 100 : 0;

  return (
    <header className="top-bar">
      <div className="header-session">
        <div className="user-info">
          <span className="label">Op:</span>
          <strong>{usuario}</strong>
        </div>

        {modelo && (
          <div className="modelo-badge" title="Modelo de celda seleccionado">
            <span>MODELO</span>
            <strong>{modelo}</strong>
          </div>
        )}
      </div>

      <div className="progress-wrapper">
        <div className="progress-text">
          Progreso: {progreso} / {total}
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${porcentaje}%` }} />
        </div>
      </div>

      {onVolverLogin && (
        <button
          type="button"
          className="btn-header-login"
          onClick={onVolverLogin}
        >
          ↩ Login
        </button>
      )}
    </header>
  );
}
