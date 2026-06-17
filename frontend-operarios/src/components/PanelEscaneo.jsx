import { useState, useEffect, useRef } from "react";
import { TIPOS_CAJA } from "../services/validarCeldaPorTipoCaja";
import { getTipoCajaUI } from "../services/tipoCajaUI";
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
  tipoCaja = TIPOS_CAJA.NORMAL,
}) {
  const inputRef = useRef(null);
  const [bloqueado, setBloqueado] = useState(false);

  const tipoUI = getTipoCajaUI(tipoCaja);
  const esNormal = tipoCaja === TIPOS_CAJA.NORMAL;
  const estaLleno = numCeldas >= limite;

  const headerClass = esNormal
    ? "panel-header"
    : "panel-header header-defectuoso";

  useEffect(() => {
    setTimeout(() => {
      if (hu) inputRef.current?.focus();
    }, 100);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reproducirSonido = (tipo) => {
    const audioOriginal = audios[tipo];

    if (audioOriginal) {
      audioOriginal
        .cloneNode()
        .play()
        .catch((e) => {
          console.warn("Audio no reproducido:", e);
        });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const res = onEscanear();
    const sonido = res.type || "short_error";

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

      return;
    }

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

      return;
    }

    reproducirSonido("ok");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleFinalizar = () => {
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
      confirmButtonColor: tipoUI.colorPrincipal || "#27ae60",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, enviar caja",
      cancelButtonText: "Cancelar",
      width: 500,
    }).then((result) => {
      if (result.isConfirmed) {
        onEnviar();
      }
    });
  };

  const puedeFinalizar = estaLleno && !enviando;

  const buttonStyle = {
    width: "100%",
    minHeight: "58px",
    padding: "14px 18px",
    borderRadius: "8px",
    border: "none",
    fontWeight: "bold",
    fontSize: "1rem",
    letterSpacing: "0.5px",
    cursor: puedeFinalizar ? "pointer" : "not-allowed",
    backgroundColor: puedeFinalizar ? tipoUI.colorPrincipal : "#bdc3c7",
    color: "white",
    opacity: 1,
    transition: "background-color 0.2s ease, transform 0.2s ease",
  };

  return (
    <section className="panel scan-panel">
      <div
        className={headerClass}
        style={!esNormal ? { backgroundColor: tipoUI.colorPrincipal } : {}}
      >
        <h3>{tipoUI.tituloPanel}</h3>
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
            disabled={!puedeFinalizar}
            style={buttonStyle}
          >
            {enviando ? "ENVIANDO..." : tipoUI.textoBotonFinalizar}
          </button>
        </div>
      </div>
    </section>
  );
}
