import { useState } from "react";
import Swal from "sweetalert2";
import { buscarPreview, descargarCSV } from "../services/api";
import { estilos } from "../styles/AdminConsulta.styles";

// Importamos los submódulos
import { AdminFiltros } from "../components/admin/AdminFiltros";
import { AdminSelector } from "../components/admin/AdminSelector";
import { AdminToolbar } from "../components/admin/AdminToolbar";
import { AdminTabla } from "../components/admin/AdminTabla";

const COLUMNAS_DISPONIBLES = [
  { id: "fecha_recibo", label: "F. Recibo", group: "incomming_area" },
  { id: "awb", label: "AWB / SWB", group: "incomming_area" },
  { id: "np", label: "NP Packing", group: "incomming_area" },
  { id: "status", label: "Status", group: "incomming_area" },
  { id: "hu_proveedor", label: "HU Proveedor", group: "incomming_area" },
  { id: "caducidad_inbound", label: "Cad. Inbound", group: "incomming_area" },

  { id: "fecha_reempaque", label: "F. Reempaque", group: "repacking_area" },
  { id: "operario", label: "👷 Operario (Interno)", group: "repacking_area" },
  { id: "dmc", label: "DMC (Celda)", group: "repacking_area" },
  { id: "id_temporal", label: "ID Temporal", group: "repacking_area" },
  { id: "caducidad_celda", label: "Cad. Celda", group: "repacking_area" },
  { id: "caducidad_antigua", label: "Cad. Antigua", group: "repacking_area" },
  { id: "estado_calidad", label: "Calidad estado", group: "repacking_area" },

  { id: "hu_silena", label: "HU Silena", group: "outbound_area" },
  { id: "ubicacion", label: "Ubicación", group: "outbound_area" },
  { id: "fecha_almacenamiento", label: "F. Almacén", group: "outbound_area" },
  {
    id: "is_defective",
    label: "Celda defectuosa/valida",
    group: "outbound_area",
  },

  { id: "n_salida", label: "Nº Salida", group: "powerco_area" },
  { id: "handling_unit", label: "Handling Unit", group: "powerco_area" },
  { id: "fecha_envio", label: "F. Envío", group: "powerco_area" },
];

export const AdminConsulta = () => {
  // --- ESTADOS ---
  const [filtros, setFiltros] = useState({
    dmc: "",
    hu_entrada: "",
    hu_salida: "",
    fecha_caducidad: "",
    fecha_inicio: "",
    fecha_fin: "",
    is_defective: "",
    id_temporal: "",
  });

  const [colsSeleccionadas, setColsSeleccionadas] = useState(
    COLUMNAS_DISPONIBLES.map((c) => c.id),
  );
  const [resultados, setResultados] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCSV, setLoadingCSV] = useState(false);

  // --- LÓGICA ---
  const handleChange = (e) =>
    setFiltros({ ...filtros, [e.target.name]: e.target.value });

  const toggleColumna = (id) => {
    setColsSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const getParamsExtra = () => ({
    cols: colsSeleccionadas.join(","),
    labels: colsSeleccionadas
      .map((id) => COLUMNAS_DISPONIBLES.find((c) => c.id === id)?.label)
      .join(","),
  });

  const setFechaRapida = (tipo) => {
    const hoy = new Date();
    let inicio = new Date();
    if (tipo === "semana") inicio.setDate(hoy.getDate() - 7);
    if (tipo === "mes") inicio.setMonth(hoy.getMonth() - 1);

    setFiltros({
      ...filtros,
      fecha_inicio: inicio.toISOString().split("T")[0],
      fecha_fin: hoy.toISOString().split("T")[0],
    });
  };

  const limpiarTodo = () => {
    setFiltros({
      dmc: "",
      hu_entrada: "",
      hu_salida: "",
      fecha_caducidad: "",
      fecha_inicio: "",
      fecha_fin: "",
      is_defective: "",
      id_temporal: "",
    });
    setResultados([]);
  };

  // --- HANDLERS ---
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoadingPreview(true);
    try {
      const data = await buscarPreview({ ...filtros, ...getParamsExtra() });
      setResultados(data);
      if (data.length === 0)
        Swal.fire({
          icon: "info",
          title: "Sin resultados",
          timer: 2000,
          showConfirmButton: false,
        });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: "error", title: "Error de Conexión" });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async () => {
    setLoadingCSV(true);
    try {
      await descargarCSV({ ...filtros, ...getParamsExtra() });
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      Toast.fire({ icon: "success", title: "Descarga iniciada" });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: "error", title: "Error de Descarga" });
    } finally {
      setLoadingCSV(false);
    }
  };

  // --- RENDER ---
  return (
    <div style={estilos.contenedorPrincipal}>
      <div style={estilos.headerContainer}>
        <h2 style={estilos.titulo}>🔍 Trazabilidad y Consultas</h2>
        <p style={estilos.subtitulo}>
          Filtra y descarga la información de celdas y movimientos.
        </p>
      </div>

      <div style={estilos.cardFiltros}>
        <form onSubmit={handleSearch} style={{ width: "100%" }}>
          {/* 1. INPUTS */}
          <AdminFiltros filtros={filtros} onChange={handleChange} />

          {/* 2. SELECTOR DE COLUMNAS */}
          <AdminSelector
            disponibles={COLUMNAS_DISPONIBLES}
            seleccionadas={colsSeleccionadas}
            onToggle={toggleColumna}
          />

          {/* 3. TOOLBAR (BOTONES) */}
          <AdminToolbar
            onFechaRapida={setFechaRapida}
            onLimpiar={limpiarTodo}
            onDownload={handleDownload}
            loadingPreview={loadingPreview}
            loadingCSV={loadingCSV}
            numCols={colsSeleccionadas.length}
          />
        </form>
      </div>

      {/* 4. TABLA DE RESULTADOS */}
      <AdminTabla
        resultados={resultados}
        disponibles={COLUMNAS_DISPONIBLES}
        seleccionadas={colsSeleccionadas}
        loading={loadingPreview}
      />
    </div>
  );
};
