import { useEffect, useRef, useState } from "react";
import { obtenerPuestos } from "../services/api";
import { TIPOS_CAJA } from "../services/validarCeldaPorTipoCaja";
import { TIPO_CAJA_UI } from "../services/tipoCajaUI";
import { MODELO_POR_DEFECTO, MODELOS, MODELOS_UI } from "../services/modelos";

import { getLoginUI, getLoginStyles } from "../styles/Login.styles";

export default function Login({
  usuario,
  setUsuario,
  onLogin,
  tipoCaja = TIPOS_CAJA.NORMAL,
  setTipoCaja,
  modelo = "",
  setModelo,
  puesto,
  setPuesto,

  // Compatibilidad temporal con pantallas antiguas.
  // Cuando todas usen tipoCaja, se puede borrar.
  esDefectuoso = false,
}) {
  const [isHover, setIsHover] = useState(false);
  const [puestos, setPuestos] = useState([]);
  const [avisoDesactualizado, setAvisoDesactualizado] = useState(false);
  const [cargandoPuestos, setCargandoPuestos] = useState(true);
  const [puestoAbierto, setPuestoAbierto] = useState(false);
  const puestoRef = useRef(null);

  const tipoCajaFinal = esDefectuoso ? TIPOS_CAJA.DEFECTUOSA : tipoCaja;
  const tema = getLoginUI(tipoCajaFinal);
  const tieneModoEspecial = tipoCajaFinal !== TIPOS_CAJA.NORMAL;

  const styles = getLoginStyles({
    tema,
    tieneModoEspecial,
    isHover,
  });

  const puedeIniciar =
    usuario.trim().length > 0 && Boolean(modelo) && Boolean(puesto);

  useEffect(() => {
    let activo = true;
    obtenerPuestos()
      .then((data) => {
        if (!activo) return;
        setPuestos(data.puestos);
        setAvisoDesactualizado(!data.actualizado); // ZEO no respondió
      })
      .catch((err) => {
        console.error("No se pudieron cargar los puestos:", err);
      })
      .finally(() => {
        if (activo) setCargandoPuestos(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  // Cerrar el desplegable de puestos al clicar fuera o pulsar Escape.
  useEffect(() => {
    if (!puestoAbierto) return;

    const alClicarFuera = (e) => {
      if (!puestoRef.current?.contains(e.target)) setPuestoAbierto(false);
    };
    const alPulsarTecla = (e) => {
      if (e.key === "Escape") setPuestoAbierto(false);
    };

    document.addEventListener("mousedown", alClicarFuera);
    document.addEventListener("keydown", alPulsarTecla);
    return () => {
      document.removeEventListener("mousedown", alClicarFuera);
      document.removeEventListener("keydown", alPulsarTecla);
    };
  }, [puestoAbierto]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!puedeIniciar) return;

    onLogin();
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.backgroundPattern}></div>

      <div style={styles.box}>
        <div style={styles.icono}>{tema.icono}</div>

        <h2 style={styles.title}>{tema.titulo}</h2>

        <p style={styles.subtitle}>{tema.subtitulo}</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.selectorGroup}>
            <label style={styles.label}>Modelo de celda</label>

            <select
              value={modelo}
              onChange={(e) => setModelo?.(e.target.value)}
              style={styles.select}
              required
            >
              <option value="" disabled>
                Selecciona el modelo…
              </option>

              {Object.values(MODELOS).map((modeloItem) => (
                <option key={modeloItem} value={modeloItem}>
                  {MODELOS_UI[modeloItem]?.label ?? modeloItem}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.selectorGroup}>
            <label style={styles.label}>Puesto</label>

            <div style={styles.puestoWrapper} ref={puestoRef}>
              <button
                type="button"
                onClick={() => setPuestoAbierto((abierto) => !abierto)}
                style={styles.puestoTrigger(puestoAbierto, Boolean(puesto))}
                disabled={cargandoPuestos}
                aria-haspopup="listbox"
                aria-expanded={puestoAbierto}
              >
                <span>
                  {cargandoPuestos
                    ? "Cargando puestos…"
                    : (puesto?.nombre ?? "Selecciona tu puesto…")}
                </span>
                <span style={styles.puestoFlecha(puestoAbierto)}>▼</span>
              </button>

              {puestoAbierto && (
                <div style={styles.puestoPanel} role="listbox">
                  {puestos.length === 0 ? (
                    <p style={styles.puestoMensaje}>
                      No hay puestos disponibles.
                    </p>
                  ) : (
                    <div style={styles.puestoGrid}>
                      {puestos.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          role="option"
                          aria-selected={puesto?.id === p.id}
                          onClick={() => {
                            setPuesto(p);
                            setPuestoAbierto(false);
                          }}
                          style={styles.puestoBoton(puesto?.id === p.id)}
                        >
                          {p.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {avisoDesactualizado && (
              <p
                style={{
                  color: "#e67e22",
                  fontSize: "0.85rem",
                  marginTop: "6px",
                }}
              >
                ⚠️ No se pudo conectar con ZEO. La lista de puestos puede estar
                desactualizada.
              </p>
            )}
          </div>

          <div style={styles.selectorGroup}>
            <label style={styles.label}>Tipo de caja</label>

            <select
              value={tipoCajaFinal}
              onChange={(e) => setTipoCaja?.(e.target.value)}
              style={styles.select}
              disabled={!setTipoCaja}
            >
              {Object.values(TIPOS_CAJA).map((tipo) => (
                <option key={tipo} value={tipo}>
                  {TIPO_CAJA_UI[tipo]?.label ?? tipo}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            placeholder={tema.placeholder}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            style={styles.input}
            autoFocus
            onFocus={(e) =>
              (e.target.style.borderColor = tema.inputFocusBorder)
            }
            onBlur={(e) => (e.target.style.borderColor = "#e1e8ed")}
          />

          <button
            type="submit"
            style={styles.button}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
          >
            {tema.botonTexto}
          </button>
        </form>
      </div>

      {tema.avisoInferior && (
        <div style={styles.avisoInferior}>{tema.avisoInferior}</div>
      )}
    </div>
  );
}
