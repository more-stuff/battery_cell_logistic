BEGIN;

ALTER TABLE celdas
ADD COLUMN IF NOT EXISTS posicion_en_caja INTEGER;

WITH celdas_ordenadas AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY caja_reempaque_id
            ORDER BY id ASC
        ) - 1 AS posicion_calculada
    FROM celdas
    WHERE caja_reempaque_id IS NOT NULL
)
UPDATE celdas c
SET posicion_en_caja = co.posicion_calculada
FROM celdas_ordenadas co
WHERE c.id = co.id
  AND c.posicion_en_caja IS NULL;

ALTER TABLE celdas
ADD CONSTRAINT chk_celdas_posicion_en_caja_no_negativa
CHECK (posicion_en_caja IS NULL OR posicion_en_caja >= 0)
NOT VALID;

COMMIT;