-- ============================================================================
-- RECLASIFICACION A MOTIVO 'COBRE' + ALTA DE LOS QUE NO ESTABAN
-- ============================================================================
-- Requiere la migracion 001 aplicada.
-- Ejecutar solo tras validar la salida de 002a.
--
-- Hace DOS cosas:
--   1. Los DMC del CSV que YA estaban en la lista -> pasan a COBRE.
--   2. Los que NO estaban -> se dan de alta directamente como COBRE.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE tmp_cobre (dmc TEXT PRIMARY KEY) ON COMMIT DROP;
COPY tmp_cobre (dmc) FROM '/tmp/cobre.csv' WITH (FORMAT csv, HEADER true);

UPDATE tmp_cobre SET dmc = btrim(dmc, E' \t\r\n');
DELETE FROM tmp_cobre WHERE dmc = '' OR dmc IS NULL;

-- Red de seguridad: si el CSV no es el validado en 002a, aborta sin tocar nada.
DO $$
DECLARE n INT;
BEGIN
    SELECT COUNT(*) INTO n FROM tmp_cobre;
    IF n <> 28893 THEN
        RAISE EXCEPTION 'Abortado: el CSV trae % codigos, se esperaban 28893.', n;
    END IF;
END $$;

-- Total de partida, para poder comprobar el crecimiento al final.
\echo '=== Total ANTES ==='
SELECT COUNT(*) AS total_antes FROM dmc_defectuosos;

-- 1. ALTA de los que no estaban en la lista.
--    Van directamente como COBRE: el CSV es la fuente de verdad de que lo son.
--    fecha_importacion se rellena sola con el default de la tabla.
--    ON CONFLICT por si acaso; con el LEFT JOIN no deberia dispararse nunca.
INSERT INTO dmc_defectuosos (dmc_code, motivo)
SELECT t.dmc, 'COBRE'
FROM tmp_cobre t
LEFT JOIN dmc_defectuosos d ON d.dmc_code = t.dmc
WHERE d.dmc_code IS NULL
ON CONFLICT (dmc_code) DO NOTHING;

-- 2. RECLASIFICACION de los que ya estaban.
--    Va DESPUES del INSERT a proposito: los recien insertados ya nacen como
--    COBRE, asi que el AND motivo <> 'COBRE' los descarta y no se tocan dos
--    veces. El orden inverso daria el mismo resultado, pero asi la intencion
--    de cada sentencia queda separada y limpia.
UPDATE dmc_defectuosos d
SET motivo = 'COBRE'
FROM tmp_cobre t
WHERE d.dmc_code = t.dmc
  AND d.motivo <> 'COBRE';

-- 3. Sube la version: las PDAs descartan su copia local.
--    Sin filtro de modelo -> las dos filas se mueven juntas.
UPDATE configuraciones
SET valor = (valor::int + 1)::text
WHERE clave = 'blacklist_version';

-- ---------------------------------------------------------------------------
-- VERIFICACION
-- ---------------------------------------------------------------------------

-- Los COBRE deben ser EXACTAMENTE 28893: ni uno mas ni uno menos.
-- Si no cuadra, algo se ha quedado por el camino.
DO $$
DECLARE n INT;
BEGIN
    SELECT COUNT(*) INTO n FROM dmc_defectuosos WHERE motivo = 'COBRE';
    IF n <> 28893 THEN
        RAISE EXCEPTION 'Abortado: han quedado % COBRE, se esperaban 28893.', n;
    END IF;
END $$;

\echo '=== Reparto final ==='
SELECT motivo, COUNT(*) FROM dmc_defectuosos GROUP BY motivo;

\echo '=== Total DESPUES (debe ser total_antes + CONTROL 3) ==='
SELECT COUNT(*) AS total_despues FROM dmc_defectuosos;

\echo '=== Version de blacklist ==='
SELECT modelo, valor FROM configuraciones WHERE clave = 'blacklist_version';

COMMIT;