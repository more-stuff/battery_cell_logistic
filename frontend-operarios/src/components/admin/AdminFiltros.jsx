import { estilos } from "../../styles/AdminConsulta.styles";

export const AdminFiltros = ({
  filtros,
  onChange,
  onCaducidadProxima,
  onCaducadas,
  onToggleDmcDefectuosoFueraCajaDefectuosa,
}) => {
  const cambiarTipoCaja = (valor) => {
    onChange({
      target: {
        name: "tipo_caja",
        value: valor,
      },
    });
  };

  const cambiarModelo = (valor) => {
    onChange({
      target: {
        name: "modelo",
        value: valor,
      },
    });
  };

  const incidenciaActiva =
    filtros.dmc_defectuoso_fuera_caja_defectuosa === true;

  return (
    <div style={estilos.gridFiltros}>
      {/* COLUMNA 1 — IDENTIFICADORES */}
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
          placeholder="Ej: TMP-4953"
        />

        <label style={estilos.labelModern}>Blackbox ID</label>
        <input
          name="blackbox_id"
          value={filtros.blackbox_id}
          onChange={onChange}
          style={estilos.inputModern}
          placeholder="Ej: BB-123456"
        />
      </div>

      {/* COLUMNA 2 — FECHAS */}
      <div style={estilos.columnaGrid}>
        <label style={estilos.labelModern}>Fecha Caducidad</label>
        <input
          type="date"
          name="fecha_caducidad"
          value={filtros.fecha_caducidad}
          onChange={onChange}
          style={estilos.inputModern}
        />

        <label style={estilos.labelModern}>Atajos de caducidad</label>
        <div style={estilos.caducidadRapida}>
          <button
            type="button"
            onClick={onCaducidadProxima}
            style={estilos.botonCaducidadProxima}
          >
            ⏳ Caducidad próxima
          </button>

          <button
            type="button"
            onClick={onCaducadas}
            style={estilos.botonCaducadas}
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

      {/* FILA INFERIOR — TIPO DE CAJA + MODELO */}
      <div style={estilos.filtrosCategoriaFila}>
        <div style={estilos.filtroCategoriaBloque}>
          <label style={estilos.labelModern}>Tipo de caja</label>

          <div style={estilos.buttonGroup}>
            <button
              type="button"
              onClick={() => cambiarTipoCaja("")}
              style={{
                ...estilos.btnSegment,
                ...(filtros.tipo_caja === "" ? estilos.activeTodos : {}),
                borderRight: "1px solid #cbd5e1",
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
                borderRight: "1px solid #cbd5e1",
              }}
            >
              ✅ Normal
            </button>

            <button
              type="button"
              onClick={() => cambiarTipoCaja("DEFECTUOSA")}
              style={{
                ...estilos.btnSegment,
                ...(filtros.tipo_caja === "DEFECTUOSA"
                  ? estilos.activeNOK
                  : {}),
                borderRight: "1px solid #cbd5e1",
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
                  ? estilos.activeProxima
                  : {}),
              }}
            >
              ⏳ Próxima
            </button>
            <button
              type="button"
              onClick={() => cambiarTipoCaja("COBRE")}
              style={{
                ...estilos.btnSegment,
                ...(filtros.tipo_caja === "COBRE" ? estilos.activeCobre : {}),
              }}
            >
              🟠 Cobre
            </button>
          </div>

          {/* INCIDENCIA ESPECIAL */}
          <div style={{ marginTop: "16px" }}>
            <label style={estilos.labelModern}>Incidencias</label>

            <button
              type="button"
              onClick={onToggleDmcDefectuosoFueraCajaDefectuosa}
              aria-pressed={incidenciaActiva}
              style={{
                width: "100%",
                minHeight: "66px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                textAlign: "left",
                cursor: "pointer",
                borderRadius: "10px",
                border: incidenciaActiva
                  ? "1px solid #dc2626"
                  : "1px solid #dbe3ee",
                backgroundColor: incidenciaActiva ? "#fff1f2" : "#f8fafc",
                color: incidenciaActiva ? "#b91c1c" : "#334155",
                transition: "all 0.2s ease",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: "1.15rem" }}>
                  {incidenciaActiva ? "❗" : "⚠️"}
                </span>

                <span style={{ minWidth: 0 }}>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      marginBottom: "3px",
                    }}
                  >
                    Material bloqueado mal ubicado
                  </strong>

                  <span
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      lineHeight: "1.35",
                      color: incidenciaActiva ? "#a16207" : "#64748b",
                    }}
                  >
                    DMC de las listas de bloqueo que están en un tipo de caja
                    que no les corresponde.
                  </span>
                </span>
              </span>

              <span
                style={{
                  flexShrink: 0,
                  padding: "5px 9px",
                  borderRadius: "999px",
                  fontSize: "0.72rem",
                  fontWeight: "700",
                  backgroundColor: incidenciaActiva ? "#dc2626" : "#e2e8f0",
                  color: incidenciaActiva ? "#ffffff" : "#64748b",
                }}
              >
                {incidenciaActiva ? "ACTIVO" : "ACTIVAR"}
              </span>
            </button>
          </div>
        </div>

        <div style={estilos.filtroCategoriaBloque}>
          <label style={estilos.labelModern}>Modelo</label>

          <div style={estilos.buttonGroup}>
            <button
              type="button"
              onClick={() => cambiarModelo("")}
              style={{
                ...estilos.btnSegment,
                ...(filtros.modelo === "" ? estilos.activeTodos : {}),
                borderRight: "1px solid #cbd5e1",
              }}
            >
              Todos
            </button>

            <button
              type="button"
              onClick={() => cambiarModelo("MODELO1")}
              style={{
                ...estilos.btnSegment,
                ...(filtros.modelo === "MODELO1" ? estilos.activeModelo : {}),
                borderRight: "1px solid #cbd5e1",
              }}
            >
              MODELO1
            </button>

            <button
              type="button"
              onClick={() => cambiarModelo("MODELO2")}
              style={{
                ...estilos.btnSegment,
                ...(filtros.modelo === "MODELO2" ? estilos.activeModelo : {}),
              }}
            >
              MODELO2
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
