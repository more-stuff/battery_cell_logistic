import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";

const audios = {
  ok: new Audio("/sounds/ok.mp3"),
  short_error: new Audio("/sounds/short_error.mp3"),
  duplicate_error: new Audio("/sounds/duplicate_error.mp3"),
  quality_check: new Audio("/sounds/quality_check.mp3"),
  date_error: new Audio("/sounds/date_error.mp3"),
  level_complete: new Audio("/sounds/ok.mp3"),
  defect_error: new Audio("/sounds/defect_error.mp3"),
};

// Opcional: Forzar precarga para que estén listos ya
Object.values(audios).forEach((audio) => (audio.preload = "auto"));

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
  const [esDefectuoso, setEsDefectuoso] = useState(false);
  const inputRef = useRef(null);
  const estaLleno = numCeldas >= limite;

  // Esto hace que solo se ejecute UNA vez al cargar la página
  useEffect(() => {
    setTimeout(() => {
      // Solo enfocamos la celda si ya hay un HU (recuperado de memoria),
      if (hu) inputRef.current?.focus();
    }, 100);
  }, []);

  const reproducirSonido = (tipo) => {
    const audioOriginal = audios[tipo];

    if (audioOriginal) {
      // cloneNode() es suficiente.
      // El navegador limpiará la memoria automáticamente cuando termine el audio.
      audioOriginal
        .cloneNode()
        .play()
        .catch((e) => {
          // Ignoramos errores si el usuario cambia de pestaña rápido
          console.warn("Audio no reproducido:", e);
        });
    }
  };

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
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    // CASO 2: CONTROL DE CALIDAD
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
        confirmButtonColor: "#2c3e50",
        width: 600,
        padding: "2em",
        allowOutsideClick: false,
        allowEscapeKey: false,
        backdrop: `
          rgba(0,0,0,0.85)
          left top
          no-repeat
        `,
      }).then(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
      });
      return; // Importante: salir para no ejecutar lógica de nivel o éxito normal
    }

    // 👇 3. ALERTA DE NIVEL COMPLETADO
    if (res?.nivelCompletado) {
      reproducirSonido("level_complete");

      Swal.fire({
        title: `🏁 NIVEL ${res.numeroNivel} COMPLETADO`,
        html: `
          <div style="font-size: 1.1rem; color: #34495e;">
            <p>Has completado <b>${res.numeroPieza - 1} piezas</b>.</p>
            <div style="
              background: #ebf5fb;
              border: 2px dashed #3498db;
              padding: 15px;
              border-radius: 8px;
              margin: 15px 0;
            ">
              <h3 style="margin:0; color: #2980b9;">⚠️ ACCIÓN REQUERIDA</h3>
              <p style="margin: 5px 0 0 0; font-weight: bold;">Colocar cartón separador</p>
            </div>
          </div>
        `,
        icon: "info",
        confirmButtonText: "✅ Iniciar nuevo nivel",
        confirmButtonColor: "#2980b9",
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: true,
      }).then((result) => {
        if (result.isConfirmed) {
          setTimeout(() => inputRef.current?.focus(), 200);
        }
      });
      return; // 🛑 IMPORTANTE: Cortamos aquí
    }

    // CASO 4: ÉXITO NORMAL (Sin revisión ni fin de nivel)
    else {
      reproducirSonido("ok");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleFinalizar = () => {
    // Pasamos el valor del checkbox al padre
    onEnviar(esDefectuoso);
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
              autoFocus
            />
          </form>
        </div>

        <div className="action-area">
          <button
            className="btn-send"
            onClick={handleFinalizar}
            disabled={enviando || !estaLleno}
          >
            {enviando ? "ENVIANDO..." : "✅ FINALIZAR"}
          </button>
        </div>
      </div>
    </section>
  );
}
