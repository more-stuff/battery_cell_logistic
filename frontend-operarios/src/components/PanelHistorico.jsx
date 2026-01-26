import React from "react";
import Swal from "sweetalert2";
export default function PanelHistorico({
  celdas,
  onBorrar,
  onBorrarDesde,
  offsetIndex,
}) {
  const handleBorrarClick = (indexVisual) => {
    // Calculem l'índex real dins de l'array global
    const indexReal = offsetIndex + indexVisual;

    Swal.fire({
      title: "¿Què vols fer?",
      text: `Estàs a la peça #${indexReal + 1}`,
      icon: "question",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonColor: "#d33", // Vermell per acció forta
      denyButtonColor: "#f39c12", // Taronja per acció suau
      cancelButtonColor: "#3085d6",
      confirmButtonText: "🧨 Esborrar des d'aquí fins al final",
      denyButtonText: "🗑️ Esborrar només aquesta",
      cancelButtonText: "Cancel·lar",
    }).then((result) => {
      if (result.isConfirmed) {
        // Opció 1: Esborrar en massa
        onBorrarDesde(indexReal);
        Swal.fire(
          "Netejat!",
          "S'han esborrat les peces posteriors.",
          "success",
        );
      } else if (result.isDenied) {
        // Opció 2: Esborrar només una
        onBorrar(indexReal);
        Swal.fire("Esborrat!", "La lectura ha estat eliminada.", "success");
      }
    });
  };

  return (
    <section className="panel history-panel">
      <div className="panel-header">
        <h3>📋 Històric (Nivell Actual)</h3>
        <span className="badge">{celdas.length} Items</span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Codi Peça</th>
              <th>Estat</th>
              <th style={{ textAlign: "center" }}>Acció</th>
            </tr>
          </thead>
          <tbody>
            {celdas.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="empty-state"
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  Esperant escanejos al nivell actual...
                </td>
              </tr>
            ) : (
              [...celdas]
                .map((celda, indexVisual) => {
                  const esUltimo = indexVisual === celdas.length - 1;
                  // Número real per mostrar a l'usuari
                  const numeroReal = offsetIndex + indexVisual + 1;

                  return (
                    <tr
                      key={celda.id}
                      className={esUltimo ? "row-highlight" : ""}
                    >
                      {/* Mostrem el número real (Ex: 46, 47...) */}
                      <td>{numeroReal}</td>

                      <td
                        className="font-mono"
                        style={{
                          fontWeight: celda.es_revision ? "bold" : "normal",
                        }}
                      >
                        {celda.codigo_celda}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {celda.es_revision ? (
                          <span
                            className="tag tag-review"
                            style={{
                              backgroundColor: "#ef4444",
                              color: "white",
                            }}
                          >
                            ⚠️ REVISIÓ
                          </span>
                        ) : (
                          <span className="tag tag-ok">OK</span>
                        )}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn-trash"
                          onClick={() => handleBorrarClick(indexVisual)}
                          title="Opcions d'esborrat"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })
                .reverse()
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
