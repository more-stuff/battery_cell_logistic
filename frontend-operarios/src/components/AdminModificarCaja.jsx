import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  getCeldasCaja,
  getEstadoEdicionCaja,
  sustituirCelda,
  eliminarCaja,
  liberarCelda,
  obtenerConfiguracion,
  obtenerDmcDefectuosos,
} from "../services/api";
import { extractFechaCaducidad } from "../services/extractFecha";
import { estilos } from "../styles/AdminModificarCaja.styles";
import {
  MOTIVOS,
  TIPOS_CAJA,
  validarCeldaPorTipoCaja,
} from "../services/validarCeldaPorTipoCaja";

const parsearVoltajeMedido = (entrada) => {
  const texto = String(entrada ?? "").trim();

  // El voltaje es opcional.
  if (!texto) {
    return {
      ok: true,
      valor: null,
    };
  }

  // Acepta V:1.5, V:1,5, 1.5, 1,5 o 1500.
  // No hacemos conversión entre voltios y milivoltios.
  const valorSinPrefijo = texto.replace(/^V\s*:\s*/i, "").trim();

  if (!/^[+-]?\d+(?:[.,]\d+)?$/.test(valorSinPrefijo)) {
    return {
      ok: false,
      error: "El voltaje no es válido. Usa, por ejemplo, V:1.5, V:1,5 o 1500.",
    };
  }

  const valor = Number(valorSinPrefijo.replace(",", "."));

  if (!Number.isFinite(valor)) {
    return {
      ok: false,
      error: "El voltaje no es válido.",
    };
  }

  return {
    ok: true,
    valor,
  };
};

