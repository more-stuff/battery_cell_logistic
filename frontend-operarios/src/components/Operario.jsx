import { useState } from "react";
import Login from "./Login";
import OperarioCaja from "./OperarioCaja";
import { TIPOS_CAJA } from "../services/validarCeldaPorTipoCaja";
import { TIPOS_CELDA } from "../services/tiposCelda";
import { useTitulo } from "../hooks/useTitulo";

export default function Operario({
  tipoCajaInicial = TIPOS_CAJA.NORMAL,
  titulo = "Operario",
}) {
  const [usuario, setUsuario] = useState("");
  const [logueado, setLogueado] = useState(false);
  const [tipoCaja, setTipoCaja] = useState(tipoCajaInicial);
  const [tipoCelda, setTipoCelda] = useState(TIPOS_CELDA.CELDA);

  useTitulo(titulo);

  if (!logueado) {
    return (
      <Login
        usuario={usuario}
        setUsuario={setUsuario}
        onLogin={() => setLogueado(true)}
        tipoCaja={tipoCaja}
        setTipoCaja={setTipoCaja}
        tipoCelda={tipoCelda}
        setTipoCelda={setTipoCelda}
      />
    );
  }

  return (
    <OperarioCaja
      usuario={usuario}
      tipoCaja={tipoCaja}
      tipoCelda={tipoCelda}
      onVolverLogin={() => setLogueado(false)}
    />
  );
}
