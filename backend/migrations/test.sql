SELECT COUNT(*) AS celdas_sin_posicion
FROM celdas
WHERE caja_reempaque_id IS NOT NULL
  AND posicion_en_caja IS NULL;