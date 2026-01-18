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
