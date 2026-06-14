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
import { useTitulo } from "../hooks/useTitulo";

import "../styles/Operario.css";

export default function OperarioCaducidadProxima() {
  const [usuario, setUsuario] = useState("");
  const [logueado, setLogueado] = useState(false);

  useTitulo("Caducidad Próxima Celdas");

  const {
    huActual,
    setHuActual,
    celdaInput,
    setCeldaInput,
    celdas,
    enviando,
    idGuardado,
    fechaCaducidadCajaGuardada,
    resetProceso,
    agregarCelda,
    borrarCelda,
    borrarDesde,
    enviarDatos,
    limite,
    level_size,
  } = usePaquete(usuario, TIPOS_CAJA.CADUCIDAD_PROXIMA);

  const nivelActual =
    celdas.length === 0 ? 0 : Math.floor((celdas.length - 1) / level_size);

  const totalNiveles = Math.ceil(limite / level_size);

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

  const componentRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Etiqueta_CADUCIDAD_PROXIMA_${idGuardado}`,
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
        tipoCaja={TIPOS_CAJA.CADUCIDAD_PROXIMA}
      />
    );
  }

  return (
    <div className="app-container" style={{ borderTop: "5px solid #f39c12" }}>
      {idGuardado && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ width: "500px", borderTop: "8px solid #f39c12" }}
          >
            <h2 style={{ color: "#f39c12", textAlign: "center" }}>
              ⏳ CAJA CADUCIDAD PRÓXIMA CERRADA
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
                  fechaCaducidadCaja={fechaCaducidadCajaGuardada}
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
                  background: "#f39c12",
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

      <div
        style={{
          background: "#f39c12",
          color: "white",
          textAlign: "center",
          padding: "5px",
          fontWeight: "bold",
        }}
      >
        MODO: REGISTRO DE CADUCIDAD PRÓXIMA
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
          limite={limite}
          celdas={celdas}
          tipoCaja={TIPOS_CAJA.CADUCIDAD_PROXIMA}
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
            fechaCaducidadCaja={fechaCaducidadCajaGuardada}
          />
        </div>
      </div>
    </div>
  );
}
