import axios from "axios";
import Swal from "sweetalert2";

//const API_URL = "http://127.0.0.1:8000";
const API_URL = "/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // ms
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
      const urlSolicitada = error.config.url;

      // Si es fallo de LOGIN, sí devolvemos el error para que salga "password incorrecto"
      if (
        urlSolicitada.includes("/token") ||
        urlSolicitada.includes("/login")
      ) {
        return Promise.reject(error);
      }

      // === LOGICA DE SESIÓN CADUCADA ===

      // 1. Borramos credenciales
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");

      // 2. Mostramos alerta BLOQUEANTE
      Swal.fire({
        icon: "warning",
        title: "Sesión Caducada",
        text: "Tu sesión ha expirado por seguridad. Por favor, inicia sesión de nuevo.",
        confirmButtonText: "Entendido, ir al Login",
        confirmButtonColor: "#3085d6",
        allowOutsideClick: false,
        allowEscapeKey: false,
        backdrop: `rgba(0,0,0,0.8)`, // Fondo oscuro para que se note más
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.reload();
        }
      });

      // 3. 🛑 EL TRUCO DE MAGIA: CONGELAR
      // Devolvemos una promesa que nunca se resuelve.
      // El componente se quedará esperando (await) y NUNCA ejecutará su catch().
      // Así evitamos que la alerta del componente sobrescriba a esta.
      return new Promise(() => {});
    }

    // Si es otro error (404, 500...), lo dejamos pasar normal
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
  const response = await api.post(`/reempaque/finalizar`, payload);
  return response.data;
};

// 👇 FUNCION PARA EL CARRETILLERO
export const guardarUbicacion = async (payload) => {
  // payload debe ser: { id_temporal: "...", ubicacion: "..." }
  const response = await api.post(`/almacen/ubicar`, payload);
  return response.data;
};

export const actualizarIncoming = async (payload) => {
  console.log(payload);
  const response = await api.put(`/admin/incoming/actualizar`, payload);
  return response.data;
};

export const registrarSalida = async (payload) => {
  const response = await api.put(`/admin/outbound/actualizar`, payload);
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
  console.log(response.data);
  return response.data;
};
export const descargarCSV = async (filtros) => {
  const params = limpiarFiltros(filtros);
  const queryString = new URLSearchParams(params).toString();

  const token = localStorage.getItem("admin_token");

  const response = await fetch(
    `${API_URL}/admin/consulta/exportar?${queryString}`,
    {
      method: "GET",
      timeout: 10 * 60 * 1000, // 10 minutos
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (response.status === 401) {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");

    Swal.fire({
      icon: "warning",
      title: "Sesión Caducada",
      text: "Tu sesión ha expirado por seguridad. Por favor, inicia sesión de nuevo.",
      confirmButtonText: "Entendido, ir al Login",
      confirmButtonColor: "#3085d6",
      allowOutsideClick: false,
      allowEscapeKey: false,
      backdrop: `rgba(0,0,0,0.8)`,
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.reload();
      }
    });

    return;
  }

  if (!response.ok) {
    throw new Error(`Error exportando CSV: ${response.status}`);
  }

  const contentDisposition = response.headers.get("Content-Disposition");
  let filename = `Trazabilidad_${new Date().toISOString().slice(0, 10)}.csv`;

  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  if (window.showSaveFilePicker && response.body) {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: "CSV",
          accept: { "text/csv": [".csv"] },
        },
      ],
    });

    const writable = await fileHandle.createWritable();
    await response.body.pipeTo(writable);
    return;
  }

  // Fallback para navegadores sin showSaveFilePicker:
  // este fallback vuelve a usar blob, pero solo si no hay otra opción.
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
export const obtenerConfiguracion = async (modelo = "MODELO1") => {
  try {
    const response = await api.get("/admin/config", {
      params: { modelo },
    });

    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("Usando configuración por defecto", error);

    return {
      alerta_cada: 15,
      limite_caja: 180,
      limite_defectuosa: 180,
      limite_caducidad_proxima: 180,
      len_dmc: 87,
      caducidad_proxima_dias: 30,
    };
  }
};

export const guardarConfiguracion = async (modelo, clave, valor) => {
  try {
    const response = await api.put(
      "/admin/config",
      {
        clave,
        valor: String(valor),
      },
      {
        params: { modelo },
      },
    );

    return response.data;
  } catch (error) {
    console.error("Error guardando configuración", error);
    throw error;
  }
};

export const importarDefectuosos = async (archivo) => {
  const formData = new FormData();
  formData.append("file", archivo);
  return (
    await api.post("/admin/importar-defectuosos", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data;
};

export const obtenerDmcDefectuosos = async () => {
  const response = await api.get("/admin/dmc-defectuosos");

  return response.data; // Devuelve ["A1", "B2", ...]
};

export const getCeldasCaja = async (idTemporal) => {
  const res = await api.get(`/admin/${idTemporal}/celdas`);
  return res.data;
};

export const sustituirCelda = async (payload) => {
  const res = await api.post("/admin/sustituir-celda", payload);
  return res.data;
};

export const eliminarCaja = async (id_temporal) => {
  const response = await api.delete(`/admin/cajas/${id_temporal}`);
  return response.data;
};
