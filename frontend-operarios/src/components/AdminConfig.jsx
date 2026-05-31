import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  obtenerConfiguracion,
  guardarConfiguracion,
  importarDefectuosos,
} from "../services/api";

export const AdminConfig = () => {
  // Estados para los valores
  const [config, setConfig] = useState({
    alerta_cada: "",
    limite_caja: "",
    limite_defectuosa: "",
    limite_caducidad_proxima: "",
    len_dmc: "",
    caducidad_proxima_dias: "",
  });

  const [loading, setLoading] = useState(true);

  // Cargar valores al iniciar
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const datos = await obtenerConfiguracion();
      setConfig({
        alerta_cada: datos.alerta_cada,
        limite_caja: datos.limite_caja,
        limite_defectuosa: datos.limite_defectuosa,
        limite_caducidad_proxima: datos.limite_caducidad_proxima,
        len_dmc: datos.len_dmc,
        caducidad_proxima_dias: datos.caducidad_proxima_dias,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio en inputs
  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  // Guardar cuando el usuario hace click en "Guardar"
  const handleGuardar = async (clave) => {
    try {
      const valor = config[clave];

      if (valor === "" || valor === null || valor === undefined) return;

      const clavesNumericasPositivas = [
        "limite_caja",
        "limite_defectuosa",
        "limite_caducidad_proxima",
        "len_dmc",
        "caducidad_proxima_dias",
      ];

      if (
        clavesNumericasPositivas.includes(clave) &&
        (!Number.isInteger(Number(valor)) || Number(valor) <= 0)
      ) {
        Swal.fire({
          icon: "warning",
          title: "Valor no válido",
          text: "El valor debe ser un número entero mayor que 0.",
        });
        return;
      }

      if (
        clave === "alerta_cada" &&
        Number(valor) !== -1 &&
        (!Number.isInteger(Number(valor)) || Number(valor) <= 0)
      ) {
        Swal.fire({
          icon: "warning",
          title: "Valor no válido",
          text: "La estrategia de calidad debe ser -1 o un número entero mayor que 0.",
        });
        return;
      }

      await guardarConfiguracion(clave, valor);

      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      Toast.fire({
        icon: "success",
        title: "Configuración actualizada",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar el cambio",
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Confirmación visual
    const result = await Swal.fire({
      title: "¿Importar Defectuosos?",
      text: `Se cargarán los códigos del archivo: ${file.name}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, importar",
      confirmButtonColor: "#d33",
    });

    if (result.isConfirmed) {
      try {
        Swal.showLoading(); // Mostrar spinner
        const res = await importarDefectuosos(file);
        console.log(res);
        Swal.fire("Importado", res.mensaje, "success");
      } catch (error) {
        console.error(error);
        Swal.fire(
          "Error",
          "Fallo al leer el archivo. Revisa que tenga columna 'DMC'.",
          "error",
        );
      }
    }

    // Limpiar el input para permitir subir el mismo archivo otra vez si falla
    e.target.value = null;
  };

  if (loading) return <p>Cargando configuración...</p>;

  return (
    <div style={estilos.card}>
      <h2 style={estilos.titulo}>⚙️ Configuración Global</h2>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Estos cambios afectan a <strong>todos los operarios</strong>{" "}
        inmediatamente.
      </p>

      <div style={estilos.grid}>
        {/* CONFIG 1: LÍMITE DE CAJA */}
        <div style={estilos.item}>
          <label style={estilos.label}>
            📦 Límite de piezas por caja normal
          </label>
          <div style={estilos.inputGroup}>
            <input
              type="number"
              name="limite_caja"
              value={config.limite_caja}
              onChange={handleChange}
              min="1"
              style={estilos.input}
            />
            <button
              onClick={() => handleGuardar("limite_caja")}
              style={estilos.btnGuardar}
            >
              Guardar
            </button>
          </div>
          <small style={estilos.help}>
            El operario verá la caja normal llena al llegar a este número.
          </small>
        </div>

        {/* CONFIG: LONGITUD DMC */}
        <div style={estilos.item}>
          <label style={estilos.label}>📦 Longitud de los códigos DMC</label>
          <div style={estilos.inputGroup}>
            <input
              type="number"
              name="len_dmc"
              value={config.len_dmc}
              onChange={handleChange}
              min="1"
              style={estilos.input}
            />
            <button
              onClick={() => handleGuardar("len_dmc")}
              style={estilos.btnGuardar}
            >
              Guardar
            </button>
          </div>
          <small style={estilos.help}>
            Al operario se le exigirá que los DMC de las celdas tengan esta
            longitud.
          </small>
        </div>

        {/* CONFIG: LONGITUD CAJA DEFECTUOSA */}
        <div style={estilos.item}>
          <label style={estilos.label}>
            📦 Longitud de las cajas con celdas de DMC defectuosos
          </label>
          <div style={estilos.inputGroup}>
            <input
              type="number"
              name="limite_defectuosa"
              value={config.limite_defectuosa}
              onChange={handleChange}
              min="1"
              style={estilos.input}
            />
            <button
              onClick={() => handleGuardar("limite_defectuosa")}
              style={estilos.btnGuardar}
            >
              Guardar
            </button>
          </div>
          <small style={estilos.help}>
            El operario verá la caja de defectuosas llena al llegar a este
            número.
          </small>
        </div>

        {/* CONFIG: LONGITUD CAJA CADUCIDAD PRÓXIMA */}
        <div style={estilos.item}>
          <label style={estilos.label}>
            📦 Longitud de las cajas de caducidad próxima
          </label>
          <div style={estilos.inputGroup}>
            <input
              type="number"
              name="limite_caducidad_proxima"
              value={config.limite_caducidad_proxima}
              onChange={handleChange}
              min="1"
              style={estilos.input}
            />
            <button
              onClick={() => handleGuardar("limite_caducidad_proxima")}
              style={estilos.btnGuardar}
            >
              Guardar
            </button>
          </div>
          <small style={estilos.help}>
            El operario verá la caja de caducidad próxima llena al llegar a este
            número.
          </small>
        </div>

        {/* CONFIG: CADUCIDAD PRÓXIMA */}
        <div style={estilos.item}>
          <label style={estilos.label}>⏳ Días para caducidad próxima</label>
          <div style={estilos.inputGroup}>
            <input
              type="number"
              name="caducidad_proxima_dias"
              value={config.caducidad_proxima_dias}
              onChange={handleChange}
              min="1"
              style={estilos.input}
            />
            <button
              onClick={() => handleGuardar("caducidad_proxima_dias")}
              style={estilos.btnGuardar}
            >
              Guardar
            </button>
          </div>
          <small style={estilos.help}>
            Las celdas cuya caducidad esté dentro de este número de días se
            considerarán de caducidad próxima.
          </small>
        </div>

        {/* CONFIG 2: FRECUENCIA DE REVISIÓN */}
        <div style={estilos.item}>
          <label style={estilos.label}>⚠️ Estrategia de Calidad</label>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {/* SELECTOR DE MODO */}
            <select
              value={Number(config.alerta_cada) === -1 ? "-1" : "intervalo"}
              onChange={(e) => {
                const val = e.target.value;
                setConfig({ ...config, alerta_cada: val === "-1" ? -1 : 15 });
              }}
              style={estilos.input}
            >
              <option value="intervalo">Por intervalo — cada X piezas</option>
              <option value="-1">Solo primera y última pieza</option>
            </select>

            {/* INPUT DE NÚMERO */}
            {Number(config.alerta_cada) !== -1 && (
              <div style={estilos.inputGroup}>
                <input
                  type="number"
                  name="alerta_cada"
                  value={config.alerta_cada}
                  onChange={handleChange}
                  placeholder="Ej: 15"
                  min="1"
                  style={estilos.input}
                />
                <span
                  style={{
                    alignSelf: "center",
                    fontSize: "0.8rem",
                    color: "#666",
                  }}
                >
                  piezas
                </span>
              </div>
            )}

            <button
              onClick={() => handleGuardar("alerta_cada")}
              style={estilos.btnGuardar}
            >
              💾 Guardar Configuración
            </button>
          </div>

          <small style={estilos.help}>
            {Number(config.alerta_cada) === -1
              ? "Se revisará la pieza #1 y la última pieza de cada tipo de caja."
              : "Se revisará cada " +
                config.alerta_cada +
                " piezas escaneadas."}
          </small>
        </div>

        <div style={estilos.item}>
          <label style={estilos.label}>
            🚨 Carga Masiva de Defectuosos (CSV)
          </label>
          <div style={estilos.inputGroup}>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ ...estilos.input, border: "2px dashed #e74c3c" }}
            />
          </div>
          <small style={estilos.help}>
            El archivo ha de ser un csv con una única columna llamada <b>DMC</b>
            .
          </small>
        </div>
      </div>
    </div>
  );
};

// ESTILOS SENCILLOS
const estilos = {
  card: {
    background: "white",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    maxWidth: "900px",
    margin: "20px auto",
    fontFamily: "Segoe UI, sans-serif",
  },
  titulo: {
    margin: "0 0 10px 0",
    color: "#2c3e50",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "30px",
  },
  item: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontWeight: "bold",
    color: "#34495e",
  },
  inputGroup: {
    display: "flex",
    gap: "10px",
  },
  input: {
    padding: "10px",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "6px",
    flex: 1,
  },
  btnGuardar: {
    padding: "10px 20px",
    background: "#3498db",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  help: {
    color: "#7f8c8d",
    fontSize: "0.85rem",
  },
};
