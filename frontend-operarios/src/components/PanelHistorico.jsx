import React from "react";
import Swal from "sweetalert2";

export default function PanelHistorico({
  celdas,
  onBorrar,
  onBorrarDesde,
  offsetIndex,
}) {
  const handleBorrarClick = (indexVisual) => {
    // Calculamos el índice real dentro del array global
    const indexReal = offsetIndex + indexVisual;

    Swal.fire({
      title: "¿Qué quieres hacer?",
      text: `Estás en la pieza #${indexReal + 1}`,
      icon: "question",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonColor: "#d33", // Rojo para acción fuerte
      denyButtonColor: "#f39c12", // Naranja para acción suave
      cancelButtonColor: "#3085d6",
      confirmButtonText: "🧨 Borrar desde aquí hasta el final",
      denyButtonText: "🗑️ Borrar solo esta",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        // Opción 1: Borrar en masa
        onBorrarDesde(indexReal);
        Swal.fire(
          "¡Limpiado!",
          "Se han borrado las piezas posteriores.",
          "success",
        );
      } else if (result.isDenied) {
        // Opción 2: Borrar solo una
        onBorrar(indexReal);
        Swal.fire("¡Borrado!", "La lectura ha sido eliminada.", "success");
      }
    });
  };

  return (
    <section className="panel history-panel">
      <div className="panel-header">
        <h3>📋 Histórico (Nivel Actual)</h3>
        <span className="badge">{celdas.length} Items</span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Código Pieza</th>
              <th>Estado</th>
              <th style={{ textAlign: "center" }}>Acción</th>
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
                  Esperando escaneos en el nivel actual...
                </td>
              </tr>
            ) : (
              [...celdas]
                .map((celda, indexVisual) => {
                  const esUltimo = indexVisual === celdas.length - 1;
                  // Número real para mostrar al usuario
                  const numeroReal = offsetIndex + indexVisual + 1;

                  return (
                    <tr
                      key={celda.id}
                      className={esUltimo ? "row-highlight" : ""}
                    >
                      {/* Mostramos el número real (Ej: 46, 47...) */}
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
                            ⚠️ REVISIÓN
                          </span>
                        ) : (
                          <span className="tag tag-ok">OK</span>
                        )}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn-trash"
                          onClick={() => handleBorrarClick(indexVisual)}
                          title="Opciones de borrado"
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
