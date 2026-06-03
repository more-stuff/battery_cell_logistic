import { estilos } from "../../styles/AdminConsulta.styles";

export const AdminFiltros = ({
  filtros,
  onChange,
  onCaducidadProxima,
  onCaducadas,
}) => {
  const cambiarTipoCaja = (valor) => {
    onChange({
      target: {
        name: "tipo_caja",
        value: valor,
      },
    });
  };

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

        <label style={estilos.labelModern}>ID temporal</label>
        <input
          name="id_temporal"
          value={filtros.id_temporal}
          onChange={onChange}
          style={estilos.inputModern}
          placeholder="Ej: TEMP-4953"
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

        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button
            type="button"
            onClick={onCaducidadProxima}
            style={{
              ...estilos.btnSegment,
              flex: 1,
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
          >
            ⏳ Próxima
          </button>

          <button
            type="button"
            onClick={onCaducadas}
            style={{
              ...estilos.btnSegment,
              flex: 1,
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
          >
            ⚠️ Caducadas
          </button>
        </div>

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

        <label style={estilos.labelModern}>Puesto de escaneo</label>
        <input
          name="usuario_id"
          value={filtros.usuario_id}
          onChange={onChange}
          style={estilos.inputModern}
          placeholder="Ej: PUESTO 4"
        />
      </div>

      <div style={estilos.columnaGrid}>
        <label style={estilos.labelModern}>Tipo de caja</label>
        <div style={estilos.buttonGroup}>
          <button
            type="button"
            onClick={() => cambiarTipoCaja("")}
            style={{
              ...estilos.btnSegment,
              ...(filtros.tipo_caja === "" ? estilos.activeTodos : {}),
              borderRight: "1px solid #ccc",
            }}
          >
            📦 Todas
          </button>

          <button
            type="button"
            onClick={() => cambiarTipoCaja("NORMAL")}
            style={{
              ...estilos.btnSegment,
              ...(filtros.tipo_caja === "NORMAL" ? estilos.activeOK : {}),
              borderRight: "1px solid #ccc",
            }}
          >
            ✅ Normal
          </button>

          <button
            type="button"
            onClick={() => cambiarTipoCaja("DEFECTUOSA")}
            style={{
              ...estilos.btnSegment,
              ...(filtros.tipo_caja === "DEFECTUOSA" ? estilos.activeNOK : {}),
              borderRight: "1px solid #ccc",
            }}
          >
            ❌ Defectuosa
          </button>

          <button
            type="button"
            onClick={() => cambiarTipoCaja("CADUCIDAD_PROXIMA")}
            style={{
              ...estilos.btnSegment,
              ...(filtros.tipo_caja === "CADUCIDAD_PROXIMA"
                ? estilos.activeTodos
                : {}),
            }}
          >
            ⏳ Próxima
          </button>
        </div>
      </div>
    </div>
  );
};
