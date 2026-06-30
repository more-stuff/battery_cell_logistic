import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  getCeldasCaja,
  sustituirCelda,
  eliminarCaja,
  obtenerConfiguracion,
  obtenerDmcDefectuosos,
} from "../services/api";
import { extractFechaCaducidad } from "../services/extractFecha";
import { estilos } from "../styles/AdminModificarCaja.styles";
import {
  TIPOS_CAJA,
  validarCeldaPorTipoCaja,
} from "../services/validarCeldaPorTipoCaja";

export const AdminModificarCaja = () => {
  const [idInput, setIdInput] = useState("");
  const [caja, setCaja] = useState(null);
  const [filtroDmc, setFiltroDmc] = useState("");
  const [celdaElegida, setCeldaElegida] = useState(null);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [config, setConfig] = useState({
    caducidad_proxima_dias: 30,
  });

  const [blacklist, setBlacklist] = useState(new Set());

  const [nuevoDmc, setNuevoDmc] = useState("");
  const [nuevoHuOrigen, setNuevoHuOrigen] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState("OK");
  const [fechaError, setFechaError] = useState("");

  useEffect(() => {
    const cargarBlacklist = async () => {
      try {
        const listaDefectuosos = await obtenerDmcDefectuosos();
        setBlacklist(new Set(listaDefectuosos));
      } catch (error) {
        console.error("Error cargando lista de defectuosos:", error);
      }
    };

    cargarBlacklist();
  }, []);

  const getTipoCajaActual = () => {
    if (caja?.tipo_caja) return caja.tipo_caja;

    return caja?.is_defective ? TIPOS_CAJA.DEFECTUOSA : TIPOS_CAJA.NORMAL;
  };

  const getLabelTipoCaja = () => {
    const tipo = getTipoCajaActual();

    if (tipo === TIPOS_CAJA.DEFECTUOSA) return "DEFECTUOSA";
    if (tipo === TIPOS_CAJA.CADUCIDAD_PROXIMA) return "CADUCIDAD PRÓXIMA";
    return "NORMAL";
  };

  const getEstiloTipoCaja = () => {
    const tipo = getTipoCajaActual();

    if (tipo === TIPOS_CAJA.DEFECTUOSA) return estilos.badgeDefectuosa;
    if (tipo === TIPOS_CAJA.CADUCIDAD_PROXIMA) {
      return estilos.badgeCaducidadProxima;
    }

    return estilos.badgeEstandar;
  };

  const handleNuevoDmcChange = (valor) => {
    setNuevoDmc(valor);
    setFechaError("");

    if (valor.length >= 6) {
      const result = extractFechaCaducidad(valor);

      if (result.ok) {
        setNuevaFecha(result.fecha);
      } else {
        setNuevaFecha("");
        setFechaError(result.error);
      }
    } else {
      setNuevaFecha("");
    }
  };

  const buscarCaja = async () => {
    const id = idInput.trim();
    if (!id) return;

    setLoading(true);

    try {
      // 1. Recuperamos la caja: aquí ya viene su modelo real.
      const data = await getCeldasCaja(id);

      // 2. Cargamos la configuración del modelo de ESA caja.
      const modeloCaja = data.modelo || "MODELO1";
      const datosConfig = await obtenerConfiguracion(modeloCaja);

      setConfig({
        caducidad_proxima_dias: Number(
          datosConfig.caducidad_proxima_dias || 30,
        ),
      });

      // Solo mostramos la caja cuando ya conocemos sus reglas correctas.
      setCaja(data);
      setFiltroDmc("");
      setCeldaElegida(null);
    } catch (err) {
      const detail = err.response?.data?.detail ?? "Error al buscar la caja.";
      Swal.fire({ icon: "error", title: "Caja no encontrada", text: detail });
    } finally {
      setLoading(false);
    }
  };

  const limpiar = () => {
    setCaja(null);
    setIdInput("");
    setCeldaElegida(null);
    setFiltroDmc("");
    setNuevoDmc("");
    setNuevaFecha("");
    setNuevoEstado("OK");
    setFechaError("");
    setNuevoHuOrigen("");
  };

  const handleEliminarCaja = async () => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar caja completa?",
      html: `
        <p>Se eliminará la caja <b>${caja.id_temporal}</b> y sus <b>${caja.total_celdas} celdas</b>.</p>
        <p style="color:#e74c3c; font-weight:bold; margin-top:10px;">Esta acción no se puede deshacer.</p>
      `,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e74c3c",
    });

    if (!confirm.isConfirmed) return;

    setGuardando(true);

    try {
      await eliminarCaja(caja.id_temporal);
      limpiar();

      Swal.fire({
        icon: "success",
        title: "Caja eliminada",
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (err) {
      const detail = err.response?.data?.detail ?? "Error al eliminar la caja.";
      Swal.fire({ icon: "error", title: "Error", text: detail });
    } finally {
      setGuardando(false);
    }
  };

  const seleccionarCelda = (celda) => {
    setCeldaElegida(celda);
    setNuevoDmc("");
    setNuevaFecha(celda.fecha_caducidad ?? "");
    setNuevoEstado(celda.estado_calidad ?? "OK");
    setFechaError("");
  };

  const confirmarSustitucion = async () => {
    if (!nuevoDmc.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Falta el nuevo DMC",
        text: "Introduce el código DMC de la celda nueva.",
      });
      return;
    }

    if (!nuevaFecha) {
      Swal.fire({
        icon: "warning",
        title: "Falta la fecha",
        text: "Introduce la fecha de caducidad de la celda nueva.",
      });
      return;
    }
    if (!nuevoHuOrigen.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Falta el HU de origen",
        text: "Introduce el HU de origen de la celda nueva.",
      });
      return;
    }

    const tipoCajaActual = getTipoCajaActual();

    const validacionTipoCaja = validarCeldaPorTipoCaja({
      tipoCaja: tipoCajaActual,
      dmc: nuevoDmc.trim(),
      fechaCaducidad: nuevaFecha,
      blacklist,
      diasCaducidadProxima: config.caducidad_proxima_dias,
    });

    if (!validacionTipoCaja.ok) {
      Swal.fire({
        icon: "error",
        title: "Celda no válida para esta caja",
        text: validacionTipoCaja.error,
        confirmButtonColor: "#d33",
      });
      return;
    }

    const confirm = await Swal.fire({
      icon: "question",
      title: "¿Confirmar sustitución?",
      html: `
        <b>Sale:</b> <code>${celdaElegida.dmc_code}</code><br/>
        <b>Entra:</b> <code>${nuevoDmc.trim()}</code>
      `,
      showCancelButton: true,
      confirmButtonText: "Sí, sustituir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2c3e50",
    });

    if (!confirm.isConfirmed) return;

    setGuardando(true);

    try {
      const user = JSON.parse(localStorage.getItem("admin_user") ?? "{}");

      const res = await sustituirCelda({
        id_temporal: caja.id_temporal,
        dmc_antiguo: celdaElegida.dmc_code,
        nueva_celda: {
          dmc_code: nuevoDmc.trim(),
          fecha_caducidad: nuevaFecha,
          hu_origen: nuevoHuOrigen.trim(),
          estado_calidad: nuevoEstado,
        },
        usuario_id: user.username ?? "admin",
      });

      setCaja({
        ...caja,
        celdas: caja.celdas.map((c) =>
          c.dmc_code === celdaElegida.dmc_code
            ? {
                ...c,
                dmc_code: nuevoDmc.trim(),
                hu_origen: nuevoHuOrigen.trim(),
                fecha_caducidad: nuevaFecha,
                estado_calidad: nuevoEstado,
              }
            : c,
        ),
        fecha_caducidad_caja: res.nueva_fecha_caducidad_caja,
      });

      setCeldaElegida(null);
      setNuevoDmc("");
      setNuevoHuOrigen("");
      setNuevaFecha("");
      setNuevoEstado("OK");
      setFechaError("");

      Swal.fire({
        icon: "success",
        title: "Celda sustituida",
        html: `Nueva caducidad de caja: <b>${res.nueva_fecha_caducidad_caja ?? "—"}</b>`,
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (err) {
      const detail = err.response?.data?.detail ?? "Error al sustituir.";
      Swal.fire({ icon: "error", title: "Error", text: detail });
    } finally {
      setGuardando(false);
    }
  };

  const celdasFiltradas =
    caja?.celdas?.filter((c) =>
      c.dmc_code.toLowerCase().includes(filtroDmc.toLowerCase()),
    ) ?? [];

  return (
    <div style={estilos.page}>
      <h2 style={estilos.titulo}>🔧 Modificar Caja Cerrada</h2>

      <p style={estilos.subtitulo}>
        Busca una caja por su identificador temporal, selecciona la celda a
        sustituir e introduce los datos de la nueva unidad.
      </p>

      <div style={estilos.card}>
        <label style={estilos.label}>Identificador de caja (TMP-...)</label>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={estilos.input}
            placeholder="Ej: TMP-196A4F3B2E8C"
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarCaja()}
            disabled={loading || guardando}
          />

          <button
            style={estilos.btnPrimario}
            onClick={buscarCaja}
            disabled={loading || guardando || !idInput.trim()}
          >
            {loading ? "Buscando…" : "🔍 Buscar"}
          </button>

          {caja && (
            <button style={estilos.btnSecundario} onClick={limpiar}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {caja && (
        <div style={estilos.infoBanner}>
          <span>
            📦 <b>{caja.id_temporal}</b>
          </span>

          <span>
            Celdas: <b>{caja.total_celdas}</b>
          </span>

          <span>
            Caducidad caja: <b>{caja.fecha_caducidad_caja ?? "—"}</b>
          </span>

          <span style={estilos.badgeModelo}>
            Modelo: <b>{caja.modelo || "MODELO1"}</b>
          </span>

          <span style={getEstiloTipoCaja()}>{getLabelTipoCaja()}</span>

          <button
            style={{
              ...estilos.btnPeligro,
              marginLeft: "auto",
              opacity: guardando ? 0.5 : 1,
            }}
            onClick={handleEliminarCaja}
            disabled={guardando}
          >
            🗑️ Eliminar caja
          </button>
        </div>
      )}

      {caja && (
        <div style={estilos.card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <span style={estilos.label}>Celdas de la caja</span>

            <input
              style={{ ...estilos.input, flex: 1, marginBottom: 0 }}
              placeholder="🔍 Filtrar por DMC…"
              value={filtroDmc}
              onChange={(e) => setFiltroDmc(e.target.value)}
            />
          </div>

          <div style={estilos.tablaWrapper}>
            <table style={estilos.tabla}>
              <thead>
                <tr>
                  <th style={estilos.th}>#</th>
                  <th style={estilos.th}>DMC</th>
                  <th style={estilos.th}>Caducidad</th>
                  <th style={estilos.th}>Estado</th>
                  <th style={estilos.th}>HU Origen</th>
                  <th style={estilos.th}>Acción</th>
                </tr>
              </thead>

              <tbody>
                {celdasFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        color: "#aaa",
                        padding: 24,
                      }}
                    >
                      No hay celdas que coincidan con el filtro.
                    </td>
                  </tr>
                ) : (
                  celdasFiltradas.map((celda, i) => {
                    const esElegida = celdaElegida?.dmc_code === celda.dmc_code;

                    return (
                      <tr
                        key={celda.dmc_code}
                        style={{
                          background: esElegida
                            ? "#ebf5fb"
                            : i % 2 === 0
                              ? "#fff"
                              : "#fafafa",
                          outline: esElegida ? "2px solid #2980b9" : "none",
                        }}
                      >
                        <td style={{ ...estilos.td, color: "#aaa", width: 40 }}>
                          {i + 1}
                        </td>

                        <td
                          style={{
                            ...estilos.td,
                            fontFamily: "monospace",
                            fontWeight: "bold",
                          }}
                        >
                          {celda.dmc_code}
                        </td>

                        <td style={estilos.td}>{celda.fecha_caducidad}</td>

                        <td style={estilos.td}>
                          <span
                            style={{
                              background:
                                celda.estado_calidad === "OK"
                                  ? "#27ae60"
                                  : "#e74c3c",
                              color: "white",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: "0.8rem",
                            }}
                          >
                            {celda.estado_calidad}
                          </span>
                        </td>

                        <td
                          style={{
                            ...estilos.td,
                            color: "#2980b9",
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                          }}
                        >
                          {celda.hu_origen ?? "—"}
                        </td>

                        <td style={{ ...estilos.td, textAlign: "center" }}>
                          <button
                            style={
                              esElegida ? estilos.btnElegido : estilos.btnElegir
                            }
                            onClick={() => seleccionarCelda(celda)}
                            disabled={guardando}
                          >
                            {esElegida ? "✓ Elegida" : "Sustituir"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {celdaElegida && (
        <div style={{ ...estilos.card, borderLeft: "4px solid #2980b9" }}>
          <h3 style={{ margin: "0 0 16px", color: "#2c3e50" }}>
            Nueva celda para sustituir{" "}
            <code style={estilos.code}>{celdaElegida.dmc_code}</code>
          </h3>

          <div style={estilos.formGrid}>
            <div>
              <label style={estilos.label}>Nuevo DMC *</label>

              <input
                style={estilos.input}
                placeholder="Escanea o escribe el nuevo DMC"
                value={nuevoDmc}
                onChange={(e) => handleNuevoDmcChange(e.target.value)}
                autoFocus
              />

              {fechaError && <p style={estilos.fechaError}>⚠️ {fechaError}</p>}
            </div>

            <div>
              <label style={estilos.label}>HU origen nueva celda *</label>

              <input
                style={estilos.input}
                placeholder="Escanea o escribe el HU de origen"
                value={nuevoHuOrigen}
                onChange={(e) => setNuevoHuOrigen(e.target.value)}
              />
            </div>

            <div>
              <label style={estilos.label}>Estado de calidad</label>

              <select
                style={estilos.input}
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
              >
                <option value="OK">OK</option>
                <option value="REVISION">REVISIÓN</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              style={estilos.btnPrimario}
              onClick={confirmarSustitucion}
              disabled={guardando}
            >
              {guardando ? "Guardando…" : "✅ Confirmar sustitución"}
            </button>

            <button
              style={estilos.btnSecundario}
              onClick={() => setCeldaElegida(null)}
              disabled={guardando}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
