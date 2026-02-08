import { estilos } from "../../styles/AdminConsulta.styles";

const col_colors = {
  incomming_area: "#83e28e",
  repacking_area: "#e49edd",
  outbound_area: "#f7c7ac",
  powerco_area: "#83cceb",
};

export const AdminTabla = ({
  resultados,
  disponibles,
  seleccionadas,
  loading,
}) => {
  // Filtramos las columnas activas
  const columnasActivas = disponibles.filter((c) =>
    seleccionadas.includes(c.id),
  );

  const formatValor = (row, colId) => {
    let valor = row[colId];

    if (colId.includes("fecha") || colId.includes("caducidad")) {
      return valor ? new Date(valor).toLocaleDateString() : "-";
    }
    if (colId.includes("defective")) {
      return valor ? "defectuosa" : "válida";
    }
    return valor || "";
  };

  return (
    <div style={estilos.cardTabla}>
      <div style={estilos.tablaWrapper}>
        <table style={estilos.tablaModern}>
          <thead>
            <tr>
              {columnasActivas.map((col) => (
                <th
                  key={col.id}
                  style={{
                    ...estilos.thModern,
                    backgroundColor: col_colors[col.group] || "#e5e7eb",
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resultados.map((row, index) => {
              // 👇 1. DETECTAMOS SI ES REVISIÓN
              // (Comprobamos ambas claves por seguridad: 'calidad' o 'estado_calidad')
              const esDefectuosa = row.is_defective;

              // 👇 2. DEFINIMOS EL COLOR DE FONDO
              let bgColor = index % 2 === 0 ? "#ffffff" : "#f9fafb"; // Default alternado
              if (esDefectuosa) bgColor = "#fee2e2"; // Rojo suave si es revisión

              return (
                <tr
                  key={index}
                  style={{
                    backgroundColor: bgColor,
                    borderBottom: "1px solid #e5e7eb",
                    // 👇 3. BORDE ROJO LATERAL SI ES REVISIÓN
                    borderLeft: esDefectuosa ? "5px solid #ef4444" : "none",
                  }}
                >
                  {columnasActivas.map((col) => (
                    <td key={col.id} style={estilos.tdModern}>
                      {/* Lógica especial para mostrar badges bonitos en la columna de Calidad/Status */}
                      {col.id === "status" ||
                      col.id === "estado_calidad" ||
                      col.id === "calidad" ? (
                        <span
                          style={
                            row[col.id] === "OK" || row[col.id] === "PENDING" // PENDING o OK en verde/neutro
                              ? estilos.badgeOK
                              : row[col.id] === "REVISION" // REVISION en rojo fuerte
                                ? {
                                    ...estilos.badgeNeutral,
                                    backgroundColor: "#ef4444",
                                    color: "white",
                                    fontWeight: "bold",
                                  }
                                : estilos.badgeNeutral
                          }
                        >
                          {row[col.id] || "-"}
                        </span>
                      ) : (
                        formatValor(row, col.id)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {resultados.length === 0 && !loading && (
          <div style={estilos.emptyState}>
            <span style={{ fontSize: "2rem" }}>📭</span>
            <p>
              No hay datos que mostrar. Utiliza los filtros y pulsa Enter o
              Buscar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
