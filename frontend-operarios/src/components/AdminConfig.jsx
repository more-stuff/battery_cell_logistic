import { useCallback, useEffect, useRef, useState } from "react";
import { estilos } from "../styles/AdminConfig.styles";

import Swal from "sweetalert2";
import {
  obtenerConfiguracion,
  guardarConfiguracion,
  importarDefectuosos,
} from "../services/api";
import { getTipoCajaUI } from "../services/tipoCajaUI";

const MODELOS = [
  {
    codigo: "MODELO1",
    titulo: "MODELO 1",
    descripcion: "Configuración independiente para este modelo de celda.",
  },
  {
    codigo: "MODELO2",
    titulo: "MODELO 2",
    descripcion: "Configuración independiente para este modelo de celda.",
  },
];

const CONFIG_INICIAL = {
  alerta_cada: "15",
  limite_caja: "180",
  limite_defectuosa: "180",
  limite_caducidad_proxima: "180",
  len_dmc: "87",
  caducidad_proxima_dias: "30",
  caducidad_proxima_defectuosa_dias: "30",
  tamano_nivel: "45",
};

const CLAVES_CAPACIDAD = [
  "limite_caja",
  "limite_defectuosa",
  "limite_caducidad_proxima",
  "tamano_nivel",
];

const CLAVES_LECTURA = [
  "len_dmc",
  "caducidad_proxima_dias",
  "caducidad_proxima_defectuosa_dias",
];

const CLAVES_CALIDAD = ["alerta_cada"];

// Listas de bloqueo disponibles. Los motivos son EXCLUYENTES: un DMC solo
// puede estar en una de las dos. Espeja MOTIVOS_VALIDOS de box_rules.py.
const LISTAS_BLOQUEO = [
  {
    motivo: "DEFECTUOSO",
    etiqueta: "DMC defectuosos",
    cajaDestino: "DEFECTUOSA",
  },
  {
    motivo: "COBRE",
    etiqueta: "DMC con partículas de cobre",
    cajaDestino: "COBRE",
  },
];

const getLista = (motivo) =>
  LISTAS_BLOQUEO.find((item) => item.motivo === motivo) ?? LISTAS_BLOQUEO[0];

// Insignia de color para los diálogos de importación (SweetAlert2 solo
// acepta HTML como string, no JSX). Usa el mismo color que el resto de la UI
// para ese tipo de caja, para que se reconozca de un vistazo qué lista se
// está tocando.
const badgeListaHtml = (lista) => {
  const color = getTipoCajaUI(lista.cajaDestino).colorPrincipal;

  return `<span style="display:inline-block;padding:8px 18px;border-radius:999px;background:${color};color:#ffffff;font-weight:800;font-size:0.95rem;letter-spacing:0.03em;text-transform:uppercase;margin-bottom:10px;">${lista.etiqueta}</span>`;
};

// Interruptor global de SILENA: no depende del modelo seleccionado.
const FLAGS_INICIALES = {
  sync_activo: false,
};

const TEXTO_FLAG = {
  sync_activo: {
    activado: "Envío a SILENA reanudado: las cajas quedan bloqueadas",
    desactivado: "Envío a SILENA en pausa: ya se pueden corregir cajas",
  },
};

const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

const fechaInputDesdeDias = (dias) => {
  const cantidadDias = Number.isFinite(Number(dias)) ? Number(dias) : 30;

  const hoy = new Date();

  const fecha = new Date(
    Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()),
  );

  fecha.setUTCDate(fecha.getUTCDate() + cantidadDias);

  return fecha.toISOString().slice(0, 10);
};

const diasDesdeFechaInput = (fechaInput) => {
  if (!fechaInput) return null;

  const [anio, mes, dia] = fechaInput.split("-").map(Number);

  if (!anio || !mes || !dia) return null;

  const hoy = new Date();

  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const fechaSeleccionadaUTC = Date.UTC(anio, mes - 1, dia);

  return Math.round((fechaSeleccionadaUTC - hoyUTC) / MILISEGUNDOS_POR_DIA);
};

