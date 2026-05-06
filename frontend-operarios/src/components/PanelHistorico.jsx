import React from "react";
import Swal from "sweetalert2";

export default function PanelHistorico({
  celdas,
  onBorrar,
  onBorrarDesde,
  offsetIndex,
  // Navegación de niveles
  nivelVisible,
  nivelActual,
  totalNiveles,
  onPrevNivel,
  onNextNivel,
}) {
  const handleBorrarClick = (indexVisual) => {
    const indexReal = offsetIndex + indexVisual;

    Swal.fire({
      title: "¿Borrar?",
      text: `Pieza #${indexReal + 1}`,
      icon: "warning",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonColor: "#d33",
      denyButtonColor: "#f39c12",
      confirmButtonText: "🧨 Borrar siguientes",
      denyButtonText: "🗑️ Borrar esta",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        onBorrarDesde(indexReal);
      } else if (result.isDenied) {
        onBorrar(indexReal);
      }
    });
  };

  const esMirandoNivelAnterior = nivelVisible < nivelActual;

  return (
    <section
      className="panel historico-panel"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "none",
        boxShadow: "none",
      }}
    >
      {/* ── HEADER CON NAVEGACIÓN ─────────────────────────────────────────── */}
      <div className="panel-header" style={{ flexShrink: 0 }}>
        <h3>📋 Historial de Caja</h3>

        {/* Controles de nivel: solo aparecen si hay más de un nivel empezado */}
        {nivelActual > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {/* Flecha atrás */}
            <button
              onClick={onPrevNivel}
              disabled={nivelVisible === 0}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                background: nivelVisible === 0 ? "#f5f5f5" : "#2c3e50",
                color: nivelVisible === 0 ? "#bbb" : "white",
                cursor: nivelVisible === 0 ? "not-allowed" : "pointer",
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
              }}
              title="Nivel anterior"
            >
              ◀
            </button>

            {/* Badge de nivel */}
            <div
              style={{
                padding: "4px 12px",
                borderRadius: "20px",
                background: esMirandoNivelAnterior ? "#f39c12" : "#2c3e50",
                color: "white",
                fontSize: "0.82rem",
                fontWeight: "bold",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                transition: "background 0.2s",
              }}
            >
              {esMirandoNivelAnterior && "👁 "}
              NIVEL {nivelVisible + 1} / {nivelActual + 1}
            </div>

            {/* Flecha adelante */}
            <button
              onClick={onNextNivel}
              disabled={nivelVisible === nivelActual}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                background:
                  nivelVisible === nivelActual ? "#f5f5f5" : "#2c3e50",
                color: nivelVisible === nivelActual ? "#bbb" : "white",
                cursor:
                  nivelVisible === nivelActual ? "not-allowed" : "pointer",
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
              }}
              title="Nivel siguiente"
            >
              ▶
            </button>
          </div>
        )}

        <span className="count-badge">{celdas.length} pzs</span>
      </div>

      {/* Banner de aviso cuando el operario está mirando un nivel antiguo */}
      {esMirandoNivelAnterior && (
        <div
          style={{
            background: "#fff3cd",
            borderBottom: "2px solid #f39c12",
            padding: "7px 14px",
            fontSize: "0.82rem",
            color: "#856404",
            fontWeight: "bold",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ⚠️ Estás viendo el nivel {nivelVisible + 1} — el escaneo continúa en
          el nivel {nivelActual + 1}
        </div>
      )}

      {/* ── TABLA ────────────────────────────────────────────────────────────── */}
      <div className="table-container" style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead
            style={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              background: "#f8f9fa",
            }}
          >
            <tr>
              <th style={{ padding: "10px", borderBottom: "2px solid #ddd" }}>
                #
              </th>
              <th style={{ padding: "10px", borderBottom: "2px solid #ddd" }}>
                HU / CAJA
              </th>
              <th style={{ padding: "10px", borderBottom: "2px solid #ddd" }}>
                CÓDIGO
              </th>
              <th
                style={{
                  padding: "10px",
                  borderBottom: "2px solid #ddd",
                  textAlign: "center",
                }}
              >
                ESTADO
              </th>
              <th
                style={{
                  padding: "10px",
                  borderBottom: "2px solid #ddd",
                  textAlign: "center",
                }}
              >
                ACCIÓN
              </th>
            </tr>
          </thead>
          <tbody>
            {celdas.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  style={{
                    padding: "30px",
                    textAlign: "center",
                    color: "#aaa",
                  }}
                >
                  --- Nivel vacío ---
                </td>
              </tr>
            ) : (
              [...celdas].reverse().map((celda, index) => {
                const indexOriginal = celdas.length - 1 - index;
                const numeroPieza = offsetIndex + indexOriginal + 1;

                return (
                  <tr
                    key={celda.id ?? index}
                    style={{
                      borderBottom: "1px solid #eee",
                      backgroundColor: celda.es_revision
                        ? "#fff5f5"
                        : "transparent",
                      // Pequeña indicación visual si es nivel antiguo
                      opacity: esMirandoNivelAnterior ? 0.85 : 1,
                    }}
                  >
                    <td style={{ padding: "10px", color: "#888" }}>
                      {numeroPieza}
                    </td>

                    <td
                      style={{
                        padding: "10px",
                        fontWeight: "bold",
                        color: "#2980b9",
                        fontFamily: "monospace",
                      }}
                    >
                      {celda.hu_asociado || "---"}
                    </td>

                    <td
                      style={{
                        padding: "10px",
                        fontFamily: "monospace",
                        fontSize: "1.1em",
                      }}
                    >
                      {celda.codigo_celda}
                    </td>

                    <td style={{ textAlign: "center" }}>
                      {celda.es_revision ? (
                        <span
                          style={{
                            background: "#e74c3c",
                            color: "white",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "0.8em",
                          }}
                        >
                          REVISIÓN
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#2ecc71",
                            color: "white",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "0.8em",
                          }}
                        >
                          OK
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => handleBorrarClick(indexOriginal)}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          fontSize: "1.2em",
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
