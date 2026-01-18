import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export const enviarPaquete = async (payload) => {
  // Aquí hacemos la llamada limpia
  const response = await axios.post(`${API_URL}/reempaque/finalizar`, payload);
  return response.data;
};

// 👇 FUNCION PARA EL CARRETILLERO
export const guardarUbicacion = async (payload) => {
  // payload debe ser: { id_temporal: "...", ubicacion: "..." }
  const response = await axios.post(`${API_URL}/almacen/ubicar`, payload);
  return response.data;
};

export const actualizarIncoming = async (payload) => {
  console.log(payload);
  const response = await axios.put(
    `${API_URL}/admin/incoming/actualizar`,
    payload,
  );
  return response.data;
};

export const registrarSalida = async (payload) => {
  const response = await axios.put(
    `${API_URL}/admin/outbound/actualizar`,
    payload,
  );
  return response.data;
};

const limpiarFiltros = (filtros) => {
  const paramsLimpios = {};

  Object.keys(filtros).forEach((key) => {
    const valor = filtros[key];
    // Solo añadimos el filtro si tiene valor real (no es vacío ni nulo)
    if (valor !== "" && valor !== null && valor !== undefined) {
      paramsLimpios[key] = valor;
    }
  });

  return paramsLimpios;
};

// --- TUS ENDPOINTS ---

export const buscarPreview = async (filtros) => {
  // 1. Limpiamos antes de enviar
  const params = limpiarFiltros(filtros);

  // 2. Enviamos solo los datos útiles
  const response = await axios.get(`${API_URL}/admin/consulta/preview`, {
    params,
  });
  return response.data;
};

export const descargarCSV = async (filtros) => {
  // 1. Limpiamos antes de enviar
  const params = limpiarFiltros(filtros);

  const response = await axios.get(`${API_URL}/admin/consulta/exportar`, {
    params,
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  const fecha = new Date().toISOString().slice(0, 10);
  link.setAttribute("download", `Trazabilidad_${fecha}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
