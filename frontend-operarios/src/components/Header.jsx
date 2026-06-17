export default function Header({ usuario, progreso, total, onVolverLogin }) {
  const porcentaje = total > 0 ? (progreso / total) * 100 : 0;

  return (
    <header className="top-bar">
      <div className="user-info">
        <span className="label">Op:</span>
        <strong>{usuario}</strong>
      </div>

      <div className="progress-wrapper">
        <div className="progress-text">
          Progreso: {progreso} / {total}
        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${porcentaje}%` }}
          ></div>
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
