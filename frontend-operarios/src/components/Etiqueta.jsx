// src/components/Etiqueta.jsx

import Barcode from "react-barcode";
import { getTipoCajaUI } from "../services/tipoCajaUI";
import { TIPOS_CAJA } from "../services/validarCeldaPorTipoCaja";
import { getTipoCeldaUI, TIPOS_CELDA } from "../services/tiposCelda";

// Ya no necesitamos forwardRef ni ref aquí, porque el 'padre' se encarga de imprimir
export const Etiqueta = ({
  id,
  fecha,
  op_id,
  fechaCaducidadCaja,
  tipoCaja = TIPOS_CAJA.NORMAL,
  tipoCelda = TIPOS_CELDA.CELDA,
}) => {
  const tipoCajaUI = getTipoCajaUI(tipoCaja);
  const tipoCeldaUI = getTipoCeldaUI(tipoCelda);
  return (
    <div style={estilos.contenedor}>
      <div style={estilos.cabecera}>
        <span style={estilos.titulo}>CONTROL DE CALIDAD</span>
        <span style={estilos.fecha}>{fecha}</span>
      </div>

      <div style={estilos.barcodeBox}>
        <div style={estilos.barcodeWrapper}>
          <Barcode
            value={id || "PENDIENTE"}
            format="CODE128"
            width={2}
            height={60}
            fontSize={16}
            displayValue={false}
          />
          <div style={estilos.idTexto}>ID: {id || "PENDIENTE"}</div>
        </div>
      </div>

      {/* Sección para el OP ID */}
      <div style={estilos.infoExtra}>
        <strong>Operario id:</strong> {op_id || "N/A"}
      </div>

      <div style={estilos.infoExtra}>
        <strong>Tipo celda:</strong> {tipoCeldaUI.label || tipoCelda}
      </div>

      <div style={estilos.infoExtra}>
        <strong>Tipo caja:</strong> {tipoCajaUI.label || tipoCaja}
      </div>

      <div style={estilos.infoExtra}>
        <strong>Caducidad caja:</strong> {fechaCaducidadCaja || "N/A"}
      </div>

      <div style={estilos.footer}>
        ESTADO: <strong>CERRADO</strong> | REF: INT-WMS
      </div>
    </div>
  );
};

const estilos = {
  // ... (tus mismos estilos de siempre) ...
  contenedor: {
    width: "400px",
    height: "290px",
    border: "2px dashed #000",
    padding: "20px",
    margin: "0 auto",
    backgroundColor: "white",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    fontFamily: "Arial, sans-serif",
  },
  cabecera: {
    borderBottom: "2px solid black",
    paddingBottom: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titulo: { fontWeight: "bold", fontSize: "14px" },
  fecha: { fontSize: "12px" },
  barcodeBox: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  footer: { borderTop: "1px solid #ccc", paddingTop: "5px", fontSize: "10px" },
  infoExtra: {
    marginTop: "4px",
    fontSize: "12px",
    textAlign: "center",
    borderTop: "1px dashed #ccc", // Opcional: una línea divisoria sutil
    paddingTop: "4px",
  },
};
