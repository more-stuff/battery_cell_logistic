import { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { usePaquete } from "../hooks/usePaquete";
import Login from "./Login";
import Header from "./Header";
import PanelEscaneo from "./PanelEscaneo";
import PanelHistorico from "./PanelHistorico";
import { Etiqueta } from "./Etiqueta";
import Swal from "sweetalert2";

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
    enviando,
    idGuardado,
    resetProceso,
    agregarCelda,
    borrarCelda,
    borrarDesde,
    enviarDatos,
    limite,
    level_size,
  } = usePaquete(usuario);

  // calculo celdas a mostrar en pantalla
  const indexIniciNivell = Math.max(
    0,
    Math.floor((celdas.length - 1) / level_size) * level_size,
  );
  const celdas_visuales = celdas.slice(indexIniciNivell);

  // referncia para la impresion
  const componentRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef, // ✅ v3
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
        resetProceso(); // Ejecutamos la limpieza

        // Alerta pequeña de éxito
        const Toast = Swal.mixin({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
        Toast.fire({
          icon: "success",
          title: "Lista vaciada correctamente",
        });
      }
    });
  };

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
                  op_id={usuario}
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
          limite={limite}
        />

        {/* PANEL DERECHO (HISTÓRICO) */}
        <div
          className="historico-container"
          style={{
            position: "relative",
            height: "100%", // <--- OBLIGATORIO para que no crezca infinito
            overflow: "hidden", // <--- Mantiene todo dentro de la caja
          }}
        >
          {/* Botón flotante elegante que no desplaza la tabla */}
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
          />
        </div>
      </main>
      {/* Esto está oculto al ojo (display: none) pero SIEMPRE existe en el HTML. */}
      <div className="print-label">
        <div ref={componentRef}>
          <Etiqueta
            id={idGuardado ?? ""}
            fecha={new Date().toLocaleDateString()}
            op_id={usuario}
          />
        </div>
      </div>
      {/* Al estar fuera del condicional {idGuardado && ...}, React lo encuentra siempre. */}
    </div>
  );
}

export default Operario;
