import { useCallback, useEffect, useRef, useState } from "react";
import { estilos } from "../styles/AdminConfig.styles";

import Swal from "sweetalert2";
import {
  obtenerConfiguracion,
  guardarConfiguracion,
  importarDefectuosos,
} from "../services/api";

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
  tamano_nivel: "45",
};

const CLAVES_CAPACIDAD = [
  "limite_caja",
  "limite_defectuosa",
  "limite_caducidad_proxima",
  "tamano_nivel",
];

const CLAVES_LECTURA = ["len_dmc", "caducidad_proxima_dias"];
const CLAVES_CALIDAD = ["alerta_cada"];

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

export const AdminConfig = () => {
  const [modelo, setModelo] = useState("MODELO1");
  const [config, setConfig] = useState(CONFIG_INICIAL);
  const [loading, setLoading] = useState(true);
  const [guardandoBloque, setGuardandoBloque] = useState(null);
  const [ultimoIntervaloCalidad, setUltimoIntervaloCalidad] = useState("15");

  const [fechaCaducidadProxima, setFechaCaducidadProxima] = useState(() =>
    fechaInputDesdeDias(CONFIG_INICIAL.caducidad_proxima_dias),
  );

  const inputArchivoRef = useRef(null);

  const cargarDatos = useCallback(async (modeloSeleccionado) => {
    setLoading(true);

    try {
      const datos = await obtenerConfiguracion(modeloSeleccionado);
      const configuracionNormalizada = convertirConfiguracion(datos);

      setConfig(configuracionNormalizada);
      setFechaCaducidadProxima(
        fechaInputDesdeDias(configuracionNormalizada.caducidad_proxima_dias),
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

  const handleFileUpload = async (event) => {
    const archivo = event.target.files?.[0];

    if (!archivo) return;

    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "¿Importar DMC defectuosos?",
      text: `Se procesará "${archivo.name}". Debe ser un CSV con una columna llamada exactamente DMC.`,
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
        text: "Comprobando DMC y evitando duplicados.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const respuesta = await importarDefectuosos(archivo);

      const totalArchivo = Number(respuesta.total_archivo ?? 0);
      const nuevosInsertados = Number(respuesta.nuevos_insertados ?? 0);
      const yaExistian = Number(respuesta.ya_existian ?? 0);

      Swal.fire({
        icon: "success",
        title: "Importación completada",
        html: `
        <p>El archivo se ha procesado correctamente.</p>
        <p><strong>DMC únicos en el archivo:</strong> ${totalArchivo}</p>
        <p><strong>Nuevos importados:</strong> ${nuevosInsertados}</p>
        <p><strong>Ya existentes:</strong> ${yaExistian}</p>
      `,
      });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "No se ha podido importar el archivo",
        text: "Debe ser un CSV válido, con separador ; o , y una columna llamada exactamente DMC.",
      });
    } finally {
      event.target.value = "";
    }
  };

  const modeloActivo = MODELOS.find((item) => item.codigo === modelo);
  const fechaMinimaCaducidad = fechaInputDesdeDias(1);
  const bloqueGuardando = (nombreBloque) => guardandoBloque === nombreBloque;

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
                etiqueta="Caja defectuosa"
                ayuda="Máximo de piezas en una caja de defectuosas."
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
            <div style={estilos.gridDos}>
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
                  Selecciona hasta qué fecha una celda debe considerarse de
                  caducidad próxima. Al guardar se convierte automáticamente en
                  el intervalo interno del sistema.
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

          <section style={estilos.importacionDefectuosos}>
            <div style={estilos.importacionCabecera}>
              <div>
                <p style={estilos.importacionEtiqueta}>REGLA GLOBAL</p>

                <h3 style={estilos.importacionTitulo}>
                  Lista de DMC defectuosos
                </h3>

                <p style={estilos.importacionTexto}>
                  Esta lista se comparte entre MODELO1 y MODELO2. Un DMC
                  incluido aquí solo podrá introducirse en una caja DEFECTUOSA.
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
                    Sube un archivo <strong>.csv</strong>.
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
              <span style={estilos.importacionAyuda}>
                Solo se añadirán los DMC nuevos. Los que ya existan en la lista
                permanecerán sin cambios.
              </span>

              <input
                ref={inputArchivoRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />

              <button
                type="button"
                onClick={() => inputArchivoRef.current?.click()}
                style={estilos.botonPeligro}
              >
                Importar CSV de defectuosos
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};
