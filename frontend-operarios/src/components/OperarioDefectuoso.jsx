import Operario from "./Operario";
import { TIPOS_CAJA } from "../services/validarCeldaPorTipoCaja";

export default function OperarioDefectuoso() {
  return (
    <Operario tipoCajaInicial={TIPOS_CAJA.DEFECTUOSA} titulo="Defectuosas" />
  );
}
