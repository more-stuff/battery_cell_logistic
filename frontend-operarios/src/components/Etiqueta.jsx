// src/components/Etiqueta.jsx
import React from "react";
import Barcode from "react-barcode";

// Ya no necesitamos forwardRef ni ref aquí, porque el 'padre' se encarga de imprimir
export const Etiqueta = ({ id, fecha }) => {
  return (
    <div style={estilos.contenedor}>
      <div style={estilos.cabecera}>
        <span style={estilos.titulo}>CONTROL DE CALIDAD</span>
        <span style={estilos.fecha}>{fecha}</span>
      </div>

      <div style={estilos.barcodeBox}>
        <Barcode
          value={id || "PENDIENTE"}
          format="CODE128"
          width={2}
          height={60}
          fontSize={16}
          displayValue={false}
        />
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
    height: "250px",
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
};
