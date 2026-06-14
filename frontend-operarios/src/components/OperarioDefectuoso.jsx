// OperarioDefectuoso.jsx
import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { usePaquete } from "../hooks/usePaquete"; // Reutilizamos tu hook
import Swal from "sweetalert2";

import Login from "./Login";
import Header from "./Header";
import PanelEscaneo from "./PanelEscaneo";
import PanelHistorico from "./PanelHistorico";
import { Etiqueta } from "./Etiqueta";
import { TIPOS_CAJA } from "../services/validarCeldaPorTipoCaja";
import { useTitulo } from "../hooks/useTitulo";

import "../styles/Operario.css";

export default function OperarioDefectuoso() {
  const [usuario, setUsuario] = useState("");
  const [logueado, setLogueado] = useState(false);

  useTitulo("Defectuuosas");

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
  } = usePaquete(usuario, TIPOS_CAJA.DEFECTUOSA);

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Etiqueta_SCRAP_${idGuardado}`,
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

  // Calculos visuales
  // ── Navegación de niveles ─────────────────────────────────────────────────
  const limiteActivo = limite_defectuosas ?? limite;

  const nivelActual =
    celdas.length === 0 ? 0 : Math.floor((celdas.length - 1) / level_size);

  const totalNiveles = Math.ceil(limiteActivo / level_size);

  const [nivelVisible, setNivelVisible] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setNivelVisible(nivelActual);
    }, 0);

    return () => clearTimeout(timeout);
  }, [nivelActual]);

  const irNivelAnterior = () => setNivelVisible((v) => Math.max(0, v - 1));

  const irNivelSiguiente = () =>
    setNivelVisible((v) => Math.min(nivelActual, v + 1));

  const indexIniciNivell = nivelVisible * level_size;

  const celdas_visuales = celdas.slice(
    indexIniciNivell,
    indexIniciNivell + level_size,
  );
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
      <Header usuario={usuario} progreso={celdas.length} total={limite} />
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
          limite={limiteActivo}
          celdas={celdas}
          tipoCaja={TIPOS_CAJA.DEFECTUOSA}
        />

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
            esDefectuoso={true}
          />
        </div>
      </div>
    </div>
  );
}
