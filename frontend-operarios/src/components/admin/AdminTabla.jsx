import { useEffect, useRef } from "react";
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
  const scrollSuperiorRef = useRef(null);
  const tablaWrapperRef = useRef(null);
  const anchoScrollRef = useRef(null);

  useEffect(() => {
    const actualizarAncho = () => {
      if (!tablaWrapperRef.current || !anchoScrollRef.current) return;

      anchoScrollRef.current.style.width = `${tablaWrapperRef.current.scrollWidth}px`;
    };

    actualizarAncho();

    const observer = new ResizeObserver(actualizarAncho);

    if (tablaWrapperRef.current) {
      observer.observe(tablaWrapperRef.current);
    }

    return () => observer.disconnect();
  }, [resultados, seleccionadas]);

  const sincronizarDesdeSuperior = (event) => {
    if (!tablaWrapperRef.current) return;

    tablaWrapperRef.current.scrollLeft = event.currentTarget.scrollLeft;
  };

  const sincronizarDesdeTabla = (event) => {
    if (!scrollSuperiorRef.current) return;

    scrollSuperiorRef.current.scrollLeft = event.currentTarget.scrollLeft;
  };

  // Filtramos las columnas activas
  const columnasActivas = disponibles.filter((c) =>
    seleccionadas.includes(c.id),
  );

  const formatValor = (row, colId) => {
    let valor = row[colId];

    if (colId === "tipo_caja") {
      if (valor === "CADUCIDAD_PROXIMA") return "Caducidad próxima";
      if (valor === "DEFECTUOSA") return "Defectuosa";
      if (valor === "NORMAL") return "Normal";

      // Fallback por compatibilidad si alguna fila vieja no trae tipo_caja
      return row.is_defective ? "Defectuosa" : "Normal";
    }

    if (colId.includes("fecha") || colId.includes("caducidad")) {
      return valor ? new Date(valor).toLocaleDateString() : "-";
    }

    if (colId.includes("defective")) {
      return valor ? "defectuosa" : "válida";
    }

    if (colId.includes("posicion")) {
      return valor + 1;
    }

    return valor ?? "";
  };

  return (
    <div style={estilos.cardTabla}>
      <div
        ref={scrollSuperiorRef}
        onScroll={sincronizarDesdeSuperior}
        style={estilos.scrollHorizontalSuperior}
      >
        <div
          ref={anchoScrollRef}
          style={estilos.scrollHorizontalSuperiorContenido}
        />
      </div>

      <div
        ref={tablaWrapperRef}
        onScroll={sincronizarDesdeTabla}
        style={estilos.tablaWrapper}
      >
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
              const tipoCaja =
                row.tipo_caja || (row.is_defective ? "DEFECTUOSA" : "NORMAL");

              const esDefectuosa = tipoCaja === "DEFECTUOSA";
              const esCaducidadProxima = tipoCaja === "CADUCIDAD_PROXIMA";

              let bgColor = index % 2 === 0 ? "#ffffff" : "#f9fafb";

              if (esDefectuosa) bgColor = "#fee2e2";
              if (esCaducidadProxima) bgColor = "#fff7ed";

              return (
                <tr
                  key={index}
                  style={{
                    backgroundColor: bgColor,
                    borderBottom: "1px solid #e5e7eb",
                    borderLeft: esDefectuosa
                      ? "5px solid #ef4444"
                      : esCaducidadProxima
                        ? "5px solid #f59e0b"
                        : "none",
                  }}
                >
                  {columnasActivas.map((col) => (
                    <td key={col.id} style={estilos.tdModern}>
                      {col.id === "status" ||
                      col.id === "estado_calidad" ||
                      col.id === "calidad" ? (
                        <span
                          style={
                            row[col.id] === "OK" || row[col.id] === "PENDING"
                              ? estilos.badgeOK
                              : row[col.id] === "REVISION"
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
