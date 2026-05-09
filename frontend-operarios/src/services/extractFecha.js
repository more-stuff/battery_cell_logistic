/**
 * extractFechaCaducidad
 *
 * Extrae la fecha de caducidad de los últimos 6 dígitos de un código DMC.
 * Formato esperado: DDMMYY  →  ej: "311225" → 31/12/2025 → "2025-12-31"
 *
 * @param {string} dmc  - Código DMC completo
 * @returns {{ ok: true, fecha: string } | { ok: false, error: string }}
 *
 * Uso:
 *   const result = extractFechaCaducidad(dmc);
 *   if (!result.ok) { mostrar error result.error }
 *   else { usar result.fecha }  // "YYYY-MM-DD"
 */
export function extractFechaCaducidad(dmc) {
  const rawDate = dmc.slice(-6); // Últimos 6 caracteres: DDMMYY

  const dia = parseInt(rawDate.substring(0, 2));
  const mes = parseInt(rawDate.substring(2, 4));
  const year = parseInt("20" + rawDate.substring(4, 6));

  // Validar que sea una fecha real (no mes 13, no día 32, etc.)
  const fechaObj = new Date(year, mes - 1, dia);
  const esValida =
    fechaObj.getFullYear() === year &&
    fechaObj.getMonth() === mes - 1 &&
    fechaObj.getDate() === dia;

  if (!esValida) {
    return {
      ok: false,
      error: `La fecha extraída (${dia}/${mes}/${year}) no es válida. Revisa el código DMC.`,
    };
  }

  const diaStr = String(dia).padStart(2, "0");
  const mesStr = String(mes).padStart(2, "0");

  return {
    ok: true,
    fecha: `${year}-${mesStr}-${diaStr}`, // YYYY-MM-DD
  };
}
