export const MODELOS = {
  MODELO1: "MODELO1",
  MODELO2: "MODELO2",
};

export const MODELO_POR_DEFECTO = MODELOS.MODELO1;

export const MODELOS_UI = {
  [MODELOS.MODELO1]: {
    label: "MODELO1",
  },

  [MODELOS.MODELO2]: {
    label: "MODELO2",
  },
};

export const getModeloUI = (modelo) => {
  return MODELOS_UI[modelo] || MODELOS_UI[MODELO_POR_DEFECTO];
};
