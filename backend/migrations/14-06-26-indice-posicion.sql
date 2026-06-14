CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ux_celdas_caja_posicion
ON celdas (caja_reempaque_id, posicion_en_caja)
WHERE caja_reempaque_id IS NOT NULL
  AND posicion_en_caja IS NOT NULL;