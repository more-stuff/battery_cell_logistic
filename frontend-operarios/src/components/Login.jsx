import { useState } from "react";
import { TIPOS_CAJA } from "../services/validarCeldaPorTipoCaja";
import { getLoginUI, getLoginStyles } from "../styles/Login.styles";

export default function Login({
  usuario,
  setUsuario,
  onLogin,
  tipoCaja = TIPOS_CAJA.NORMAL,

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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (usuario.trim().length > 0) {
      onLogin();
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.backgroundPattern}></div>

      <div style={styles.box}>
        <div style={styles.icono}>{tema.icono}</div>

        <h2 style={styles.title}>{tema.titulo}</h2>

        <p style={styles.subtitle}>{tema.subtitulo}</p>

        <form onSubmit={handleSubmit}>
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
