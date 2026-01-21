import { estilos } from "../../styles/AdminConsulta.styles";

export const AdminFiltros = ({ filtros, onChange }) => {
  return (
    <div style={estilos.gridFiltros}>
      <div style={estilos.columnaGrid}>
        <label style={estilos.labelModern}>DMC Celda</label>
        <input
          name="dmc"
          value={filtros.dmc}
          onChange={onChange}
          style={estilos.inputModern}
          placeholder="Ej: A1-B2..."
        />
        <label style={estilos.labelModern}>HU Entrada (Proveedor)</label>
        <input
          name="hu_entrada"
          value={filtros.hu_entrada}
          onChange={onChange}
          style={estilos.inputModern}
          placeholder="Ej: SUP-123"
        />
        <label style={estilos.labelModern}>HU Salida / Caja ID</label>
        <input
          name="hu_salida"
          value={filtros.hu_salida}
          onChange={onChange}
          style={estilos.inputModern}
          placeholder="Ej: SIL-999"
        />
      </div>

      <div style={estilos.columnaGrid}>
        <label style={estilos.labelModern}>Fecha Caducidad</label>
        <input
          type="date"
          name="fecha_caducidad"
          value={filtros.fecha_caducidad}
          onChange={onChange}
          style={estilos.inputModern}
        />
        <label style={estilos.labelModern}>Escaneado Desde</label>
        <input
          type="date"
          name="fecha_inicio"
          value={filtros.fecha_inicio}
          onChange={onChange}
          style={estilos.inputModern}
        />
        <label style={estilos.labelModern}>Escaneado Hasta</label>
        <input
          type="date"
          name="fecha_fin"
          value={filtros.fecha_fin}
          onChange={onChange}
          style={estilos.inputModern}
        />
      </div>
    </div>
  );
};
