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
  const [puesto, setPuesto] = useState(null);

  useTitulo(titulo);

  if (!logueado) {
    return (
      <Login
        usuario={usuario}
        setUsuario={setUsuario}
        onLogin={() => {
          if (!modelo) return;
          if (!puesto) return; // ← no deja entrar sin puesto
          setLogueado(true);
        }}
        tipoCaja={tipoCaja}
        setTipoCaja={setTipoCaja}
        modelo={modelo}
        setModelo={setModelo}
        puesto={puesto}
        setPuesto={setPuesto}
      />
    );
  }

  return (
    <OperarioCaja
      usuario={usuario}
      tipoCaja={tipoCaja}
      modelo={modelo}
      puesto={puesto}
      onVolverLogin={() => {
        setModelo("");
        setTipoCaja(tipoCajaInicial);
        setPuesto(null);
        setLogueado(false);
      }}
    />
  );
}
