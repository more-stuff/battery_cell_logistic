import React from "react";
import Swal from "sweetalert2";
export default function PanelHistorico({ celdas, onBorrar }) {
  const handleBorrar = (index) => {
    Swal.fire({
      title: "¿Borrar lectura?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        onBorrar(index); // <--- Llamamos al hook solo si confirma
        Swal.fire("¡Borrado!", "La lectura ha sido eliminada.", "success");
      }
    });
  };

  return (
    <section className="panel history-panel">
      <div className="panel-header">
        <h3>📋 Histórico del Paquete</h3>
        <span className="badge">{celdas.length} Items</span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Cód. Pieza</th>
              <th>Cód. Caja (HU)</th>
              <th style={{ textAlign: "center" }}>Estado</th>
              <th style={{ textAlign: "center" }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {celdas.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="empty-state"
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  Esperando escaneos...
                </td>
              </tr>
            ) : (
              // Usamos slice() para crear una copia antes de reverse() y no mutar el original
              [...celdas]
                .map((celda, index) => {
                  // Como invertimos el array visualmente, el índice real es distinto
                  // Pero para mostrar el número de pieza, usamos el indice original + 1
                  // Nota: Si quieres que el #1 sea siempre el primero escaneado, usa el index original.

                  return (
                    <tr
                      key={celda.id}
                      className={
                        index === celdas.length - 1 ? "row-highlight" : ""
                      }
                    >
                      {/* Ajuste visual: mostramos el número real de la pieza */}
                      <td>{celdas.indexOf(celda) + 1}</td>

                      <td className="font-mono">{celda.codigo_celda}</td>
                      <td className="text-muted">{celda.hu_asociado}</td>

                      <td style={{ textAlign: "center" }}>
                        {celda.es_revision ? (
                          <span className="tag tag-review">REVISIÓN</span>
                        ) : (
                          <span className="tag tag-ok">OK</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn-trash"
                          onClick={() => handleBorrar(celdas.indexOf(celda))} // Borramos usando el índice real
                          title="Eliminar registro"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })
                .reverse() // Invertimos el orden visual (el último arriba)
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
