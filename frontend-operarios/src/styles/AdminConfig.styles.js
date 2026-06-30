export const estilos = {
  contenedor: {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
    padding: "0 4px 24px",
    color: "#253446",
    boxSizing: "border-box",
  },

  cabecera: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
    marginBottom: 22,
  },

  kicker: {
    margin: "0 0 6px",
    color: "#55708a",
    fontSize: "0.72rem",
    fontWeight: 800,
    letterSpacing: "0.12em",
  },

  titulo: {
    margin: 0,
    color: "#203247",
    fontSize: "2rem",
    lineHeight: 1.15,
  },

  subtitulo: {
    margin: "10px 0 0",
    maxWidth: 710,
    color: "#607489",
    fontSize: "0.98rem",
    lineHeight: 1.45,
  },

  indicadorActivo: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    marginTop: 5,
    padding: "9px 12px",
    border: "1px solid #c6d9e9",
    borderRadius: 999,
    background: "#f8fbfe",
    color: "#2c5f88",
    fontSize: "0.88rem",
    fontWeight: 700,
  },

  indicadorPunto: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#2a9d8f",
  },

  selectorZona: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
    padding: "18px 20px",
    border: "1px solid #dfe8ef",
    borderRadius: 14,
    background: "#ffffff",
    boxShadow: "0 2px 7px rgba(32, 50, 71, 0.05)",
  },

  selectorTitulo: {
    margin: 0,
    color: "#2d4054",
    fontSize: "1.05rem",
  },

  selectorDescripcion: {
    margin: "6px 0 0",
    color: "#718399",
    fontSize: "0.88rem",
    lineHeight: 1.45,
  },

  selectorModelos: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(175px, 1fr))",
    gap: 10,
    width: 430,
    maxWidth: "100%",
  },

  botonModelo: {
    padding: "13px 15px",
    border: "1px solid #d8e2eb",
    borderRadius: 10,
    background: "#fbfdff",
    color: "#566b80",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "0.18s ease",
  },

  botonModeloActivo: {
    border: "1px solid #2d7db8",
    background: "#edf7ff",
    color: "#1f5d91",
    boxShadow: "0 0 0 3px rgba(45, 125, 184, 0.12)",
  },

  botonModeloTitulo: {
    display: "block",
    marginBottom: 4,
    fontSize: "0.9rem",
    fontWeight: 750,
  },

  botonModeloDescripcion: {
    display: "block",
    fontSize: "0.76rem",
    lineHeight: 1.35,
  },

  estadoCarga: {
    display: "grid",
    minHeight: 220,
    placeItems: "center",
    border: "1px solid #dfe8ef",
    borderRadius: 14,
    background: "#ffffff",
    color: "#607489",
    fontWeight: 600,
  },

  contenido: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  avisoModelo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 15px",
    border: "1px solid #c9e7de",
    borderRadius: 10,
    background: "#eef8f5",
    color: "#38635b",
    fontSize: "0.9rem",
  },

  seccion: {
    padding: 22,
    border: "1px solid #dfe8ef",
    borderRadius: 14,
    background: "#ffffff",
    boxShadow: "0 2px 7px rgba(32, 50, 71, 0.04)",
  },

  seccionCabecera: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
  },

  seccionTitulo: {
    margin: 0,
    color: "#2d4054",
    fontSize: "1.05rem",
  },

  seccionDescripcion: {
    margin: "6px 0 0",
    color: "#718399",
    fontSize: "0.88rem",
    lineHeight: 1.45,
  },

  gridTres: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
  },

  gridDos: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
  },

  campo: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: 7,
  },

  campoEtiqueta: {
    color: "#41566d",
    fontSize: "0.88rem",
    fontWeight: 750,
  },

  inputConSufijo: {
    display: "flex",
    alignItems: "stretch",
    minHeight: 42,
  },

  inputNumero: {
    width: "100%",
    minWidth: 0,
    padding: "10px 11px",
    border: "1px solid #cfdbe5",
    borderRadius: "8px 0 0 8px",
    outline: "none",
    background: "#ffffff",
    color: "#2a3a4c",
    fontSize: "0.95rem",
    boxSizing: "border-box",
  },

  select: {
    width: "100%",
    minWidth: 0,
    padding: "10px 11px",
    border: "1px solid #cfdbe5",
    borderRadius: 8,
    outline: "none",
    background: "#ffffff",
    color: "#2a3a4c",
    fontSize: "0.95rem",
    boxSizing: "border-box",
  },

  sufijo: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0 10px",
    border: "1px solid #cfdbe5",
    borderLeft: "none",
    borderRadius: "0 8px 8px 0",
    background: "#f5f8fa",
    color: "#66798e",
    fontSize: "0.8rem",
    whiteSpace: "nowrap",
  },

  ayuda: {
    color: "#7d8ea1",
    fontSize: "0.77rem",
    lineHeight: 1.35,
  },

  botonPrimario: {
    padding: "10px 14px",
    border: "none",
    borderRadius: 8,
    background: "#2d7db8",
    color: "#ffffff",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontWeight: 750,
    fontSize: "0.9rem",
  },

  botonDeshabilitado: {
    opacity: 0.7,
    cursor: "wait",
  },

  calidadContenido: {
    display: "grid",
    gridTemplateColumns:
      "minmax(240px, 1fr) minmax(190px, 0.7fr) minmax(210px, 0.8fr)",
    alignItems: "end",
    gap: 16,
  },

  resumenCalidad: {
    display: "flex",
    minHeight: 42,
    alignItems: "center",
    padding: "9px 11px",
    borderRadius: 8,
    background: "#f3f8fc",
    color: "#49657e",
    fontSize: "0.82rem",
    lineHeight: 1.35,
    boxSizing: "border-box",
  },

  seccionGlobal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    padding: 22,
    border: "1px solid #f1d7d2",
    borderRadius: 14,
    background: "#fffafa",
  },

  etiquetaGlobal: {
    margin: "0 0 6px",
    color: "#b24a3a",
    fontSize: "0.7rem",
    fontWeight: 800,
    letterSpacing: "0.12em",
  },

  botonPeligro: {
    flexShrink: 0,
    padding: "10px 14px",
    border: "none",
    borderRadius: 8,
    background: "#c0392b",
    color: "#ffffff",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontWeight: 750,
    fontSize: "0.9rem",
  },
  importacionDefectuosos: {
    padding: 22,
    border: "1px solid #f1d7d2",
    borderRadius: 14,
    background: "#fffafa",
  },

  importacionCabecera: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },

  importacionEtiqueta: {
    margin: "0 0 6px",
    color: "#b24a3a",
    fontSize: "0.7rem",
    fontWeight: 800,
    letterSpacing: "0.12em",
  },

  importacionTitulo: {
    margin: 0,
    color: "#2d4054",
    fontSize: "1.05rem",
  },

  importacionTexto: {
    margin: "6px 0 0",
    color: "#718399",
    fontSize: "0.88rem",
    lineHeight: 1.45,
  },

  formatoCsvGrid: {
    display: "grid",
    gridTemplateColumns: "250px minmax(0, 1fr)",
    gap: 20,
    marginTop: 18,
  },

  formatoEjemplo: {
    padding: 16,
    border: "1px solid #f0d8d3",
    borderRadius: 10,
    background: "#ffffff",
  },

  formatoTitulo: {
    display: "block",
    marginBottom: 10,
    color: "#4c6176",
    fontSize: "0.78rem",
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },

  formatoCodigo: {
    margin: 0,
    padding: 12,
    borderRadius: 8,
    background: "#243447",
    color: "#f8fafc",
    fontFamily: "'Consolas', 'Courier New', monospace",
    fontSize: "0.82rem",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },

  formatoReglas: {
    minWidth: 0,
  },

  formatoLista: {
    margin: 0,
    paddingLeft: 20,
    color: "#516579",
    fontSize: "0.85rem",
    lineHeight: 1.7,
  },

  formatoAviso: {
    marginTop: 12,
    padding: "10px 12px",
    border: "1px solid #f3d28a",
    borderRadius: 8,
    background: "#fff8e8",
    color: "#8a5a00",
    fontSize: "0.82rem",
    lineHeight: 1.45,
  },

  importacionAcciones: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    marginTop: 18,
    paddingTop: 16,
    borderTop: "1px solid #f0d8d3",
  },

  importacionAyuda: {
    color: "#718399",
    fontSize: "0.8rem",
    lineHeight: 1.4,
  },
};
