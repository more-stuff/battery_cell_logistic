import { useState } from "react";
import { buscarPreview, descargarCSV } from "../services/api";
import { estilos } from "../styles/AdminConsulta.styles";

export const AdminConsulta = () => {
  // --- 1. ESTADOS ---
  const [filtros, setFiltros] = useState({
    dmc: "",
    hu_entrada: "",
    hu_salida: "",
    fecha_caducidad: "",
    fecha_inicio: "",
    fecha_fin: "",
  });

  const [resultados, setResultados] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCSV, setLoadingCSV] = useState(false);

  // --- 2. LÓGICA ---

  const handleChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  // Botones Rápidos de Fecha
  const setFechaRapida = (tipo) => {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split("T")[0];
    let inicio = new Date();

    if (tipo === "semana") {
      inicio.setDate(hoy.getDate() - 7);
    } else if (tipo === "mes") {
      inicio.setMonth(hoy.getMonth() - 1);
    }

    setFiltros({
      ...filtros,
      fecha_inicio: inicio.toISOString().split("T")[0],
      fecha_fin: hoyStr,
    });
  };

  // LIMPIAR TODO
  const limpiarTodo = () => {
    setFiltros({
      dmc: "",
      hu_entrada: "",
      hu_salida: "",
      fecha_caducidad: "",
      fecha_inicio: "",
      fecha_fin: "",
    });
    setResultados([]);
  };

  // Buscar (Vista Previa)
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoadingPreview(true);
    try {
      const data = await buscarPreview(filtros);
      setResultados(data);
      if (data.length === 0) alert("⚠️ No hay resultados con estos filtros.");
    } catch (error) {
      console.error(error);
      alert("❌ Error de conexión");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Descargar CSV
  const handleDownload = async () => {
    setLoadingCSV(true);
    try {
      await descargarCSV(filtros);
    } catch (error) {
      console.error(error);
      alert("❌ Error al descargar");
    } finally {
      setLoadingCSV(false);
    }
  };

  // Formateadores
  const fFecha = (f) => (f ? new Date(f).toLocaleDateString() : "-");
  const fFechaHora = (f) => (f ? new Date(f).toLocaleString() : "-");

  // --- 3. RENDERIZADO ---
  return (
    <div style={estilos.contenedorPrincipal}>
      <div style={estilos.headerContainer}>
        <h2 style={estilos.titulo}>🔍 Trazabilidad y Consultas</h2>
        <p style={estilos.subtitulo}>
          Filtra y descarga la información de celdas y movimientos.
        </p>
      </div>

      {/* === PANEL DE FILTROS (CARD) === */}
      <div style={estilos.cardFiltros}>
        <div style={estilos.gridFiltros}>
          {/* COLUMNA 1: Textos */}
          <div style={estilos.columnaGrid}>
            <label style={estilos.labelModern}>DMC Celda</label>
            <input
              name="dmc"
              value={filtros.dmc}
              onChange={handleChange}
              style={estilos.inputModern}
              placeholder="Ej: A1-B2..."
            />

            <label style={estilos.labelModern}>HU Entrada (Proveedor)</label>
            <input
              name="hu_entrada"
              value={filtros.hu_entrada}
              onChange={handleChange}
              style={estilos.inputModern}
              placeholder="Ej: SUP-123"
            />

            <label style={estilos.labelModern}>HU Salida / Caja ID</label>
            <input
              name="hu_salida"
              value={filtros.hu_salida}
              onChange={handleChange}
              style={estilos.inputModern}
              placeholder="Ej: SIL-999"
            />
          </div>

          {/* COLUMNA 2: Fechas */}
          <div style={estilos.columnaGrid}>
            <label style={estilos.labelModern}>Fecha Caducidad</label>
            <input
              type="date"
              name="fecha_caducidad"
              value={filtros.fecha_caducidad}
              onChange={handleChange}
              style={estilos.inputModern}
            />

            <label style={estilos.labelModern}>Escaneado Desde</label>
            <input
              type="date"
              name="fecha_inicio"
              value={filtros.fecha_inicio}
              onChange={handleChange}
              style={estilos.inputModern}
            />

            <label style={estilos.labelModern}>Escaneado Hasta</label>
            <input
              type="date"
              name="fecha_fin"
              value={filtros.fecha_fin}
              onChange={handleChange}
              style={estilos.inputModern}
            />
          </div>
        </div>

        {/* BARRA DE HERRAMIENTAS INFERIOR */}
        <div style={estilos.toolbarFooter}>
          {/* Izquierda: Atajos y Limpieza */}
          <div style={estilos.toolbarLeft}>
            <span style={estilos.labelAtajos}>ATAJOS:</span>
            <div style={estilos.atajosGroup}>
              <button
                onClick={() => setFechaRapida("hoy")}
                style={estilos.btnAtajo}
              >
                Hoy
              </button>
              <button
                onClick={() => setFechaRapida("semana")}
                style={estilos.btnAtajo}
              >
                Semana
              </button>
              <button
                onClick={() => setFechaRapida("mes")}
                style={estilos.btnAtajo}
              >
                Mes
              </button>
            </div>
            <div style={estilos.dividerVertical}></div>
            <button
              onClick={limpiarTodo}
              style={estilos.btnLimpiarModern}
              title="Borrar todos los filtros"
            >
              <span>Borrar Filtros</span> 🗑️
            </button>
          </div>

          {/* Derecha: Acciones Principales */}
          <div style={estilos.toolbarRight}>
            <button
              onClick={handleSearch}
              disabled={loadingPreview}
              style={estilos.btnActionPrimary}
            >
              {loadingPreview ? "Cargando..." : "🔍 Vista Previa"}
            </button>
            <button
              onClick={handleDownload}
              disabled={loadingCSV}
              style={estilos.btnActionSecondary}
            >
              {loadingCSV ? "Generando..." : "📥 Descargar Excel"}
            </button>
          </div>
        </div>
      </div>

      {/* === TABLA DE RESULTADOS (CARD) === */}
      <div style={estilos.cardTabla}>
        <div style={estilos.tablaWrapper}>
          <table style={estilos.tablaModern}>
            <thead>
              <tr>
                <th style={estilos.thModern}>F. Recibo</th>
                <th style={estilos.thModern}>AWB</th>
                <th style={estilos.thModern}>NP Packing</th>
                <th style={estilos.thModern}>Status</th>
                <th style={estilos.thModern}>HU Proveedor</th>
                <th style={estilos.thModern}>Cad. Inbound</th>
                <th style={estilos.thModern}>F. Reempaque</th>
                <th style={estilos.thModern}>Reg. Silena</th>
                <th style={estilos.thModern}>DMC (Celda)</th>
                <th style={estilos.thModern}>Cad. Celda</th>
                <th style={estilos.thModern}>Cad. Antigua</th>
                <th style={estilos.thModern}>F. Almacén</th>
                <th style={estilos.thModern}>HU Silena</th>
                <th style={estilos.thModern}>Ubicación</th>
                <th style={estilos.thModern}>Nº Salida</th>
                <th style={estilos.thModern}>HU Final</th>
                <th style={estilos.thModern}>F. Envío</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((row, index) => {
                // Efecto cebra para las filas
                const bgRow = index % 2 === 0 ? "#ffffff" : "#f9fafb";
                return (
                  <tr
                    key={index}
                    style={{
                      backgroundColor: bgRow,
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <td style={estilos.tdModern}>{fFecha(row.fecha_recibo)}</td>
                    <td style={estilos.tdModern}>{row.awb}</td>
                    <td style={estilos.tdModern}>{row.np}</td>
                    <td style={estilos.tdModern}>
                      <span
                        style={
                          row.status === "OK"
                            ? estilos.badgeOK
                            : estilos.badgeNeutral
                        }
                      >
                        {row.status || "-"}
                      </span>
                    </td>
                    <td
                      style={{
                        ...estilos.tdModern,
                        fontWeight: 600,
                        color: "#2563eb",
                      }}
                    >
                      {row.hu_proveedor}
                    </td>
                    <td style={estilos.tdModern}>{row.caducidad_inbound}</td>
                    <td style={estilos.tdModern}>
                      {fFechaHora(row.fecha_reempaque)}
                    </td>
                    <td style={estilos.tdModern}>{row.registro_silena}</td>
                    <td
                      style={{
                        ...estilos.tdModern,
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      {row.dmc}
                    </td>
                    <td style={estilos.tdModern}>{row.caducidad_celda}</td>
                    <td style={estilos.tdModern}>{row.caducidad_antigua}</td>
                    <td style={estilos.tdModern}>
                      {fFechaHora(row.fecha_almacenamiento)}
                    </td>
                    <td style={{ ...estilos.tdModern, fontWeight: 600 }}>
                      {row.hu_silena}
                    </td>
                    <td style={estilos.tdModern}>{row.ubicacion}</td>
                    <td style={estilos.tdModern}>{row.n_salida}</td>
                    <td style={estilos.tdModern}>{row.hu_final}</td>
                    <td style={estilos.tdModern}>
                      {fFechaHora(row.fecha_envio)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {resultados.length === 0 && !loadingPreview && (
            <div style={estilos.emptyState}>
              <span style={{ fontSize: "2rem" }}>📭</span>
              <p>No hay datos que mostrar. Utiliza los filtros para empezar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
