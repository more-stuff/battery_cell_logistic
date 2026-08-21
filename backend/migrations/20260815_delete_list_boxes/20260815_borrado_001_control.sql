-- ============================================================================
-- CONTROL PREVIO AL BORRADO DE CAJAS BLOQUEADAS POR SILENA
-- ============================================================================
-- SOLO LECTURA. Termina en ROLLBACK: se puede ejecutar las veces que haga
-- falta sin tocar nada.
--
-- Requiere haber copiado el CSV al contenedor:
--   docker cp cajas_a_borrar.csv battery_cell_logistic-db-1:/tmp/cajas_a_borrar.csv
-- ============================================================================

BEGIN;

CREATE TEMP TABLE tmp_borrar (id_temporal TEXT PRIMARY KEY);

COPY tmp_borrar (id_temporal) FROM '/tmp/cajas_a_borrar.csv'
    WITH (FORMAT csv, HEADER true);

UPDATE tmp_borrar SET id_temporal = btrim(id_temporal, E' \t\r\n');
DELETE FROM tmp_borrar WHERE id_temporal = '' OR id_temporal IS NULL;

\echo '=== CONTROL 1: identificadores en el fichero (esperado 112) ==='
SELECT COUNT(*) AS en_fichero FROM tmp_borrar;

-- Las que salgan aqui la 003 se las salta: no abortan el borrado. Revisar la
-- lista igualmente, porque lo normal es que sea un error del listado.
\echo '=== CONTROL 2: NO EXISTEN en la base de datos (la 003 las saltara) ==='
SELECT t.id_temporal
FROM tmp_borrar t
LEFT JOIN cajas_reempaque c ON c.id_temporal = t.id_temporal
WHERE c.id_temporal IS NULL
ORDER BY t.id_temporal;

\echo '=== CONTROL 3: reparto por estado_sync y tipo de caja ==='
SELECT c.estado_sync, c.tipo_caja, COUNT(*) AS cajas
FROM cajas_reempaque c
JOIN tmp_borrar t ON t.id_temporal = c.id_temporal
GROUP BY c.estado_sync, c.tipo_caja
ORDER BY c.estado_sync, c.tipo_caja;

\echo '=== CONTROL 4: total de celdas que se van a borrar ==='
SELECT COUNT(*) AS celdas_totales
FROM celdas ce
JOIN cajas_reempaque c ON c.id = ce.caja_reempaque_id
JOIN tmp_borrar t      ON t.id_temporal = c.id_temporal;

\echo '=== CONTROL 5: cajas con recuento de celdas anomalo (deberian ser 180) ==='
SELECT c.id_temporal, c.tipo_caja, c.estado_sync, COUNT(ce.id) AS celdas
FROM cajas_reempaque c
JOIN tmp_borrar t       ON t.id_temporal = c.id_temporal
LEFT JOIN celdas ce     ON ce.caja_reempaque_id = c.id
GROUP BY c.id_temporal, c.tipo_caja, c.estado_sync
HAVING COUNT(ce.id) <> 180
ORDER BY COUNT(ce.id);

\echo '=== CONTROL 6: cajas ya expedidas (fecha_envio no nula) ==='
-- Si alguna sale aqui, el material ya salio de la planta. PARAR y consultar.
SELECT c.id_temporal, c.fecha_envio, c.hu_silena_outbound, c.numero_salida_delivery
FROM cajas_reempaque c
JOIN tmp_borrar t ON t.id_temporal = c.id_temporal
WHERE c.fecha_envio IS NOT NULL
ORDER BY c.fecha_envio;

\echo '=== CONTROL 7: interruptor de sincronizacion (debe estar a 0 al borrar) ==='
SELECT modelo, valor FROM configuraciones WHERE clave = 'sync_activo';

ROLLBACK;
