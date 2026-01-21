import { estilos } from "../../styles/AdminConsulta.styles";

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
    return valor || "";
  };

  return (
    <div style={estilos.cardTabla}>
      <div style={estilos.tablaWrapper}>
        <table style={estilos.tablaModern}>
          <thead>
            <tr>
              {columnasActivas.map((col) => (
                <th key={col.id} style={estilos.thModern}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resultados.map((row, index) => (
              <tr
                key={index}
                style={{
                  backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                {columnasActivas.map((col) => (
                  <td key={col.id} style={estilos.tdModern}>
                    {col.id === "status" ? (
                      <span
                        style={
                          row[col.id] === "OK"
                            ? estilos.badgeOK
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
            ))}
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
