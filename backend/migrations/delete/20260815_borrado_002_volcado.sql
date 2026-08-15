-- ============================================================================
-- VOLCADO DE CONSTANCIA ANTES DEL BORRADO
-- ============================================================================
-- SOLO LECTURA. Deja dos ficheros en /tmp del contenedor con todo lo que se
-- va a borrar. Se sacan del contenedor con docker cp y se archivan.
--
-- No es opcional: se esta borrando trazabilidad de material que YA viajo a
-- SILENA. Si manana alguien pregunta que habia en una de estas cajas, hay que
-- poder responder.
-- ============================================================================

BEGIN;

CREATE TEMP TABLE tmp_borrar (id_temporal TEXT PRIMARY KEY);

COPY tmp_borrar (id_temporal) FROM '/tmp/cajas_a_borrar.csv'
    WITH (FORMAT csv, HEADER true);

UPDATE tmp_borrar SET id_temporal = btrim(id_temporal, E' \t\r\n');
DELETE FROM tmp_borrar WHERE id_temporal = '' OR id_temporal IS NULL;

-- Cabecera de cada caja.
COPY (
    SELECT
        c.id_temporal,
        c.usuario_id,
        c.modelo,
        c.tipo_caja,
        c.blackbox_id,
        c.fecha_inicio_reempaque,
        c.fecha_fin_reempaque,
        c.fecha_caducidad_caja,
        c.ubicacion_estanteria,
        c.fecha_almacenamiento,
        c.hu_silena_outbound,
        c.numero_salida_delivery,
        c.fecha_envio,
        c.handling_unit,
        c.estado_sync,
        c.sync_exportado_at
    FROM cajas_reempaque c
    JOIN tmp_borrar t ON t.id_temporal = c.id_temporal
    ORDER BY c.id_temporal
) TO '/tmp/backup_cajas_borradas.csv' WITH (FORMAT csv, HEADER true);

-- Detalle celda a celda.
COPY (
    SELECT
        c.id_temporal,
        ce.dmc_code,
        ce.hu_origen_id,
        ce.fecha_caducidad,
        ce.estado_calidad,
        ce.posicion_en_caja,
        ce.voltaje_medido
    FROM celdas ce
    JOIN cajas_reempaque c ON c.id = ce.caja_reempaque_id
    JOIN tmp_borrar t      ON t.id_temporal = c.id_temporal
    ORDER BY c.id_temporal, ce.posicion_en_caja
) TO '/tmp/backup_celdas_borradas.csv' WITH (FORMAT csv, HEADER true);

\echo '=== Volcado terminado. Comprobar los dos ficheros en /tmp ==='

ROLLBACK;
