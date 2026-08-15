import Operario from "./Operario";
import { TIPOS_CAJA } from "../services/validarCeldaPorTipoCaja";

export default function OperarioCobre() {
  return <Operario tipoCajaInicial={TIPOS_CAJA.COBRE} titulo="Cobre" />;
}
