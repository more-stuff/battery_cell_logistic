import { useState } from "react";
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

  // Compatibilidad temporal con pantallas antiguas.
  // Cuando todas usen tipoCaja, se puede borrar.
  esDefectuoso = false,
}) {
  const [isHover, setIsHover] = useState(false);

  const tipoCajaFinal = esDefectuoso ? TIPOS_CAJA.DEFECTUOSA : tipoCaja;
  const tema = getLoginUI(tipoCajaFinal);
  const tieneModoEspecial = tipoCajaFinal !== TIPOS_CAJA.NORMAL;

  const styles = getLoginStyles({
    tema,
    tieneModoEspecial,
    isHover,
  });

  const puedeIniciar = usuario.trim().length > 0 && Boolean(modelo);

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
