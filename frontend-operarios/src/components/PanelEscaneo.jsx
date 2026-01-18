import { useRef, useEffect } from "react";

export default function PanelEscaneo({
  hu,
  setHu,
  celda,
  setCelda,
  onEscanear,
  onEnviar,
  enviando,
  numCeldas,
}) {
  const inputRef = useRef(null);

  // 1. CORRECCIÓN: Array vacío [] al final.
  // Esto hace que solo se ejecute UNA vez al cargar la página, no cada vez que escribes.
  useEffect(() => {
    setTimeout(() => {
      // Solo enfocamos la celda si ya hay un HU (recuperado de memoria),
      // si no, el usuario querrá escribir el HU primero.
      if (hu) inputRef.current?.focus();
    }, 100);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const res = onEscanear();

    if (res?.error) {
      alert(res.error);
    } else {
      // 2. RE-ENFOQUE INTELIGENTE:
      // Solo volvemos a poner el foco aquí si el escaneo fue ÉXITO.
      // Así el operario puede seguir disparando con el lector sin tocar la pantalla.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <section className="panel scan-panel">
      <div className="panel-header">
        <h3>📥 Entrada de Datos</h3>
      </div>
      <div className="panel-body">
        <div className="form-group">
          <label>HU / CAJA ACTUAL</label>
          <input
            className="input-big input-hu"
            value={hu}
            onChange={(e) => setHu(e.target.value)}
            placeholder="Escanear Caja..."
            // Quitamos autofocus de aquí para evitar peleas de foco
          />
        </div>

        <div className="form-group">
          <label>PIEZA / CELDA</label>
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="input-big input-scan"
              value={celda}
              onChange={(e) => setCelda(e.target.value)}
              placeholder="Escanear Pieza..."
              // El autoFocus aquí está bien para el primer render
              autoFocus
            />
          </form>
        </div>

        <div className="action-area">
          <button
            className="btn-send"
            onClick={onEnviar}
            disabled={enviando || numCeldas === 0}
          >
            {enviando ? "ENVIANDO..." : "✅ FINALIZAR"}
          </button>
        </div>
      </div>
    </section>
  );
}
