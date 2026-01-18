export default function Header({ usuario, progreso, total }) {
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
            style={{ width: `${(progreso / total) * 100}%` }}
          ></div>
        </div>
      </div>
    </header>
  );
}
