// OperarioDefectuoso.jsx
import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { usePaquete } from "../hooks/usePaquete"; // Reutilizamos tu hook
import Login from "./Login";
import Header from "./Header";
import PanelEscaneo from "./PanelEscaneo";
import PanelHistorico from "./PanelHistorico";
import { Etiqueta } from "./Etiqueta";

import "../styles/Operario.css";

export default function OperarioDefectuoso() {
  const [usuario, setUsuario] = useState("");
  const [logueado, setLogueado] = useState(false);

  // Hook original
  const {
    huActual,
    setHuActual,
    celdaInput,
    setCeldaInput,
    celdas,
    enviando,
    idGuardado,
    resetProceso,
    agregarCelda, // <--- ESTA ES LA QUE VAMOS A INTERCEPTAR
    borrarCelda,
    borrarDesde,
    enviarDatos,
    limite,
    limite_defectuosas,
    level_size,
  } = usePaquete(usuario);

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Etiqueta_SCRAP_${idGuardado}`,
  });

  // Calculos visuales
  const indexIniciNivell = Math.max(
    0,
    Math.floor((celdas.length - 1) / level_size) * level_size,
  );
  const celdas_visuales = celdas.slice(indexIniciNivell);

  if (!logueado) {
    return (
      <Login
        usuario={usuario}
        setUsuario={setUsuario}
        onLogin={() => setLogueado(true)}
        esDefectuoso={true}
      />
    );
  }

  return (
    // Usamos un fondo ligeramente rojizo para diferenciar toda la app
    <div className="app-container" style={{ borderTop: "5px solid #c0392b" }}>
      {idGuardado && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ width: "500px", borderTop: "8px solid #c0392b" }}
          >
            <h2 style={{ color: "#c0392b", textAlign: "center" }}>
              ⚠️ CAJA SCRAP CERRADA
            </h2>
            <p style={{ textAlign: "center" }}>
              Etiqueta de producto NO CONFORME generada.
            </p>

            {/* Visualización Etiqueta */}
            <div style={{ transform: "scale(0.8)", marginBottom: "-40px" }}>
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
                  op_id={usuario}
                  esDefectuoso={true}
                />
              </div>
            </div>

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
                🖨️ IMPRIMIR
              </button>
              <button
                onClick={resetProceso}
                style={{
                  flex: 1,
                  padding: "15px",
                  background: "#c0392b",
                  color: "white",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                SIGUIENTE ➡️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header con estilo de Alerta */}
      <Header
        usuario={usuario}
        progreso={celdas.length}
        total={limite_defectuosas}
      />
      <div
        style={{
          background: "#c0392b",
          color: "white",
          textAlign: "center",
          padding: "5px",
          fontWeight: "bold",
        }}
      >
        MODO: REGISTRO DE DEFECTUOSAS
      </div>

      <main className="main-grid">
        <PanelEscaneo
          hu={huActual}
          setHu={setHuActual}
          celda={celdaInput}
          setCelda={setCeldaInput}
          onEscanear={agregarCelda}
          onEnviar={enviarDatos}
          enviando={enviando}
          numCeldas={celdas.length}
          limite={limite_defectuosas}
          celdas={celdas}
          modoDefectuoso={true} // <--- ACTIVAMOS EL MODO ROJO
        />

        <div
          className="historico-container"
          style={{ position: "relative", height: "100%", overflow: "hidden" }}
        >
          <PanelHistorico
            celdas={celdas_visuales}
            onBorrar={borrarCelda}
            offsetIndex={indexIniciNivell}
            onBorrarDesde={borrarDesde}
          />
        </div>
      </main>

      <div className="print-label">
        <div ref={componentRef}>
          <Etiqueta
            id={idGuardado ?? ""}
            fecha={new Date().toLocaleDateString()}
            op_id={usuario}
            esDefectuoso={true}
          />
        </div>
      </div>
    </div>
  );
}
