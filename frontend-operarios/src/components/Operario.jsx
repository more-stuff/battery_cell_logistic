import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { usePaquete } from "../hooks/usePaquete";
import Login from "./Login";
import Header from "./Header";
import PanelEscaneo from "./PanelEscaneo";
import PanelHistorico from "./PanelHistorico";
import { Etiqueta } from "./Etiqueta";
import Swal from "sweetalert2";
import { TIPOS_CAJA } from "../services/validarCeldaPorTipoCaja";

import "../styles/Operario.css";

export default function Operario() {
  const [usuario, setUsuario] = useState("");
  const [logueado, setLogueado] = useState(false);

  const {
    huActual,
    setHuActual,
    celdaInput,
    setCeldaInput,
    celdas,
    enviando,
    idGuardado,
    resetProceso,
    agregarCelda,
    borrarCelda,
    borrarDesde,
    enviarDatos,
    limite,
    level_size,
  } = usePaquete(usuario, TIPOS_CAJA.NORMAL);

  // ── Navegación de niveles ─────────────────────────────────────────────────
  // nivelActual: nivel que se está llenando ahora mismo (0-indexed)
  const nivelActual =
    celdas.length === 0 ? 0 : Math.floor((celdas.length - 1) / level_size);

  // totalNiveles: cuántos niveles tiene una caja completa (ej: 180/45 = 4)
  const totalNiveles = Math.ceil(limite / level_size);

  // nivelVisible: qué nivel está viendo el operario en este momento
  const [nivelVisible, setNivelVisible] = useState(0);

  // Al escanear, volvemos siempre al nivel actual para no perder el hilo
  useEffect(() => {
    setNivelVisible(nivelActual);
  }, [celdas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const irNivelAnterior = () => setNivelVisible((v) => Math.max(0, v - 1));

  const irNivelSiguiente = () =>
    setNivelVisible((v) => Math.min(nivelActual, v + 1));

  // Celdas del nivel visible + offset para numeración correcta
  const indexIniciNivell = nivelVisible * level_size;
  const celdas_visuales = celdas.slice(
    indexIniciNivell,
    indexIniciNivell + level_size,
  );
  // ─────────────────────────────────────────────────────────────────────────

  const componentRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Etiqueta_${idGuardado}`,
    onAfterPrint: () => console.log("Impresión lanzada"),
  });

  const handleVaciarLista = () => {
    Swal.fire({
      title: "¿Vaciar toda la lista?",
      text: "Perderás todos los escaneos de la sesión actual.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, vaciar todo",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        resetProceso();
        const Toast = Swal.mixin({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
        Toast.fire({ icon: "success", title: "Lista vaciada correctamente" });
      }
    });
  };

  if (!logueado) {
    return (
      <Login
        usuario={usuario}
        setUsuario={setUsuario}
        onLogin={() => setLogueado(true)}
      />
    );
  }

  return (
    <div className="app-container">
      {/* MODAL DE CAJA CERRADA */}
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
                  op_id={usuario}
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

      <Header usuario={usuario} progreso={celdas.length} total={limite} />

      <main className="main-grid">
        {/* PANEL IZQUIERDO */}
        <PanelEscaneo
          hu={huActual}
          setHu={setHuActual}
          celda={celdaInput}
          setCelda={setCeldaInput}
          onEscanear={agregarCelda}
          onEnviar={enviarDatos}
          enviando={enviando}
          numCeldas={celdas.length}
          limite={limite}
          celdas={celdas}
        />

        {/* PANEL DERECHO */}
        <div
          className="historico-container"
          style={{ position: "relative", height: "100%", overflow: "hidden" }}
        >
          {celdas.length > 0 && (
            <button className="btn-clean-all" onClick={handleVaciarLista}>
              🗑️ LIMPIAR
            </button>
          )}
          <PanelHistorico
            celdas={celdas_visuales}
            onBorrar={borrarCelda}
            offsetIndex={indexIniciNivell}
            onBorrarDesde={borrarDesde}
            // Props de navegación de niveles
            nivelVisible={nivelVisible}
            nivelActual={nivelActual}
            totalNiveles={totalNiveles}
            onPrevNivel={irNivelAnterior}
            onNextNivel={irNivelSiguiente}
          />
        </div>
      </main>

      <div className="print-label">
        <div ref={componentRef}>
          <Etiqueta
            id={idGuardado ?? ""}
            fecha={new Date().toLocaleDateString()}
            op_id={usuario}
          />
        </div>
      </div>
    </div>
  );
}