const convertirConfiguracion = (datos) => ({
  tamano_nivel: String(datos?.tamano_nivel ?? CONFIG_INICIAL.tamano_nivel),
  alerta_cada: String(datos?.alerta_cada ?? CONFIG_INICIAL.alerta_cada),
  limite_caja: String(datos?.limite_caja ?? CONFIG_INICIAL.limite_caja),
  limite_defectuosa: String(
    datos?.limite_defectuosa ?? CONFIG_INICIAL.limite_defectuosa,
  ),
  limite_caducidad_proxima: String(
    datos?.limite_caducidad_proxima ?? CONFIG_INICIAL.limite_caducidad_proxima,
  ),
  len_dmc: String(datos?.len_dmc ?? CONFIG_INICIAL.len_dmc),
  caducidad_proxima_dias: String(
    datos?.caducidad_proxima_dias ?? CONFIG_INICIAL.caducidad_proxima_dias,
  ),
  caducidad_proxima_defectuosa_dias: String(
    datos?.caducidad_proxima_defectuosa_dias ??
      datos?.caducidad_proxima_dias ??
      CONFIG_INICIAL.caducidad_proxima_defectuosa_dias,
  ),
});

const esEnteroPositivo = (valor) =>
  Number.isInteger(Number(valor)) && Number(valor) > 0;

const validarConfiguracion = (config, claves) => {
  for (const clave of claves) {
    const valor = config[clave];

    if (clave === "alerta_cada") {
      if (Number(valor) !== -1 && !esEnteroPositivo(valor)) {
        return "El control de calidad debe ser -1 o un número entero mayor que 0.";
      }
      continue;
    }

    if (!esEnteroPositivo(valor)) {
      return "Todos los valores deben ser números enteros mayores que 0.";
    }
  }

  return null;
};

const SeccionConfiguracion = ({ titulo, descripcion, children, accion }) => (
  <section style={estilos.seccion}>
    <div style={estilos.seccionCabecera}>
      <div>
        <h3 style={estilos.seccionTitulo}>{titulo}</h3>
        <p style={estilos.seccionDescripcion}>{descripcion}</p>
      </div>
      {accion}
    </div>
    {children}
  </section>
);

const CampoNumerico = ({
  etiqueta,
  ayuda,
  nombre,
  valor,
  onChange,
  sufijo,
}) => (
  <label style={estilos.campo}>
    <span style={estilos.campoEtiqueta}>{etiqueta}</span>
    <div style={estilos.inputConSufijo}>
      <input
        type="number"
        name={nombre}
        value={valor}
        onChange={onChange}
        min="1"
        step="1"
        style={estilos.inputNumero}
      />
      {sufijo && <span style={estilos.sufijo}>{sufijo}</span>}
    </div>
    <span style={estilos.ayuda}>{ayuda}</span>
  </label>
);

const Interruptor = ({
  titulo,
  ayuda,
  activo,
  onToggle,
  deshabilitado,
  colorActivo,
}) => (
  <div style={estilos.interruptor}>
    <div>
      <span style={estilos.interruptorTitulo}>{titulo}</span>
      <span style={estilos.interruptorAyuda}>{ayuda}</span>
    </div>

    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={titulo}
      onClick={onToggle}
      disabled={deshabilitado}
      style={{
        ...estilos.interruptorRail,
        ...(activo ? colorActivo : {}),
        ...(deshabilitado ? estilos.botonDeshabilitado : {}),
      }}
    >
      <span
        style={{
          ...estilos.interruptorBola,
          ...(activo ? estilos.interruptorBolaActiva : {}),
        }}
      />
    </button>
  </div>
);

