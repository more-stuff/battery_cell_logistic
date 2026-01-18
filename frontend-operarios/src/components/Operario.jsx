import { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print"; // <--- IMPORTANTE
import { usePaquete } from "../hooks/usePaquete";
import Login from "./Login";
import Header from "./Header";
import PanelEscaneo from "./PanelEscaneo";
import PanelHistorico from "./PanelHistorico";
import { Etiqueta } from "./Etiqueta"; // <--- IMPORTANTE
// ... imports y lógica del hook (usePaquete) arriba ...
import "../styles/Operario.css";

function Operario() {
  const [usuario, setUsuario] = useState("");
  const [logueado, setLogueado] = useState(false);

  // Hook con la lógica
  const {
    huActual,
    setHuActual,
    celdaInput,
    setCeldaInput,
    celdas,
    alertaRevision,
    setAlertaRevision,
    enviando,
    idGuardado, // <--- NUEVO
    resetProceso, // <--- NUEVO
    agregarCelda,
    borrarCelda,
    enviarDatos,
    limite,
  } = usePaquete(usuario);

  // 1. CREAMOS LA REFERENCIA PARA LA IMPRESORA
  const componentRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef, // ✅ v3
    documentTitle: `Etiqueta_${idGuardado}`,
    onAfterPrint: () => console.log("Impresión lanzada"),
  });

  // 1. VISTA DE LOGIN (Si no está logueado)
  if (!logueado) {
    return (
      <Login
        usuario={usuario}
        setUsuario={setUsuario}
        onLogin={() => setLogueado(true)}
      />
    );
  }

  // 2. VISTA PRINCIPAL
  return (
    <div className="app-container">
      {/* MODAL (Se mantiene aquí o podrías moverlo a un componente Modal.jsx) */}
      {alertaRevision && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ borderTop: "8px solid #c0392b", maxWidth: "600px" }}
          >
            {/* Cabecera de Alerta */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                marginBottom: "20px",
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
              }}
            >
              <div style={{ fontSize: "2.5rem" }}>⚠️</div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#c0392b",
                    textTransform: "uppercase",
                    fontSize: "1.4rem",
                  }}
                >
                  Protocolo de Calidad Requerido
                </h2>
                <span style={{ fontSize: "0.9rem", color: "#666" }}>
                  PROCESO DE REEMPAQUE DETENIDO TEMPORALMENTE
                </span>
              </div>
            </div>

            {/* Cuerpo del Mensaje */}
            <div
              style={{
                textAlign: "left",
                fontSize: "1.1rem",
                lineHeight: "1.6",
                color: "#333",
              }}
            >
              <p>
                <strong>INSTRUCCIÓN AL OPERARIO:</strong>
              </p>
              <p>
                Se ha alcanzado un intervalo de inspección programada. La
                siguiente unidad a procesar corresponde al consecutivo:
              </p>

              <div
                style={{
                  background: "#f8d7da",
                  padding: "15px",
                  textAlign: "center",
                  borderRadius: "4px",
                  margin: "15px 0",
                  border: "1px solid #f5c6cb",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "0.9rem",
                    color: "#721c24",
                    textTransform: "uppercase",
                  }}
                >
                  Identificador de Secuencia
                </span>
                <strong style={{ fontSize: "2rem", color: "#721c24" }}>
                  #{celdas.length + 1}
                </strong>
              </div>

              <ul style={{ paddingLeft: "20px", margin: "0" }}>
                <li>
                  No introduzca esta pieza en la caja final inmediatamente.
                </li>
                <li>
                  Separe la unidad para{" "}
                  <strong>validación de calidad física</strong>.
                </li>
                <li>Una vez verificada, proceda con el escaneo.</li>
              </ul>
            </div>

            {/* Botón de Acción */}
            <button
              onClick={() => setAlertaRevision(false)}
              style={{
                marginTop: "25px",
                width: "100%",
                padding: "15px",
                background: "#34495e",
                color: "white",
                border: "none",
                fontWeight: "bold",
                fontSize: "1rem",
                textTransform: "uppercase",
                letterSpacing: "1px",
                cursor: "pointer",
              }}
            >
              Confirmar lectura y Reanudar
            </button>
          </div>
        </div>
      )}
      {/* 2. NUEVO MODAL DE ÉXITO (ID TEMPORAL) */}
      {idGuardado && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ width: "500px", borderTop: "8px solid #27ae60" }}
          >
            <h2 style={{ color: "#27ae60", textAlign: "center" }}>
              ✅ CAJA CERRADA
            </h2>
            <p style={{ textAlign: "center", marginBottom: "20px" }}>
              Imprima la etiqueta antes de continuar.
            </p>

            {/* --- VISUALIZACIÓN (PARA EL OJO HUMANO) --- */}
            {/* AQUÍ QUITAMOS EL REF. Solo sirve para que el operario vea que hay una etiqueta. */}
            <div
              style={{
                transform: "scale(0.8)",
                transformOrigin: "top center",
                marginBottom: "-40px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  margin: "20px 0",
                }}
              >
                <Etiqueta
                  id={idGuardado}
                  fecha={new Date().toLocaleDateString()}
                />
              </div>
            </div>

            {/* BOTONERA */}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={handlePrint}
                style={{
                  flex: 1,
                  padding: "15px",
                  background: "#2c3e50",
                  color: "white",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                🖨️ IMPRIMIR ETIQUETA
              </button>

              <button
                onClick={resetProceso}
                style={{
                  flex: 1,
                  padding: "15px",
                  background: "#27ae60",
                  color: "white",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                SIGUIENTE CAJA ➡️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <Header usuario={usuario} progreso={celdas.length} total={limite} />

      {/* GRID PRINCIPAL */}
      <main className="main-grid">
        {/* PANEL IZQUIERDO (ESCANEO) */}
        <PanelEscaneo
          hu={huActual}
          setHu={setHuActual}
          celda={celdaInput}
          setCelda={setCeldaInput}
          onEscanear={agregarCelda}
          onEnviar={enviarDatos}
          enviando={enviando}
          numCeldas={celdas.length}
        />

        {/* PANEL DERECHO (HISTÓRICO) */}
        <div className="historico-container" style={{ position: "relative" }}>
          {/* Botón flotante elegante que no desplaza la tabla */}
          {celdas.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("¿Vaciar lista de escaneos actual?")) {
                  resetProceso();
                }
              }}
              style={{
                position: "absolute",
                right: "15px",
                top: "12px", // Ajusta según la altura de la cabecera del PanelHistorico
                zIndex: 10,
                padding: "5px 10px",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = "#fee2e2")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "#fef2f2")}
            >
              🗑️ LIMPIAR
            </button>
          )}
          <PanelHistorico celdas={celdas} onBorrar={borrarCelda} />
        </div>
      </main>
      {/* Esto está oculto al ojo (display: none) pero SIEMPRE existe en el HTML. */}
      <div
        style={{
          position: "absolute",
          left: "-10000px",
          top: 0,
        }}
      >
        <div ref={componentRef}>
          <Etiqueta
            id={idGuardado ?? ""}
            fecha={new Date().toLocaleDateString()}
          />
        </div>
      </div>
      {/* Al estar fuera del condicional {idGuardado && ...}, React lo encuentra siempre. */}
    </div>
  );
}

export default Operario;