export const AdminModificarCaja = () => {
  const [idInput, setIdInput] = useState("");
  const [caja, setCaja] = useState(null);
  const [bloqueo, setBloqueo] = useState(null);

  // Si sobre esta caja se puede soltar un DMC atrapado. Lo decide el backend
  // mirando el estado de la caja, y no se deduce del motivo del bloqueo: ese
  // motivo es uno solo, el primero que salta, y con la sincronización activa
  // tapa el EXPORTADO que hay debajo.
  const [puedeLiberar, setPuedeLiberar] = useState(false);

  // Si la caja se puede borrar entera. NO es lo contrario de `bloqueo`: una
  // caja ya exportada esta bloqueada para editar y aun asi se puede borrar,
  // que es justo el caso nuevo. Tambien lo decide el backend, con la misma
  // condicion que aplica el DELETE.
  const [puedeBorrar, setPuedeBorrar] = useState(false);
  const [filtroDmc, setFiltroDmc] = useState("");
  const [celdaElegida, setCeldaElegida] = useState(null);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [config, setConfig] = useState({
    caducidad_proxima_dias: 30,
    caducidad_proxima_defectuosa_dias: 30,
  });

  const [listaBloqueo, setListaBloqueo] = useState({
    defectuosos: new Set(),
    cobre: new Set(),
  });

  const [nuevoDmc, setNuevoDmc] = useState("");
  const [nuevoHuOrigen, setNuevoHuOrigen] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState("OK");
  const [fechaError, setFechaError] = useState("");

  const [nuevoVoltaje, setNuevoVoltaje] = useState("");
  const [voltajeError, setVoltajeError] = useState("");

  useEffect(() => {
    const cargarBlacklist = async () => {
      try {
        const datos = await obtenerDmcDefectuosos();

        if (
          !Array.isArray(datos?.defectuosos) ||
          !Array.isArray(datos?.cobre)
        ) {
          throw new Error("Respuesta inesperada del servidor.");
        }

        setListaBloqueo({
          defectuosos: new Set(datos.defectuosos),
          cobre: new Set(datos.cobre),
        });
      } catch (error) {
        console.error("Error cargando lista de defectuosos:", error);
        Swal.fire({
          icon: "error",
          title: "No se pudo cargar la lista de bloqueo",
          text: "La validación de celdas defectuosas/cobre estará desactivada hasta recargar la página.",
        });
      }
    };

    cargarBlacklist();
  }, []);

  const motivoDeBloqueo = (dmc) => {
    if (listaBloqueo.defectuosos.has(dmc)) return MOTIVOS.DEFECTUOSO;
    if (listaBloqueo.cobre.has(dmc)) return MOTIVOS.COBRE;
    return null;
  };

  const getTipoCajaActual = () => {
    if (caja?.tipo_caja) return caja.tipo_caja;

    return caja?.is_defective ? TIPOS_CAJA.DEFECTUOSA : TIPOS_CAJA.NORMAL;
  };

  const getLabelTipoCaja = () => {
    const tipo = getTipoCajaActual();

    if (tipo === TIPOS_CAJA.DEFECTUOSA) return "DEFECTUOSA";
    if (tipo === TIPOS_CAJA.CADUCIDAD_PROXIMA) return "CADUCIDAD PRÓXIMA";
    if (tipo === TIPOS_CAJA.COBRE) return "COBRE";
    return "NORMAL";
  };

  const getEstiloTipoCaja = () => {
    const tipo = getTipoCajaActual();

    if (tipo === TIPOS_CAJA.DEFECTUOSA) return estilos.badgeDefectuosa;
    if (tipo === TIPOS_CAJA.CADUCIDAD_PROXIMA) {
      return estilos.badgeCaducidadProxima;
    }
    if (tipo === TIPOS_CAJA.COBRE) return estilos.badgeCobre;

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
          datosConfig.caducidad_proxima_dias ?? 30,
        ),
        caducidad_proxima_defectuosa_dias: Number(
          datosConfig.caducidad_proxima_defectuosa_dias ??
            datosConfig.caducidad_proxima_dias ??
            30,
        ),
      });

      // 3. Preguntamos si además se podrá tocar. Lo consultamos al buscar y no
      // al confirmar para que el operario no rellene una sustitución entera
      // que el backend va a rechazar con un 409 en el último paso.
      let estado = null;

      try {
        estado = await getEstadoEdicionCaja(id);
      } catch (error) {
        // Aviso de cortesía: si falla, seguimos mostrando la caja. Quien manda
        // sigue siendo la comprobación del backend al sustituir o borrar.
        console.error("No se pudo consultar el estado de edición:", error);
      }

      // Solo mostramos la caja cuando ya conocemos sus reglas correctas.
      setCaja(data);
      setBloqueo(estado?.editable === false ? estado.motivo : null);
      setPuedeLiberar(estado?.puede_liberar_celdas ?? false);
      setPuedeBorrar(estado?.puede_borrar_caja ?? false);
      setFiltroDmc("");
      setCeldaElegida(null);

      /*  if (estado?.editable === false) {
        Swal.fire({
          icon: "warning",
          title: "Caja bloqueada",
          text:
            estado.motivo ??
            "Esta caja no se puede modificar aqui continua el proceso en silena.",
          confirmButtonColor: "#e67e22",
        });
      } */
    } catch (err) {
      const detail = err.response?.data?.detail ?? "Error al buscar la caja.";
      Swal.fire({ icon: "error", title: "Caja no encontrada", text: detail });
    } finally {
      setLoading(false);
    }
  };

  const limpiar = () => {
    setCaja(null);
    setBloqueo(null);
    setPuedeLiberar(false);
    setPuedeBorrar(false);
    setIdInput("");
    setCeldaElegida(null);
    setFiltroDmc("");
    setNuevoDmc("");
    setNuevaFecha("");
    setNuevoEstado("OK");
    setFechaError("");
    setNuevoHuOrigen("");
    setNuevoVoltaje("");
    setVoltajeError("");
  };

  // Borra la caja entera con sus celdas. Dos escenarios muy distintos detras
  // del mismo boton:
  //
  //   - Caja que aun no salio: no deja rastro fuera, es el borrado de siempre.
  //   - Caja ya enviada a SILENA: se borra igual (el backend lo permite a
  //     proposito), pero SILENA conserva su CSV. Ese borrado NO da de baja la
  //     caja alli, asi que hay que hacerlo tambien en SILENA por el ERP. Por
  //     eso el aviso no es un parrafo mas: se pide marcar la casilla antes de
  //     dejar confirmar.
  const handleEliminarCaja = async () => {
    // `puedeLiberar` es la respuesta del backend a "esta caja esta EXPORTADO",
    // la misma de la que cuelga el boton de liberar DMC. Aqui decide si el
    // borrado necesita el aviso de SILENA.
    const yaEnSilena = puedeLiberar;

    const confirm = await Swal.fire({
      icon: "warning",
      title: yaEnSilena
        ? "¿Eliminar una caja ya enviada a SILENA?"
        : "¿Eliminar caja completa?",
      html: yaEnSilena
        ? `
        <p>Se eliminará la caja <b>${caja.id_temporal}</b> y sus
        <b>${caja.total_celdas} celdas</b>. Sus DMC quedarán libres para volver
        a escanearlos.</p>
        <p style="background:#fdf3e3; border-left:4px solid #e67e22; color:#7e4b12;
                  padding:10px 14px; margin-top:12px; text-align:left;">
          <b>⚠️ Esta caja ya se envió a SILENA.</b><br/>
          Borrarla aquí <b>no</b> la da de baja allí: el fichero exportado sigue
          en su sitio. Tienes que darla de baja <b>también en SILENA</b>, o los
          dos sistemas quedarán descuadrados.
        </p>
        <p style="color:#e74c3c; font-weight:bold; margin-top:10px;">No se guarda
        copia del contenido. Esta acción no se puede deshacer.</p>
      `
        : `
        <p>Se eliminará la caja <b>${caja.id_temporal}</b> y sus <b>${caja.total_celdas} celdas</b>.</p>
        <p style="color:#e74c3c; font-weight:bold; margin-top:10px;">Esta acción no se puede deshacer.</p>
      `,
      input: yaEnSilena ? "checkbox" : undefined,
      inputValue: yaEnSilena ? 0 : undefined,
      inputPlaceholder: yaEnSilena
        ? "Me encargo de darla de baja también en SILENA"
        : undefined,
      inputValidator: yaEnSilena
        ? (marcado) =>
            marcado
              ? undefined
              : "Marca la casilla: la baja en SILENA no se hace sola."
        : undefined,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e74c3c",
    });

    if (!confirm.isConfirmed) return;

    setGuardando(true);

    try {
      const res = await eliminarCaja(caja.id_temporal);
      limpiar();

      Swal.fire({
        icon: "success",
        title: "Caja eliminada",
        // Con la caja ya borrada no hay pantalla donde repetir el aviso, asi
        // que este mensaje se queda hasta que lo cierren: es el ultimo sitio
        // donde recordar la baja en SILENA.
        html: res?.estaba_exportada
          ? `Se han borrado <b>${res.celdas_borradas}</b> celdas.<br/>
             <b>Acuérdate de darla de baja también en SILENA.</b>`
          : undefined,
        timer: res?.estaba_exportada ? undefined : 3000,
        showConfirmButton: Boolean(res?.estaba_exportada),
      });
    } catch (err) {
      const detail = err.response?.data?.detail ?? "Error al eliminar la caja.";
      Swal.fire({ icon: "error", title: "Error", text: detail });
    } finally {
      setGuardando(false);
    }
  };

  // Suelta un DMC atrapado en una caja fantasma. No sustituye: borra esa celda
  // para que el código vuelva a estar libre y se pueda escanear en su caja
  // buena. Solo se ofrece sobre cajas EXPORTADO, que es donde el backend lo
  // permite; sobre una caja aún sin enviar dejaría el CSV incompleto.
  const handleLiberarCelda = async (celda) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "¿Liberar este DMC?",
      html: `
        <p>Se borrará la celda <b><code>${celda.dmc_code}</code></b> de la caja
        <b>${caja.id_temporal}</b>.</p>
        <p style="margin-top:10px;">El DMC quedará libre para escanearlo en su
        caja correcta. La caja se queda con
        <b>${caja.total_celdas - 1}</b> celdas y sigue como enviada a SILENA.</p>
        <p style="color:#e74c3c; font-weight:bold; margin-top:10px;">No se guarda
        copia de la celda. Esta acción no se puede deshacer.</p>
      `,
      showCancelButton: true,
      confirmButtonText: "Sí, liberar el DMC",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e74c3c",
    });

    if (!confirm.isConfirmed) return;

    setGuardando(true);

    try {
      const user = JSON.parse(localStorage.getItem("admin_user") ?? "{}");

      const res = await liberarCelda({
        id_temporal: caja.id_temporal,
        dmc_code: celda.dmc_code,
        usuario_id: user.username ?? "admin",
      });

      // Quitamos la celda de la tabla sin recargar: la caja no cambia de
      // estado, así que no hace falta volver a preguntar por ella.
      setCaja({
        ...caja,
        celdas: caja.celdas.filter((c) => c.dmc_code !== celda.dmc_code),
        total_celdas: res.celdas_restantes,
        fecha_caducidad_caja: res.nueva_fecha_caducidad_caja,
      });

      if (celdaElegida?.dmc_code === celda.dmc_code) setCeldaElegida(null);

      Swal.fire({
        icon: "success",
        title: "DMC liberado",
        html: `Ya puedes escanear <code>${celda.dmc_code}</code> en su caja correcta.<br/>
               En la caja quedan <b>${res.celdas_restantes}</b> celdas.`,
      });
    } catch (err) {
      const detail = err.response?.data?.detail ?? "Error al liberar la celda.";
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
    setNuevoVoltaje("");
    setVoltajeError("");
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
    const resultadoVoltaje = parsearVoltajeMedido(nuevoVoltaje);

    if (!resultadoVoltaje.ok) {
      setVoltajeError(resultadoVoltaje.error);

      Swal.fire({
        icon: "warning",
        title: "Voltaje no válido",
        text: resultadoVoltaje.error,
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
      motivoBloqueo: motivoDeBloqueo(nuevoDmc.trim()),
      diasCaducidadProxima: config.caducidad_proxima_dias,
      diasCaducidadProximaDefectuosa: config.caducidad_proxima_defectuosa_dias,
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
          voltaje_medido: resultadoVoltaje.valor,
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
                voltaje_medido: resultadoVoltaje.valor,
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
      setNuevoVoltaje("");
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

  // Caja consultable pero de solo lectura: la sincronización está activa o ya
  // se exportó a SILENA. El backend lo vuelve a comprobar al escribir; esto es
  // solo para no dejar al operario avanzar en vano.
  //
  // Bloquea la sustitución, pero NO el borrado: una caja exportada no se edita
  // y aun así se puede borrar entera. Esa otra pregunta la responde
  // `puedeBorrar`, que viene del backend por separado.
  const cajaBloqueada = Boolean(bloqueo);

  // Caja ya enviada a SILENA: el único estado sobre el que se puede liberar
  // una celda atrapada. Lo responde el backend con la misma condición que
  // aplica /liberar-celda, así que el botón aparece exactamente cuando ese
  // endpoint lo va a aceptar, con la sincronización activa o en pausa.
  const cajaExportada = puedeLiberar;

  return (
    <div style={estilos.page}>
      <h2 style={estilos.titulo}>🔧 Modificar Caja Cerrada | Borrar celda</h2>

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
              opacity: guardando || !puedeBorrar ? 0.5 : 1,
              cursor: puedeBorrar ? "pointer" : "not-allowed",
            }}
            onClick={handleEliminarCaja}
            disabled={guardando || !puedeBorrar}
            title={
              puedeBorrar
                ? cajaExportada
                  ? "Borra la caja aquí. Recuerda darla de baja también en SILENA"
                  : "Borra la caja y todas sus celdas"
                : "Pausa la sincronización en Configuración para poder borrarla"
            }
          >
            🗑️ Eliminar caja
          </button>
        </div>
      )}

      {caja && cajaBloqueada && (
        <div style={estilos.bannerBloqueo}>
          {bloqueo}

          {cajaExportada && (
            <p style={{ fontWeight: "normal", margin: "8px 0 0" }}>
              Aunque no se pueda editar, sí se puede vaciar: usa{" "}
              <b>🔓 Liberar DMC</b> en una fila para soltar una celda que nunca
              estuvo dentro, o <b>🗑️ Eliminar caja</b> para quitarla entera.
              Las dos cosas liberan los DMC para reescanearlos, y en las dos la
              baja en SILENA sigue yendo por el ERP: aquí no se da.
            </p>
          )}
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
                  <th style={estilos.th}>Voltaje</th>
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
                        <td
                          style={{
                            ...estilos.td,
                            textAlign: "center",
                            fontFamily: "monospace",
                            fontWeight: "bold",
                            color:
                              celda.voltaje_medido === null ||
                              celda.voltaje_medido === undefined
                                ? "#999"
                                : "#2c3e50",
                          }}
                        >
                          {celda.voltaje_medido ?? "—"}
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
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              justifyContent: "center",
                            }}
                          >
                            <button
                              style={{
                                ...(esElegida
                                  ? estilos.btnElegido
                                  : estilos.btnElegir),
                                opacity: cajaBloqueada ? 0.4 : 1,
                                cursor: cajaBloqueada
                                  ? "not-allowed"
                                  : "pointer",
                              }}
                              onClick={() => seleccionarCelda(celda)}
                              disabled={guardando || cajaBloqueada}
                            >
                              {esElegida ? "✓ Elegida" : "Sustituir"}
                            </button>

                            {cajaExportada && (
                              <button
                                style={estilos.btnLiberar}
                                onClick={() => handleLiberarCelda(celda)}
                                disabled={guardando}
                                title="Borra esta celda para que su DMC se pueda escanear en otra caja"
                              >
                                🔓 Liberar DMC
                              </button>
                            )}
                          </div>
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
              <label style={estilos.label}>Voltaje medido</label>

              <input
                style={estilos.input}
                placeholder="Ej: V:1.5"
                value={nuevoVoltaje}
                onChange={(e) => {
                  setNuevoVoltaje(e.target.value);
                  setVoltajeError("");
                }}
              />

              {voltajeError && (
                <p style={estilos.fechaError}>⚠️ {voltajeError}</p>
              )}
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
