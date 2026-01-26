import axios from "axios";

//const API_URL = "http://127.0.0.1:8000";
const API_URL = "/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 5000, // 10 segundos máximo
});

// Antes de que salga cualquier petición, le pegamos el Token si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el servidor dice "401 Unauthorized" (token caducado), cerramos sesión
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      // Opcional: Redirigir o recargar
      // window.location.reload();
    }
    return Promise.reject(error);
  },
);

// --- NUEVA FUNCIÓN DE LOGIN ---
export const loginAdmin = async (username, password) => {
  // El backend espera form-data, no JSON, por el estándar OAuth2
  const params = new URLSearchParams();
  params.append("username", username);
  params.append("password", password);

  const response = await api.post(`/admin/login`, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  return response.data; // Devuelve { access_token, rol, username... }
};

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
  const response = await api.get(`/admin/consulta/preview`, {
    params,
  });
  return response.data;
};

export const descargarCSV = async (filtros) => {
  // 1. Limpiamos antes de enviar
  const params = limpiarFiltros(filtros);

  const response = await api.get(`/admin/consulta/exportar`, {
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

export const obtenerConfiguracion = async () => {
  try {
    // CAMBIO: La ruta ahora es /admin/config
    const response = await api.get(`/admin/config`);
    return response.data;
  } catch (error) {
    console.error("Usando config por defecto", error);
    return { alerta_cada: 15, limite_caja: 180 };
  }
};

export const guardarConfiguracion = async (clave, valor) => {
  try {
    // Ajusta la URL si tu endpoint está en /admin/config
    const response = await api.put(`/admin/config`, {
      clave: clave,
      valor: String(valor), // Lo enviamos siempre como string
    });
    return response.data;
  } catch (error) {
    console.error("Error guardando configuración", error);
    throw error;
  }
};
