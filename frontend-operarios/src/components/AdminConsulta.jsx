import { useState } from "react";
import { buscarPreview, descargarCSV } from "../services/api";

export const AdminConsulta = () => {
  // --- 1. ESTADOS ---
  const [filtros, setFiltros] = useState({
    dmc: "",
    hu_entrada: "",
    hu_salida: "",
    fecha_caducidad: "",
    fecha_inicio: "",
    fecha_fin: "",
  });

  const [resultados, setResultados] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCSV, setLoadingCSV] = useState(false);

  // --- 2. LÓGICA ---

  const handleChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  // Botones Rápidos de Fecha
  const setFechaRapida = (tipo) => {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split("T")[0];
    let inicio = new Date();

    if (tipo === "semana") {
      inicio.setDate(hoy.getDate() - 7);
    } else if (tipo === "mes") {
      inicio.setMonth(hoy.getMonth() - 1);
    }

    setFiltros({
      ...filtros,
      fecha_inicio: inicio.toISOString().split("T")[0],
      fecha_fin: hoyStr,
    });
  };

  // LIMPIAR TODO
  const limpiarTodo = () => {
    setFiltros({
      dmc: "",
      hu_entrada: "",
      hu_salida: "",
      fecha_caducidad: "",
      fecha_inicio: "",
      fecha_fin: "",
    });
    setResultados([]);
  };

  // Buscar (Vista Previa)
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoadingPreview(true);
    try {
      const data = await buscarPreview(filtros);
      setResultados(data);
      if (data.length === 0) alert("⚠️ No hay resultados con estos filtros.");
    } catch (error) {
      console.error(error);
      alert("❌ Error de conexión");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Descargar CSV
  const handleDownload = async () => {
    setLoadingCSV(true);
    try {
      await descargarCSV(filtros);
    } catch (error) {
      console.error(error);
      alert("❌ Error al descargar");
    } finally {
      setLoadingCSV(false);
    }
  };

  // Formateadores
  const fFecha = (f) => (f ? new Date(f).toLocaleDateString() : "-");
  const fFechaHora = (f) => (f ? new Date(f).toLocaleString() : "-");

  // --- 3. RENDERIZADO ---
  return (
    <div style={estilos.contenedorPrincipal}>
      <div style={estilos.headerContainer}>
        <h2 style={estilos.titulo}>🔍 Trazabilidad y Consultas</h2>
        <p style={estilos.subtitulo}>
          Filtra y descarga la información de celdas y movimientos.
        </p>
      </div>

      {/* === PANEL DE FILTROS (CARD) === */}
      <div style={estilos.cardFiltros}>
        <div style={estilos.gridFiltros}>
          {/* COLUMNA 1: Textos */}
          <div style={estilos.columnaGrid}>
            <label style={estilos.labelModern}>DMC Celda</label>
            <input
              name="dmc"
              value={filtros.dmc}
              onChange={handleChange}
              style={estilos.inputModern}
              placeholder="Ej: A1-B2..."
            />

            <label style={estilos.labelModern}>HU Entrada (Proveedor)</label>
            <input
              name="hu_entrada"
              value={filtros.hu_entrada}
              onChange={handleChange}
              style={estilos.inputModern}
              placeholder="Ej: SUP-123"
            />

            <label style={estilos.labelModern}>HU Salida / Caja ID</label>
            <input
              name="hu_salida"
              value={filtros.hu_salida}
              onChange={handleChange}
              style={estilos.inputModern}
              placeholder="Ej: SIL-999"
            />
          </div>

          {/* COLUMNA 2: Fechas */}
          <div style={estilos.columnaGrid}>
            <label style={estilos.labelModern}>Fecha Caducidad</label>
            <input
              type="date"
              name="fecha_caducidad"
              value={filtros.fecha_caducidad}
              onChange={handleChange}
              style={estilos.inputModern}
            />

            <label style={estilos.labelModern}>Escaneado Desde</label>
            <input
              type="date"
              name="fecha_inicio"
              value={filtros.fecha_inicio}
              onChange={handleChange}
              style={estilos.inputModern}
            />

            <label style={estilos.labelModern}>Escaneado Hasta</label>
            <input
              type="date"
              name="fecha_fin"
              value={filtros.fecha_fin}
              onChange={handleChange}
              style={estilos.inputModern}
            />
          </div>
        </div>

        {/* BARRA DE HERRAMIENTAS INFERIOR */}
        <div style={estilos.toolbarFooter}>
          {/* Izquierda: Atajos y Limpieza */}
          <div style={estilos.toolbarLeft}>
            <span style={estilos.labelAtajos}>ATAJOS:</span>
            <div style={estilos.atajosGroup}>
              <button
                onClick={() => setFechaRapida("hoy")}
                style={estilos.btnAtajo}
              >
                Hoy
              </button>
              <button
                onClick={() => setFechaRapida("semana")}
                style={estilos.btnAtajo}
              >
                Semana
              </button>
              <button
                onClick={() => setFechaRapida("mes")}
                style={estilos.btnAtajo}
              >
                Mes
              </button>
            </div>
            <div style={estilos.dividerVertical}></div>
            <button
              onClick={limpiarTodo}
              style={estilos.btnLimpiarModern}
              title="Borrar todos los filtros"
            >
              <span>Borrar Filtros</span> 🗑️
            </button>
          </div>

          {/* Derecha: Acciones Principales */}
          <div style={estilos.toolbarRight}>
            <button
              onClick={handleSearch}
              disabled={loadingPreview}
              style={estilos.btnActionPrimary}
            >
              {loadingPreview ? "Cargando..." : "🔍 Vista Previa"}
            </button>
            <button
              onClick={handleDownload}
              disabled={loadingCSV}
              style={estilos.btnActionSecondary}
            >
              {loadingCSV ? "Generando..." : "📥 Descargar Excel"}
            </button>
          </div>
        </div>
      </div>

      {/* === TABLA DE RESULTADOS (CARD) === */}
      <div style={estilos.cardTabla}>
        <div style={estilos.tablaWrapper}>
          <table style={estilos.tablaModern}>
            <thead>
              <tr>
                <th style={estilos.thModern}>F. Recibo</th>
                <th style={estilos.thModern}>AWB</th>
                <th style={estilos.thModern}>NP Packing</th>
                <th style={estilos.thModern}>Status</th>
                <th style={estilos.thModern}>HU Proveedor</th>
                <th style={estilos.thModern}>Cad. Inbound</th>
                <th style={estilos.thModern}>F. Reempaque</th>
                <th style={estilos.thModern}>Reg. Silena</th>
                <th style={estilos.thModern}>DMC (Celda)</th>
                <th style={estilos.thModern}>Cad. Celda</th>
                <th style={estilos.thModern}>Cad. Antigua</th>
                <th style={estilos.thModern}>F. Almacén</th>
                <th style={estilos.thModern}>HU Silena</th>
                <th style={estilos.thModern}>Ubicación</th>
                <th style={estilos.thModern}>Nº Salida</th>
                <th style={estilos.thModern}>HU Final</th>
                <th style={estilos.thModern}>F. Envío</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((row, index) => {
                // Efecto cebra para las filas
                const bgRow = index % 2 === 0 ? "#ffffff" : "#f9fafb";
                return (
                  <tr
                    key={index}
                    style={{
                      backgroundColor: bgRow,
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <td style={estilos.tdModern}>{fFecha(row.fecha_recibo)}</td>
                    <td style={estilos.tdModern}>{row.awb}</td>
                    <td style={estilos.tdModern}>{row.np}</td>
                    <td style={estilos.tdModern}>
                      <span
                        style={
                          row.status === "OK"
                            ? estilos.badgeOK
                            : estilos.badgeNeutral
                        }
                      >
                        {row.status || "-"}
                      </span>
                    </td>
                    <td
                      style={{
                        ...estilos.tdModern,
                        fontWeight: 600,
                        color: "#2563eb",
                      }}
                    >
                      {row.hu_proveedor}
                    </td>
                    <td style={estilos.tdModern}>{row.caducidad_inbound}</td>
                    <td style={estilos.tdModern}>
                      {fFechaHora(row.fecha_reempaque)}
                    </td>
                    <td style={estilos.tdModern}>{row.registro_silena}</td>
                    <td
                      style={{
                        ...estilos.tdModern,
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      {row.dmc}
                    </td>
                    <td style={estilos.tdModern}>{row.caducidad_celda}</td>
                    <td style={estilos.tdModern}>{row.caducidad_antigua}</td>
                    <td style={estilos.tdModern}>
                      {fFechaHora(row.fecha_almacenamiento)}
                    </td>
                    <td style={{ ...estilos.tdModern, fontWeight: 600 }}>
                      {row.hu_silena}
                    </td>
                    <td style={estilos.tdModern}>{row.ubicacion}</td>
                    <td style={estilos.tdModern}>{row.n_salida}</td>
                    <td style={estilos.tdModern}>{row.hu_final}</td>
                    <td style={estilos.tdModern}>
                      {fFechaHora(row.fecha_envio)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {resultados.length === 0 && !loadingPreview && (
            <div style={estilos.emptyState}>
              <span style={{ fontSize: "2rem" }}>📭</span>
              <p>No hay datos que mostrar. Utiliza los filtros para empezar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- ESTILOS MODERNOS Y AJUSTADOS (CSS-IN-JS) ---
const estilos = {
  contenedorPrincipal: {
    padding: "30px",
    minHeight: "100vh", // <--- CAMBIO CLAVE: Ocupa toda la altura de la pantalla
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: "#f3f4f6",
    color: "#1f2937",
  },
  headerContainer: {
    marginBottom: "20px",
  },
  titulo: {
    fontSize: "1.8rem",
    fontWeight: "800",
    color: "#111827",
    margin: "0 0 5px 0",
    letterSpacing: "-0.025em",
  },
  subtitulo: {
    color: "#6b7280",
    margin: 0,
    fontSize: "1rem",
  },

  // --- CARD FILTROS ---
  cardFiltros: {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "16px",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    marginBottom: "25px",
    flexShrink: 0, // Evita que los filtros se aplasten si falta espacio
  },
  gridFiltros: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
    marginBottom: "25px",
  },
  columnaGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  labelModern: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "5px",
    display: "block",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  inputModern: {
    width: "100%",
    padding: "12px 15px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    backgroundColor: "#f9fafb",
    boxSizing: "border-box",
  },

  // --- TOOLBAR ---
  toolbarFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
  },
  toolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },
  labelAtajos: {
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: "0.05em",
  },
  atajosGroup: {
    display: "flex",
    gap: "8px",
  },
  btnAtajo: {
    padding: "8px 16px",
    backgroundColor: "#f3f4f6",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#4b5563",
    transition: "all 0.2s",
  },
  dividerVertical: {
    height: "24px",
    width: "1px",
    backgroundColor: "#d1d5db",
  },
  btnLimpiarModern: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "transparent",
    border: "1px solid #ef4444",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#ef4444",
    transition: "all 0.2s",
  },
  toolbarRight: {
    display: "flex",
    gap: "12px",
  },
  btnActionPrimary: {
    padding: "12px 24px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.95rem",
    boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
  },
  btnActionSecondary: {
    padding: "12px 24px",
    backgroundColor: "#059669",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.95rem",
    boxShadow: "0 4px 6px -1px rgba(5, 150, 105, 0.2)",
  },

  // --- TABLA RESULTADOS ---
  cardTabla: {
    flex: 1, // Intenta ocupar el espacio restante
    minHeight: "600px", // <--- CAMBIO CLAVE: Altura mínima garantizada (hazla más grande si quieres, ej: 800px)
    backgroundColor: "white",
    borderRadius: "16px",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  tablaWrapper: {
    flex: 1,
    overflow: "auto",
  },
  tablaModern: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "2200px", // Scroll horizontal
    fontSize: "0.9rem",
  },
  thModern: {
    padding: "16px 12px",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "#4b5563",
    backgroundColor: "#f9fafb",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    position: "sticky",
    top: 0,
    borderBottom: "2px solid #e5e7eb",
    whiteSpace: "nowrap",
    zIndex: 10,
  },
  tdModern: {
    padding: "14px 12px",
    color: "#1f2937",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  },
  emptyState: {
    padding: "80px",
    textAlign: "center",
    color: "#9ca3af",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "15px",
    fontWeight: "500",
    fontSize: "1.1rem",
  },
  badgeOK: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "0.75rem",
    fontWeight: "700",
  },
  badgeNeutral: {
    backgroundColor: "#f3f4f6",
    color: "#4b5563",
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "0.75rem",
    fontWeight: "600",
  },
};
