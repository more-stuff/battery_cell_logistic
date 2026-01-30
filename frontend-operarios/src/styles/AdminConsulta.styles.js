export const estilos = {
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
  buttonGroup: {
    display: "flex",
    width: "100%",
    height: "42px", // Misma altura que tus inputs
    borderRadius: "6px",
    overflow: "hidden",
    border: "1px solid #cbd5e1", // Color borde gris suave
    backgroundColor: "white",
  },
  btnSegment: {
    flex: 1, // Ocupan exactamente 33% cada uno
    border: "none",
    backgroundColor: "white",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#64748b",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    padding: "0",
  },
  // Estilos cuando están activos
  activeTodos: {
    backgroundColor: "#3b82f6", // Azul
    color: "white",
  },
  activeOK: {
    backgroundColor: "#22c55e", // Verde
    color: "white",
  },
  activeNOK: {
    backgroundColor: "#ef4444", // Rojo
    color: "white",
  },
};
