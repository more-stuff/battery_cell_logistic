import { useRef, useEffect } from "react";
import Swal from "sweetalert2";

export default function PanelEscaneo({
  hu,
  setHu,
  celda,
  setCelda,
  onEscanear,
  onEnviar,
  enviando,
  numCeldas,
  limite,
}) {
  const inputRef = useRef(null);
  const estaLleno = numCeldas >= limite;

  const reproducirSonido = (archivo) => {
    const audio = new Audio(`/sounds/${archivo}.mp3`);
    audio
      .play()
      .catch((err) => console.error("Error reproduciendo audio:", err));
  };

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
    const res = onEscanear(); // Ejecutamos la lógica del hook
    const sonido = res.type || "short_error";

    // CASO 1: ERROR (Duplicado, fecha mal, etc.)
    if (res?.error) {
      reproducirSonido(sonido);
      Swal.fire({
        icon: "error",
        title: "¡Error!",
        text: res.error,
        timer: 3000,
        showConfirmButton: false,
      });
      return;
    }

    // CASO 2: CONTROL DE CALIDAD (NUEVO)
    if (res?.revision) {
      reproducirSonido("quality_check");

      Swal.fire({
        title: "🛑 CONTROL DE CALIDAD",
        html: `
          <p style="font-size: 1.1em">Protocolo de revisión requerido para la pieza:</p>
          <div style="
            font-size: 4rem;
            color: #c0392b;
            font-weight: bold;
            margin: 10px 0;
            background: #fadbd8;
            border-radius: 10px;
            padding: 10px;
          ">
            #${res.numeroPieza}
          </div>
          <p>Separa esta unidad para <b>validación de calidad física</b>.</p>
        `,
        icon: "warning",
        confirmButtonText: "✅ LEÍDO Y VERIFICADO",
        confirmButtonColor: "#2c3e50", // Tu color primario
        width: 600,
        padding: "2em",
        allowOutsideClick: false, // IMPORTANTE: Obliga a pulsar el botón
        allowEscapeKey: false, // IMPORTANTE: No se cierra con ESC
        backdrop: `
          rgba(0,0,0,0.85)
          left top
          no-repeat
        `,
      }).then(() => {
        // Al dar clic en OK, devolvemos el foco al input para seguir trabajando
        setTimeout(() => inputRef.current?.focus(), 100);
      });
    } else {
      // CASO 3: ÉXITO NORMAL (Sin revisión)
      reproducirSonido("ok");
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
            disabled={enviando || !estaLleno}
          >
            {enviando ? "ENVIANDO..." : "✅ FINALIZAR"}
          </button>
        </div>
      </div>
    </section>
  );
}
