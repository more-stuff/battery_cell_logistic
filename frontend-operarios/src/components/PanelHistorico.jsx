import React from "react";
import Swal from "sweetalert2";

export default function PanelHistorico({
  celdas,
  onBorrar,
  onBorrarDesde,
  offsetIndex,
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
      <div className="panel-header">
        <h3>📋 Historial de Caja</h3>
        <span className="count-badge">{celdas.length} pzs</span>
      </div>

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
              {/* 👇 NUEVA COLUMNA */}
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
                  --- Caja vacía ---
                </td>
              </tr>
            ) : (
              // Hacemos copia del array para no mutar el original al invertir
              [...celdas].reverse().map((celda, index) => {
                // Cálculo del número real (porque estamos invirtiendo la vista)
                const indexOriginal = celdas.length - 1 - index;
                const numeroPieza = offsetIndex + indexOriginal + 1;

                return (
                  <tr
                    key={index}
                    style={{
                      borderBottom: "1px solid #eee",
                      backgroundColor: celda.es_revision
                        ? "#fff5f5"
                        : "transparent",
                    }}
                  >
                    <td style={{ padding: "10px", color: "#888" }}>
                      {numeroPieza}
                    </td>

                    {/* 👇 DATO DE LA COLUMNA HU */}
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
