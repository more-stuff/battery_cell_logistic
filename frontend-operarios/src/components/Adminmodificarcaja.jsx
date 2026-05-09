import { useState } from "react";
import Swal from "sweetalert2";
import { getCeldasCaja, sustituirCelda } from "../services/api";
import { extractFechaCaducidad } from "../services/extractFecha";

// ── Estados del flujo ─────────────────────────────────────────────────────────
// IDLE        → pantalla inicial, input de TMP id
// LOADING     → cargando celdas
// LISTA       → mostrando celdas, con filtro y selección
// FORMULARIO  → celda elegida, rellenando nueva celda
// GUARDANDO   → petición POST en vuelo

export const AdminModificarCaja = () => {
  const [fase, setFase] = useState("IDLE");
  const [idInput, setIdInput] = useState("");
  const [caja, setCaja] = useState(null); // respuesta GET celdas
  const [filtroDmc, setFiltroDmc] = useState("");
  const [celdaElegida, setCeldaElegida] = useState(null); // celda a sustituir

  // Formulario nueva celda
  const [nuevoDmc, setNuevoDmc] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState("OK");
  const [fechaError, setFechaError] = useState(""); // aviso extracción

  // Extrae la fecha automáticamente de los últimos 6 dígitos al escribir el DMC
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

  // ── Buscar caja ─────────────────────────────────────────────────────────────
  const buscarCaja = async () => {
    const id = idInput.trim().toUpperCase();
    if (!id) return;
    setFase("LOADING");
    try {
      const data = await getCeldasCaja(id);
      setCaja(data);
      setFiltroDmc("");
      setCeldaElegida(null);
      setFase("LISTA");
    } catch (err) {
      const detail = err.response?.data?.detail ?? "Error al buscar la caja.";
      Swal.fire({ icon: "error", title: "Caja no encontrada", text: detail });
      setFase("IDLE");
    }
  };

  // ── Seleccionar celda ────────────────────────────────────────────────────────
  const seleccionarCelda = (celda) => {
    setCeldaElegida(celda);
    setNuevoDmc("");
    setNuevaFecha(celda.fecha_caducidad ?? "");
    setNuevoEstado(celda.estado_calidad ?? "OK");
    setFase("FORMULARIO");
  };

  // ── Confirmar sustitución ────────────────────────────────────────────────────
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

    const confirm = await Swal.fire({
      icon: "question",
      title: "¿Confirmar sustitución?",
      html: `<b>Sale:</b> <code>${celdaElegida.dmc_code}</code><br/><b>Entra:</b> <code>${nuevoDmc.trim()}</code>`,
      showCancelButton: true,
      confirmButtonText: "Sí, sustituir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2c3e50",
    });
    if (!confirm.isConfirmed) return;

    setFase("GUARDANDO");
    try {
      const user = JSON.parse(localStorage.getItem("admin_user") ?? "{}");
      const res = await sustituirCelda({
        id_temporal: caja.id_temporal,
        dmc_antiguo: celdaElegida.dmc_code,
        nueva_celda: {
          dmc_code: nuevoDmc.trim(),
          fecha_caducidad: nuevaFecha,
          hu_origen: celdaElegida.hu_origen ?? null,
          estado_calidad: nuevoEstado,
        },
        usuario_id: user.username ?? "admin",
      });

      // Actualizar lista local sin volver a hacer GET
      const celdasActualizadas = caja.celdas.map((c) =>
        c.dmc_code === celdaElegida.dmc_code
          ? {
              ...c,
              dmc_code: nuevoDmc.trim(),
              fecha_caducidad: nuevaFecha,
              estado_calidad: nuevoEstado,
            }
          : c,
      );
      setCaja({
        ...caja,
        celdas: celdasActualizadas,
        fecha_caducidad_caja: res.nueva_fecha_caducidad_caja,
      });

      setCeldaElegida(null);
      setFase("LISTA");

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
      setFase("FORMULARIO");
    }
  };

  // ── Filtrado ─────────────────────────────────────────────────────────────────
  const celdasFiltradas =
    caja?.celdas?.filter((c) =>
      c.dmc_code.toLowerCase().includes(filtroDmc.toLowerCase()),
    ) ?? [];

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={s.page}>
      <h2 style={s.titulo}>🔧 Modificar Caja Cerrada</h2>
      <p style={s.subtitulo}>
        Busca una caja por su identificador temporal, selecciona la celda a
        sustituir e introduce los datos de la nueva unidad.
      </p>

      {/* ── BUSCADOR ─────────────────────────────────────────────────────── */}
      <div style={s.card}>
        <label style={s.label}>Identificador de caja (TMP-...)</label>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={s.input}
            placeholder="Ej: TMP-196A4F3B2E8C"
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarCaja()}
            disabled={fase === "LOADING" || fase === "GUARDANDO"}
          />
          <button
            style={s.btnPrimario}
            onClick={buscarCaja}
            disabled={
              fase === "LOADING" || fase === "GUARDANDO" || !idInput.trim()
            }
          >
            {fase === "LOADING" ? "Buscando…" : "🔍 Buscar"}
          </button>
          {caja && (
            <button
              style={s.btnSecundario}
              onClick={() => {
                setCaja(null);
                setIdInput("");
                setFase("IDLE");
              }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── INFO CAJA ────────────────────────────────────────────────────── */}
      {caja && (
        <div style={s.infoBanner}>
          <span>
            📦 <b>{caja.id_temporal}</b>
          </span>
          <span>
            Celdas: <b>{caja.total_celdas}</b>
          </span>
          <span>
            Caducidad caja: <b>{caja.fecha_caducidad_caja ?? "—"}</b>
          </span>
          <span
            style={{
              background: caja.is_defective ? "#c0392b" : "#27ae60",
              color: "white",
              padding: "2px 10px",
              borderRadius: 12,
              fontSize: "0.8rem",
            }}
          >
            {caja.is_defective ? "DEFECTUOSA" : "ESTÁNDAR"}
          </span>
        </div>
      )}

      {/* ── LISTA DE CELDAS ──────────────────────────────────────────────── */}
      {(fase === "LISTA" || fase === "FORMULARIO" || fase === "GUARDANDO") &&
        caja && (
          <div style={s.card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <span style={s.label}>Celdas de la caja</span>
              <input
                style={{ ...s.input, flex: 1, marginBottom: 0 }}
                placeholder="🔍 Filtrar por DMC…"
                value={filtroDmc}
                onChange={(e) => setFiltroDmc(e.target.value)}
              />
              <span
                style={{
                  color: "#888",
                  fontSize: "0.85rem",
                  whiteSpace: "nowrap",
                }}
              >
                {celdasFiltradas.length} / {caja.celdas.length}
              </span>
            </div>

            <div style={s.tablaWrapper}>
              <table style={s.tabla}>
                <thead>
                  <tr>
                    {["#", "DMC", "Caducidad", "Estado", "HU Origen", ""].map(
                      (h) => (
                        <th key={h} style={s.th}>
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {celdasFiltradas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          ...s.td,
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
                      const esElegida =
                        celdaElegida?.dmc_code === celda.dmc_code;
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
                          <td style={{ ...s.td, color: "#aaa", width: 40 }}>
                            {i + 1}
                          </td>
                          <td
                            style={{
                              ...s.td,
                              fontFamily: "monospace",
                              fontWeight: "bold",
                            }}
                          >
                            {celda.dmc_code}
                          </td>
                          <td style={s.td}>{celda.fecha_caducidad}</td>
                          <td style={s.td}>
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
                              ...s.td,
                              color: "#2980b9",
                              fontFamily: "monospace",
                              fontSize: "0.85rem",
                            }}
                          >
                            {celda.hu_origen ?? "—"}
                          </td>
                          <td style={{ ...s.td, textAlign: "center" }}>
                            <button
                              style={esElegida ? s.btnElegido : s.btnElegir}
                              onClick={() => seleccionarCelda(celda)}
                              disabled={fase === "GUARDANDO"}
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

      {/* ── FORMULARIO NUEVA CELDA ────────────────────────────────────────── */}
      {fase === "FORMULARIO" && celdaElegida && (
        <div style={{ ...s.card, borderLeft: "4px solid #2980b9" }}>
          <h3 style={{ margin: "0 0 16px", color: "#2c3e50" }}>
            Nueva celda para sustituir{" "}
            <code style={s.code}>{celdaElegida.dmc_code}</code>
          </h3>

          <div style={s.formGrid}>
            <div>
              <label style={s.label}>Nuevo DMC *</label>
              <input
                style={s.input}
                placeholder="Escanea o escribe el nuevo DMC"
                value={nuevoDmc}
                onChange={(e) => handleNuevoDmcChange(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label style={s.label}>Estado de calidad</label>
              <select
                style={s.input}
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
              >
                <option value="OK">OK</option>
                <option value="REVISION">REVISIÓN</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button style={s.btnPrimario} onClick={confirmarSustitucion}>
              ✅ Confirmar sustitución
            </button>
            <button
              style={s.btnSecundario}
              onClick={() => {
                setCeldaElegida(null);
                setFase("LISTA");
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Estilos ────────────────────────────────────────────────────────────────────
const s = {
  page: { maxWidth: 1100, margin: "0 auto" },
  titulo: { margin: "0 0 6px", color: "#2c3e50", fontSize: "1.6rem" },
  subtitulo: { margin: "0 0 24px", color: "#7f8c8d", fontSize: "0.95rem" },
  card: {
    background: "white",
    borderRadius: 10,
    padding: 24,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginBottom: 20,
  },
  infoBanner: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
    background: "#eaf4fb",
    border: "1px solid #aed6f1",
    borderRadius: 8,
    padding: "12px 20px",
    marginBottom: 20,
    fontSize: "0.95rem",
  },
  label: {
    display: "block",
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 6,
    fontSize: "0.9rem",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: "0.95rem",
    boxSizing: "border-box",
    outline: "none",
    marginBottom: 0,
  },
  formGrid: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 },
  tablaWrapper: {
    maxHeight: 420,
    overflowY: "auto",
    borderRadius: 6,
    border: "1px solid #eee",
  },
  tabla: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "10px 14px",
    background: "#f4f6f7",
    fontWeight: "bold",
    fontSize: "0.85rem",
    color: "#555",
    textAlign: "left",
    position: "sticky",
    top: 0,
    zIndex: 1,
    borderBottom: "2px solid #ddd",
  },
  td: {
    padding: "9px 14px",
    borderBottom: "1px solid #f0f0f0",
    fontSize: "0.9rem",
  },
  code: {
    background: "#f0f3f4",
    padding: "2px 8px",
    borderRadius: 4,
    fontFamily: "monospace",
  },
  btnPrimario: {
    padding: "10px 22px",
    background: "#2c3e50",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "0.95rem",
  },
  btnSecundario: {
    padding: "10px 22px",
    background: "#ecf0f1",
    color: "#2c3e50",
    border: "1px solid #bdc3c7",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "0.95rem",
  },
  btnElegir: {
    padding: "5px 14px",
    background: "#2980b9",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "0.82rem",
  },
  btnElegido: {
    padding: "5px 14px",
    background: "#27ae60",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "default",
    fontSize: "0.82rem",
  },
};
