-- SOLO LECTURA. No modifica nada. Se puede ejecutar las veces que haga falta.
BEGIN;

CREATE TEMP TABLE tmp_cobre (dmc TEXT PRIMARY KEY);
COPY tmp_cobre (dmc) FROM '/tmp/cobre.csv' WITH (FORMAT csv, HEADER true);

UPDATE tmp_cobre SET dmc = btrim(dmc, E' \t\r\n');
DELETE FROM tmp_cobre WHERE dmc = '' OR dmc IS NULL;

\echo '=== CONTROL 1: codigos en el CSV (esperado 28893) ==='
SELECT COUNT(*) AS en_csv FROM tmp_cobre;

\echo '=== CONTROL 2: se marcaran como COBRE ==='
SELECT COUNT(*) AS se_marcaran
FROM tmp_cobre t JOIN dmc_defectuosos d ON d.dmc_code = t.dmc;

\echo '=== CONTROL 3: NO estan en la lista (si no es 0, decidir) ==='
SELECT COUNT(*) AS no_estan
FROM tmp_cobre t LEFT JOIN dmc_defectuosos d ON d.dmc_code = t.dmc
WHERE d.dmc_code IS NULL;

\echo '=== Muestra de los que no estan ==='
SELECT t.dmc, length(t.dmc) AS len
FROM tmp_cobre t LEFT JOIN dmc_defectuosos d ON d.dmc_code = t.dmc
WHERE d.dmc_code IS NULL LIMIT 10;

\echo '=== Reparto actual ==='
SELECT motivo, COUNT(*) FROM dmc_defectuosos GROUP BY motivo;

ROLLBACK;