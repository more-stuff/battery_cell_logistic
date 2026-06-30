import { useState } from "react";
import Login from "./Login";
import OperarioCaja from "./OperarioCaja";
import { TIPOS_CAJA } from "../services/validarCeldaPorTipoCaja";
import { MODELO_POR_DEFECTO } from "../services/modelos";
import { useTitulo } from "../hooks/useTitulo";

export default function Operario({
  tipoCajaInicial = TIPOS_CAJA.NORMAL,
  titulo = "Operario",
}) {
  const [usuario, setUsuario] = useState("");
  const [logueado, setLogueado] = useState(false);
  const [tipoCaja, setTipoCaja] = useState(tipoCajaInicial);
  const [modelo, setModelo] = useState("");

  useTitulo(titulo);

  if (!logueado) {
    return (
      <Login
        usuario={usuario}
        setUsuario={setUsuario}
        onLogin={() => {
          if (!modelo) return;
          setLogueado(true);
        }}
        tipoCaja={tipoCaja}
        setTipoCaja={setTipoCaja}
        modelo={modelo}
        setModelo={setModelo}
      />
    );
  }

  return (
    <OperarioCaja
      usuario={usuario}
      tipoCaja={tipoCaja}
      modelo={modelo}
      onVolverLogin={() => {
        setModelo("");
        setTipoCaja(tipoCajaInicial);
        setLogueado(false);
      }}
    />
  );
}
