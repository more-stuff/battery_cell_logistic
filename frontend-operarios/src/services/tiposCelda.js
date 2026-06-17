export const TIPOS_CELDA = {
  CELDA: "CELDA",
};

export const TIPOS_CELDA_UI = {
  [TIPOS_CELDA.CELDA]: {
    label: "CELDA",
  },
};

export const getTipoCeldaUI = (tipoCelda) => {
  return TIPOS_CELDA_UI[tipoCelda] || TIPOS_CELDA_UI[TIPOS_CELDA.CELDA];
};