export const AdminConfig = () => {
  const [modelo, setModelo] = useState("MODELO1");
  const [config, setConfig] = useState(CONFIG_INICIAL);
  const [flags, setFlags] = useState(FLAGS_INICIALES);
  const [guardandoFlag, setGuardandoFlag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardandoBloque, setGuardandoBloque] = useState(null);
  const [ultimoIntervaloCalidad, setUltimoIntervaloCalidad] = useState("15");

  const [motivoImport, setMotivoImport] = useState("DEFECTUOSO");

  const [fechaCaducidadProxima, setFechaCaducidadProxima] = useState(() =>
    fechaInputDesdeDias(CONFIG_INICIAL.caducidad_proxima_dias),
  );

  const [fechaCaducidadProximaDefectuosa, setFechaCaducidadProximaDefectuosa] =
    useState(() =>
      fechaInputDesdeDias(CONFIG_INICIAL.caducidad_proxima_defectuosa_dias),
    );

  const inputArchivoRef = useRef(null);

  const cargarDatos = useCallback(async (modeloSeleccionado) => {
    setLoading(true);

    try {
      const datos = await obtenerConfiguracion(modeloSeleccionado);
      const configuracionNormalizada = convertirConfiguracion(datos);

      setConfig(configuracionNormalizada);

      setFlags({
        sync_activo: Boolean(datos?.sync_activo ?? FLAGS_INICIALES.sync_activo),
      });

      setFechaCaducidadProxima(
        fechaInputDesdeDias(configuracionNormalizada.caducidad_proxima_dias),
      );

      setFechaCaducidadProximaDefectuosa(
        fechaInputDesdeDias(
          configuracionNormalizada.caducidad_proxima_defectuosa_dias,
        ),
      );

      if (Number(configuracionNormalizada.alerta_cada) !== -1) {
        setUltimoIntervaloCalidad(configuracionNormalizada.alerta_cada);
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "No se ha podido cargar la configuración",
        text: "Revisa la conexión con el servidor e inténtalo de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos(modelo);
  }, [modelo, cargarDatos]);

  const handleCambioModelo = (nuevoModelo) => {
    if (nuevoModelo === modelo || loading || guardandoBloque) return;
    setModelo(nuevoModelo);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setConfig((actual) => ({
      ...actual,
      [name]: value,
    }));

    if (name === "alerta_cada" && esEnteroPositivo(value)) {
      setUltimoIntervaloCalidad(value);
    }
  };

  const handleModoCalidad = (event) => {
    const esSoloExtremos = event.target.value === "extremos";

    setConfig((actual) => ({
      ...actual,
      alerta_cada: esSoloExtremos ? "-1" : ultimoIntervaloCalidad || "15",
    }));
  };

  const handleCambioFechaCaducidadProxima = (event) => {
    const nuevaFecha = event.target.value;

    const dias = diasDesdeFechaInput(nuevaFecha);

    if (!nuevaFecha || dias === null || dias < 1) {
      Swal.fire({
        icon: "warning",
        title: "Fecha no válida",
        text: "La fecha de caducidad próxima debe ser como mínimo mañana.",
      });

      return;
    }

    setFechaCaducidadProxima(nuevaFecha);

    setConfig((actual) => ({
      ...actual,
      caducidad_proxima_dias: String(dias),
    }));
  };
  const handleCambioFechaCaducidadProximaDefectuosa = (event) => {
    const nuevaFecha = event.target.value;

    const dias = diasDesdeFechaInput(nuevaFecha);

    if (!nuevaFecha || dias === null || dias < 1) {
      Swal.fire({
        icon: "warning",
        title: "Fecha no válida",
        text: "La caducidad próxima para defectuosas debe ser como mínimo mañana.",
      });

      return;
    }

    setFechaCaducidadProximaDefectuosa(nuevaFecha);

    setConfig((actual) => ({
      ...actual,
      caducidad_proxima_defectuosa_dias: String(dias),
    }));
  };

  const guardarBloque = async (nombreBloque, claves) => {
    const errorValidacion = validarConfiguracion(config, claves);

    if (errorValidacion) {
      Swal.fire({
        icon: "warning",
        title: "Revisa los valores",
        text: errorValidacion,
      });
      return;
    }

    setGuardandoBloque(nombreBloque);

    try {
      for (const clave of claves) {
        await guardarConfiguracion(modelo, clave, config[clave]);
      }

      Swal.fire({
        icon: "success",
        title: "Cambios guardados",
        text: `La configuración de ${modelo} se ha actualizado.`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "No se han podido guardar los cambios",
        text: "Puede que alguno de los valores se haya guardado. Recarga la configuración antes de continuar.",
      });
    } finally {
      setGuardandoBloque(null);
    }
  };

  // Los interruptores se guardan solos al pulsarlos: son globales y no tienen
  // valores que validar. Si el PUT falla se revierte la palanca.
  const cambiarFlag = async (clave, nuevoValor) => {
    if (guardandoFlag) return;

    setGuardandoFlag(clave);
    setFlags((actual) => ({ ...actual, [clave]: nuevoValor }));

    try {
      await guardarConfiguracion(modelo, clave, nuevoValor ? "1" : "0");

      Swal.fire({
        icon: "success",
        title: TEXTO_FLAG[clave][nuevoValor ? "activado" : "desactivado"],
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);

      setFlags((actual) => ({ ...actual, [clave]: !nuevoValor }));

      Swal.fire({
        icon: "error",
        title: "No se ha podido cambiar el interruptor",
        text: "Revisa la conexión con el servidor e inténtalo de nuevo.",
      });
    } finally {
      setGuardandoFlag(null);
    }
  };

  const handleFileUpload = async (event) => {
    const archivo = event.target.files?.[0];

    if (!archivo) return;

    const lista = getLista(motivoImport);

    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "¿Importar archivo?",
      html: `
        ${badgeListaHtml(lista)}
        <p>Se procesará "<b>${archivo.name}</b>".</p>
        <p>Debe tener una columna llamada exactamente <b>DMC</b>.</p>
        <p style="color:#c0392b;font-weight:bold;margin-top:12px;">
          Los DMC que ya estén en la otra lista se CAMBIARÁN a
          ${motivoImport}. Esta acción no se puede deshacer.
        </p>
      `,
      showCancelButton: true,
      confirmButtonText: "Sí, importar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#c0392b",
    });

    if (!confirmacion.isConfirmed) {
      event.target.value = "";
      return;
    }

    try {
      Swal.fire({
        title: "Importando archivo...",
        html: `
          ${badgeListaHtml(lista)}
          <p>Comprobando DMC y evitando duplicados.</p>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const respuesta = await importarDefectuosos(archivo, motivoImport, true);

      if (respuesta?.error) {
        throw new Error(respuesta.error);
      }

      const totalArchivo = Number(respuesta.total_archivo ?? 0);
      const nuevosInsertados = Number(respuesta.nuevos_insertados ?? 0);
      const yaExistian = Number(respuesta.ya_existian ?? 0);
      const conflictos = Number(respuesta.conflictos_otro_motivo ?? 0);
      const reclasificados = Number(respuesta.reclasificados ?? 0);

      Swal.fire({
        icon: "success",
        title: "Importación completada",
        html: `
        ${badgeListaHtml(getLista(respuesta.motivo ?? motivoImport))}
        <p><strong>DMC únicos en el archivo:</strong> ${totalArchivo}</p>
        <p><strong>Nuevos importados:</strong> ${nuevosInsertados}</p>
        <p><strong>Ya existentes en esta lista:</strong> ${yaExistian}</p>
        <p><strong>Estaban en la otra lista:</strong> ${conflictos}</p>
        <p><strong>Reclasificados:</strong> ${reclasificados}</p>
      `,
      });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "No se ha podido importar el archivo",
        text: "Debe ser un CSV o XLSX válido, con una columna llamada exactamente DMC.",
      });
    } finally {
      event.target.value = "";
    }
  };

  const modeloActivo = MODELOS.find((item) => item.codigo === modelo);
  const fechaMinimaCaducidad = fechaInputDesdeDias(1);
  const bloqueGuardando = (nombreBloque) => guardandoBloque === nombreBloque;
  const listaSeleccionada = getLista(motivoImport);

  return (
    <main style={estilos.contenedor}>
      <header style={estilos.cabecera}>
        <div>
          <p style={estilos.kicker}>ADMINISTRACIÓN</p>
          <h2 style={estilos.titulo}>Configuración de modelos</h2>
          <p style={estilos.subtitulo}>
            MODELO1 y MODELO2 mantienen parámetros independientes. Los cambios
            se aplican al modelo seleccionado.
          </p>
        </div>

        <div style={estilos.indicadorActivo}>
          <span style={estilos.indicadorPunto} />
          Editando {modelo}
        </div>
      </header>

      <section style={estilos.selectorZona}>
        <div>
          <h3 style={estilos.selectorTitulo}>Selecciona el modelo</h3>
          <p style={estilos.selectorDescripcion}>
            Cambia de modelo para ver y editar únicamente sus reglas.
          </p>
        </div>

        <div style={estilos.selectorModelos}>
          {MODELOS.map((item) => {
            const activo = item.codigo === modelo;

            return (
              <button
                key={item.codigo}
                type="button"
                onClick={() => handleCambioModelo(item.codigo)}
                disabled={Boolean(guardandoBloque)}
                style={{
                  ...estilos.botonModelo,
                  ...(activo ? estilos.botonModeloActivo : {}),
                }}
              >
                <span style={estilos.botonModeloTitulo}>{item.titulo}</span>
                <span style={estilos.botonModeloDescripcion}>
                  {item.descripcion}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div style={estilos.estadoCarga}>
          Cargando configuración de {modelo}…
        </div>
      ) : (
        <div style={estilos.contenido}>
          <div style={estilos.avisoModelo}>
            <strong>{modeloActivo?.titulo}</strong>
            <span>
              Los cambios guardados aquí no modifican los valores del otro
              modelo.
            </span>
          </div>

          <SeccionConfiguracion
            titulo="Capacidad de cajas"
            descripcion="Define cuántas celdas puede contener cada tipo de caja para este modelo."
            accion={
              <button
                type="button"
                onClick={() => guardarBloque("capacidad", CLAVES_CAPACIDAD)}
                disabled={Boolean(guardandoBloque)}
                style={{
                  ...estilos.botonPrimario,
                  ...(bloqueGuardando("capacidad")
                    ? estilos.botonDeshabilitado
                    : {}),
                }}
              >
                {bloqueGuardando("capacidad")
                  ? "Guardando…"
                  : "Guardar capacidades"}
              </button>
            }
          >
            <div style={estilos.gridTres}>
              <CampoNumerico
                etiqueta="Caja normal"
                ayuda="Máximo de piezas en una caja normal."
                nombre="limite_caja"
                valor={config.limite_caja}
                onChange={handleChange}
                sufijo="piezas"
              />
              <CampoNumerico
                etiqueta="Caja defectuosa y de cobre"
                ayuda="Máximo de piezas. Las cajas de cobre usan este mismo límite: son la misma caja física."
                nombre="limite_defectuosa"
                valor={config.limite_defectuosa}
                onChange={handleChange}
                sufijo="piezas"
              />
              <CampoNumerico
                etiqueta="Caducidad próxima"
                ayuda="Máximo de piezas en una caja de caducidad próxima."
                nombre="limite_caducidad_proxima"
                valor={config.limite_caducidad_proxima}
                onChange={handleChange}
                sufijo="piezas"
              />
              <CampoNumerico
                etiqueta="Piezas por nivel"
                ayuda="Número de celdas que se colocan antes de introducir el cartón separador."
                nombre="tamano_nivel"
                valor={config.tamano_nivel}
                onChange={handleChange}
                sufijo="celdas/nivel"
              />
            </div>
          </SeccionConfiguracion>

          <SeccionConfiguracion
            titulo="Lectura y caducidad"
            descripcion="Ajusta cómo se valida el DMC y cuándo una celda entra en caducidad próxima."
            accion={
              <button
                type="button"
                onClick={() => guardarBloque("lectura", CLAVES_LECTURA)}
                disabled={Boolean(guardandoBloque)}
                style={{
                  ...estilos.botonPrimario,
                  ...(bloqueGuardando("lectura")
                    ? estilos.botonDeshabilitado
                    : {}),
                }}
              >
                {bloqueGuardando("lectura") ? "Guardando…" : "Guardar reglas"}
              </button>
            }
          >
            <div style={estilos.gridTres}>
              <CampoNumerico
                etiqueta="Longitud del DMC"
                ayuda="Número exacto de caracteres que debe tener el DMC."
                nombre="len_dmc"
                valor={config.len_dmc}
                onChange={handleChange}
                sufijo="caracteres"
              />

              <label style={estilos.campo}>
                <span style={estilos.campoEtiqueta}>
                  Caducidad próxima hasta
                </span>

                <input
                  type="date"
                  value={fechaCaducidadProxima}
                  min={fechaMinimaCaducidad}
                  onChange={handleCambioFechaCaducidadProxima}
                  style={{
                    ...estilos.inputNumero,
                    borderRadius: 8,
                  }}
                />

                <span style={estilos.ayuda}>
                  Margen general usado por cajas normales y de caducidad
                  próxima.
                </span>
              </label>

              <label style={estilos.campo}>
                <span style={estilos.campoEtiqueta}>
                  Caducidad próxima en defectuosas y cobre hasta
                </span>

                <input
                  type="date"
                  value={fechaCaducidadProximaDefectuosa}
                  min={fechaMinimaCaducidad}
                  onChange={handleCambioFechaCaducidadProximaDefectuosa}
                  style={{
                    ...estilos.inputNumero,
                    borderRadius: 8,
                  }}
                />

                <span style={estilos.ayuda}>
                  Margen exclusivo de las cajas de material bloqueado. Una celda
                  dentro de este plazo no podrá entrar en una caja DEFECTUOSA ni
                  en una caja COBRE.
                </span>
              </label>
            </div>
          </SeccionConfiguracion>

          <SeccionConfiguracion
            titulo="Control de calidad"
            descripcion="Define en qué momentos se solicita la revisión manual durante el escaneo."
            accion={
              <button
                type="button"
                onClick={() => guardarBloque("calidad", CLAVES_CALIDAD)}
                disabled={Boolean(guardandoBloque)}
                style={{
                  ...estilos.botonPrimario,
                  ...(bloqueGuardando("calidad")
                    ? estilos.botonDeshabilitado
                    : {}),
                }}
              >
                {bloqueGuardando("calidad") ? "Guardando…" : "Guardar control"}
              </button>
            }
          >
            <div style={estilos.calidadContenido}>
              <label style={estilos.campo}>
                <span style={estilos.campoEtiqueta}>Modo de revisión</span>
                <select
                  value={
                    Number(config.alerta_cada) === -1 ? "extremos" : "intervalo"
                  }
                  onChange={handleModoCalidad}
                  style={estilos.select}
                >
                  <option value="intervalo">
                    Por intervalo: cada X piezas
                  </option>
                  <option value="extremos">Solo primera y última pieza</option>
                </select>
                <span style={estilos.ayuda}>
                  El modo seleccionado se aplicará a las nuevas cajas de este
                  modelo.
                </span>
              </label>

              {Number(config.alerta_cada) !== -1 && (
                <CampoNumerico
                  etiqueta="Frecuencia"
                  ayuda="Cada cuántas piezas se solicita control de calidad."
                  nombre="alerta_cada"
                  valor={config.alerta_cada}
                  onChange={handleChange}
                  sufijo="piezas"
                />
              )}

              <div style={estilos.resumenCalidad}>
                {Number(config.alerta_cada) === -1
                  ? "Se revisará la primera y la última pieza de cada caja."
                  : `Se solicitará una revisión cada ${config.alerta_cada} piezas.`}
              </div>
            </div>
          </SeccionConfiguracion>

          <section style={estilos.sincronizacion}>
            <div>
              <p style={estilos.sincronizacionEtiqueta}>REGLA GLOBAL</p>

              <h3 style={estilos.importacionTitulo}>
                Sincronización con SILENA
              </h3>

              <p style={estilos.importacionTexto}>
                Este interruptor afecta a toda la instalación, no al modelo
                seleccionado. Se aplica al instante.
              </p>
            </div>

            <div style={estilos.interruptores}>
              <Interruptor
                titulo="Enviar cajas a SILENA"
                ayuda="Genera el fichero de cada caja cerrada en el NAS. Mientras esté activo no se puede modificar ni borrar ninguna caja: de eso se encarga SILENA."
                activo={flags.sync_activo}
                colorActivo={estilos.interruptorRailActivo}
                deshabilitado={Boolean(guardandoFlag)}
                onToggle={() => cambiarFlag("sync_activo", !flags.sync_activo)}
              />
            </div>

            <div style={estilos.sincronizacionResumen}>
              {flags.sync_activo
                ? "Las cajas se envían solas al cerrarse y no se pueden modificar ni borrar desde aquí. Pausa el envío para corregir una caja que todavía no haya salido."
                : "Envío en pausa: las cajas se acumulan y saldrán solas al reanudar. Se pueden corregir las que aún no se hayan enviado; las ya enviadas se gestionan desde SILENA."}
            </div>
          </section>

          <section style={estilos.importacionDefectuosos}>
            <div style={estilos.importacionCabecera}>
              <div>
                <p style={estilos.importacionEtiqueta}>REGLA GLOBAL</p>

                <h3 style={estilos.importacionTitulo}>Listas de bloqueo</h3>

                <p style={estilos.importacionTexto}>
                  Estas listas se comparten entre MODELO1 y MODELO2. Un DMC solo
                  puede estar en una de las dos: si está marcado como
                  defectuoso, únicamente entrará en una caja DEFECTUOSA; si está
                  marcado como cobre, únicamente en una caja COBRE.
                </p>
              </div>
            </div>

            <div style={estilos.formatoCsvGrid}>
              <div style={estilos.formatoEjemplo}>
                <span style={estilos.formatoTitulo}>
                  Estructura obligatoria
                </span>

                <pre style={estilos.formatoCodigo}>
                  {`DMC
<primer DMC exacto>
<segundo DMC exacto>`}
                </pre>
              </div>

              <div style={estilos.formatoReglas}>
                <span style={estilos.formatoTitulo}>Formato del archivo</span>

                <ul style={estilos.formatoLista}>
                  <li>
                    Sube un archivo <strong>.csv</strong> o{" "}
                    <strong>.xlsx</strong>.
                  </li>
                  <li>
                    La primera fila debe contener la columna{" "}
                    <strong>DMC</strong>, escrita exactamente así y en
                    mayúsculas.
                  </li>
                  <li>
                    Debe haber un DMC por fila. Puede usar separador{" "}
                    <strong>;</strong> o <strong>,</strong>.
                  </li>
                  <li>Las columnas adicionales se ignoran.</li>
                  <li>
                    Filas vacías y DMC duplicados no se importan dos veces.
                  </li>
                  <li>Los ceros iniciales se conservan.</li>
                </ul>

                <div style={estilos.formatoAviso}>
                  <strong>Importante:</strong> el sistema guarda el DMC como
                  texto y lo compara con el escaneado. Sube siempre el código
                  exacto, sin espacios añadidos ni valores modificados.
                </div>
              </div>
            </div>

            <div style={estilos.importacionAcciones}>
              <label style={estilos.importacionCampoLista}>
                <span style={estilos.campoEtiqueta}>Lista de destino</span>

                <select
                  value={motivoImport}
                  onChange={(event) => setMotivoImport(event.target.value)}
                  style={estilos.select}
                >
                  {LISTAS_BLOQUEO.map((item) => (
                    <option key={item.motivo} value={item.motivo}>
                      {item.etiqueta}
                    </option>
                  ))}
                </select>

                <span style={estilos.ayuda}>
                  Los DMC importados solo podrán entrar en cajas de tipo{" "}
                  {listaSeleccionada.cajaDestino}.
                </span>
              </label>

              <div style={estilos.importacionReclasificar}>
                <span style={estilos.interruptorAyuda}>
                  <strong>Los DMC que ya estén en la otra lista se
                  reclasifican siempre.</strong> Se añadirán los DMC nuevos a
                  la lista seleccionada y los que estén marcados con el otro
                  motivo cambiarán de lista de forma definitiva.
                </span>
              </div>

              <input
                ref={inputArchivoRef}
                type="file"
                accept=".csv,.xlsx,text/csv"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />

              <button
                type="button"
                onClick={() => inputArchivoRef.current?.click()}
                style={estilos.botonPeligroGrande}
              >
                Importar {listaSeleccionada.etiqueta}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};
