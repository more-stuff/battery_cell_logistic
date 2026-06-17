import Operario from "./Operario";
import { TIPOS_CAJA } from "../services/validarCeldaPorTipoCaja";

export default function OperarioCaducidadProxima() {
  return (
    <Operario
      tipoCajaInicial={TIPOS_CAJA.CADUCIDAD_PROXIMA}
      titulo="Caducidad Próxima Celdas"
    />
  );
}
