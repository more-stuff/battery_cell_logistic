import { estilos } from "../../styles/AdminConsulta.styles";

export const AdminToolbar = ({
  onFechaRapida,
  onLimpiar,
  onDownload,
  loadingPreview,
  loadingCSV,
  numCols,
}) => {
  return (
    <div style={estilos.toolbarFooter}>
      <div style={estilos.toolbarLeft}>
        <span style={estilos.labelAtajos}>ATAJOS:</span>
        <div style={estilos.atajosGroup}>
          <button
            type="button"
            onClick={() => onFechaRapida("hoy")}
            style={estilos.btnAtajo}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => onFechaRapida("semana")}
            style={estilos.btnAtajo}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => onFechaRapida("mes")}
            style={estilos.btnAtajo}
          >
            Mes
          </button>
        </div>
        <div style={estilos.dividerVertical}></div>
        <button
          type="button"
          onClick={onLimpiar}
          style={estilos.btnLimpiarModern}
          title="Borrar filtros"
        >
          <span>Borrar Filtros</span> 🗑️
        </button>
      </div>

      <div style={estilos.toolbarRight}>
        {/* Este es el único submit del formulario */}
        <button
          type="submit"
          disabled={loadingPreview}
          style={estilos.btnActionPrimary}
        >
          {loadingPreview ? "Cargando..." : "🔍 Vista Previa"}
        </button>

        <button
          type="button"
          onClick={onDownload}
          disabled={loadingCSV}
          style={estilos.btnActionSecondary}
        >
          {loadingCSV ? "Generando..." : `📥 Descargar csv (${numCols} cols)`}
        </button>
      </div>
    </div>
  );
};
