export // --- ESTILOS MEJORADOS ---
const estilos = {
  // 1. Wrapper que ocupa todo el alto disponible y centra el contenido
  wrapper: {
    height: "100%", // Ocupa todo el alto del dashboard
    width: "100%",
    display: "flex", // Flexbox para centrar
    justifyContent: "center", // Horizontalmente
    alignItems: "center", // Verticalmente
    padding: "20px", // Margen de seguridad
    boxSizing: "border-box",
  },
  card: {
    backgroundColor: "white",
    width: "100%",
    maxWidth: "700px", // Ancho máximo elegante
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.15)", // Sombra suave y profunda
    display: "flex",
    flexDirection: "column",
    gap: "30px",
  },
  header: {
    textAlign: "center",
    borderBottom: "2px solid #f0f2f5",
    paddingBottom: "20px",
  },
  titulo: {
    color: "#e67e22",
    margin: "10px 0 5px 0",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr", // Dos columnas iguales
    gap: "20px",
  },
  grupo: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  grupoFull: {
    // Para campos que ocupan todo el ancho
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
  },
  label: {
    fontWeight: "bold",
    fontSize: "0.85rem",
    color: "#7f8c8d",
    textTransform: "uppercase",
    marginLeft: "4px",
  },
  input: {
    width: "100%", // <--- CLAVE: Ocupa todo el ancho disponible
    boxSizing: "border-box", // <--- CLAVE: El padding no rompe el ancho
    padding: "15px",
    fontSize: "1.1rem",
    borderRadius: "10px",
    border: "2px solid #ecf0f1",
    outline: "none",
    transition: "border-color 0.3s",
    color: "#2c3e50",
  },
  boton: {
    width: "100%",
    padding: "18px",
    backgroundColor: "#e67e22",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "1.2rem",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "10px",
    boxShadow: "0 5px 15px rgba(230, 126, 34, 0.3)",
    transition: "transform 0.2s",
  },
};
