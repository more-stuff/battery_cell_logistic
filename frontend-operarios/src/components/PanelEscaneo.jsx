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
  celdas,
  modoDefectuoso = false, // <--- 1. propiedad de si estamos en modo defecuoso por defecto false
}) {
  const inputRef = useRef(null);
  const estaLleno = numCeldas >= limite;
  const [bloqueado, setBloqueado] = useState(false);

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

    const res = onEscanear(modoDefectuoso); // Ejecutamos la lógica del hook
    const sonido = res.type || "short_error";

    // CASO 1: ERROR (Duplicado, fecha mal, etc.)
    if (res?.error) {
      reproducirSonido(sonido);
      Swal.fire({
        icon: "error",
        title: "¡Error!",
        text: res.error,
        timer: 2200,
        showConfirmButton: false,
      });
      return;
    }

    // CASO 2: CONTROL DE CALIDAD
    if (res?.revision) {
      setBloqueado(true);
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
        setBloqueado(false);
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
              <p style="margin: 5px 0 0 0; font-weight: bold;">Colocar cartón separador en la orientación correcta</p>
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
      if (modoDefectuoso) {
        setHu("");
      }
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleFinalizar = () => {
    console.log(celdas);
    // calculo de hu diferentes
    const husUnicos = [
      ...new Set(celdas.map((c) => c.hu_asociado).filter((h) => h)),
    ];

    const htmlHus =
      husUnicos.length > 0
        ? husUnicos
            .map(
              (h) =>
                `<span style="
            background-color: #e3f2fd;
            color: #1565c0;
            padding: 4px 10px;
            border-radius: 15px;
            font-size: 0.9em;
            margin: 3px;
            display: inline-block;
            font-weight: bold;
            border: 1px solid #90caf9;">
            📦 ${h}
           </span>`,
            )
            .join("")
        : '<span style="color: #999; font-style: italic;">Sin HUs registrados</span>';

    // 👇 CONFIRMACIÓN ANTES DE ENVIAR
    Swal.fire({
      title: "¿Cerrar y Finalizar Caja?",
      html: `
        <div style="text-align: left; margin-top: 10px;">
           <p style="margin-bottom: 15px; font-size: 1.1em; color: #333;">
             Se van a registrar <b>${celdas.length} piezas</b>.
           </p>

           <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
             <label style="display: block; font-size: 0.8em; color: #666; font-weight: bold; margin-bottom: 8px; text-transform: uppercase;">
               Fuentes detectadas (${husUnicos.length}):
             </label>
             <div style="line-height: 1.6;">
               ${htmlHus}
             </div>
           </div>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#27ae60",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, enviar caja",
      cancelButtonText: "Cancelar",
      width: 500,
    }).then((result) => {
      if (result.isConfirmed) {
        onEnviar(modoDefectuoso);
      }
    });
  };

  const headerClass = modoDefectuoso
    ? "panel-header header-defectuoso"
    : "panel-header";

  return (
    <section className="panel scan-panel">
      <div
        className={headerClass}
        style={modoDefectuoso ? { backgroundColor: "#c0392b" } : {}}
      >
        <h3>
          {modoDefectuoso
            ? "🗑️ Escaneo de Datos defectuosos"
            : "📥 Entrada de Datos"}
        </h3>
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
              disabled={bloqueado}
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
            style={modoDefectuoso ? { backgroundColor: "#c0392b" } : {}}
          >
            {enviando
              ? "ENVIANDO..."
              : modoDefectuoso
                ? "⚠️ FINALIZAR SCRAP"
                : "✅ FINALIZAR"}
          </button>
        </div>
      </div>
    </section>
  );
}
