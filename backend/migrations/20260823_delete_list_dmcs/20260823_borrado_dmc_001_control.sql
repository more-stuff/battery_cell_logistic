-- ============================================================================
-- CONTROL PREVIO AL BORRADO DE DMC SUELTOS
-- ============================================================================
-- SOLO LECTURA. Termina en ROLLBACK: se puede ejecutar las veces que haga
-- falta sin tocar nada.
--
-- Esto NO es el borrado de cajas de 20260815_delete_list_boxes. Alli se
-- quitaba la caja entera. Aqui se quitan CELDAS sueltas por su DMC y las
-- cajas se quedan donde estan, aunque pierdan piezas. Es la version en lote
-- del endpoint POST /admin/liberar-celda: soltar un DMC atrapado para que se
-- pueda volver a escanear, porque celdas.dmc_code es UNIQUE global y mientras
-- la fila fantasma exista el cierre de la caja buena responde 409.
--
-- Preparacion, desde la raiz del proyecto:
--   docker cp dmcs_a_borrar.csv battery_cell_logistic-db-1:/tmp/dmcs_a_borrar.csv
--
-- El CSV ya viene hecho en el repositorio. No hay que generarlo ni hace falta
-- Python en el servidor: aqui solo se necesita psql.
--
-- DE DONDE SALE dmcs_a_borrar.csv
-- El cliente mando cuatro xlsx (BL SILENA, CADUCADAS BLOQUEADAS SILENA,
-- VALIDAS y caducadas bloqueadas 2.0), con una hoja por caja: la etiqueta del
-- contenedor y debajo los DMC. Se unieron los cuatro en este CSV de una sola
-- columna y los xlsx se tiraron, porque el CSV es la unica forma que sabe leer
-- COPY y no tiene sentido arrastrar los originales.
--
-- Al unirlos:
--   * 7164 filas no vacias en total.
--   *   41 eran etiquetas de contenedor (27BUN..., TMP-... y un BID...) y se
--       descartaron. No se filtro por posicion sino por formato (87 caracteres
--       empezando por '#0Z'), porque las hojas 2598 y 4197 de BL SILENA no
--       traen etiqueta y las 3557 y 5224 la traen ademas en mitad de la hoja.
--   * 7123 eran DMC, de los cuales 9 venian repetidos (8 en la hoja 3933 y 1
--       en la 0449). El CSV los trae una sola vez.
--   * 7114 DMC unicos, que es el numero que valida el 002.
--
-- Si algun dia hay que rehacer el listado, los xlsx los tiene el cliente: se
-- vuelven a unir con el mismo criterio y se actualiza el 7114 del 002.
--
-- El control que de verdad importa aqui es el 5. Como la caja sobrevive al
-- borrado, una caja que NO este en EXPORTADO se acabaria mandando a SILENA
-- incompleta y sin un solo aviso: el generador no valida el recuento, recorre
-- las celdas que encuentre. Si el 5 devuelve filas, no se ejecuta el 002.
-- ============================================================================

BEGIN;

CREATE TEMP TABLE tmp_borrar (dmc_code TEXT PRIMARY KEY);

COPY tmp_borrar (dmc_code) FROM '/tmp/dmcs_a_borrar.csv'
    WITH (FORMAT csv, HEADER true);

-- Solo se quitan retornos de carro. NADA de btrim de espacios: el DMC crudo
-- lleva espacios dentro y los hay que acaban en espacio antes del '*'. Se
-- guarda en la base de datos tal cual lo escanea el operario, asi que
-- recortarlo aqui haria que el JOIN no encontrase nada.
UPDATE tmp_borrar SET dmc_code = btrim(dmc_code, E'\r\n');
DELETE FROM tmp_borrar WHERE dmc_code = '' OR dmc_code IS NULL;

\echo '=== CONTROL 1: DMC en el fichero (esperado 7114) ==='
SELECT COUNT(*) AS en_fichero FROM tmp_borrar;

-- Un DMC valido mide 87 (len_dmc en usePaquete.js). Si aqui sale algo, el
-- CSV trae basura y el recuento del 002 va a fallar de todas formas.
\echo '=== CONTROL 2: DMC con longitud rara (esperado 0 filas) ==='
SELECT dmc_code, length(dmc_code) AS longitud
FROM tmp_borrar
WHERE length(dmc_code) <> 87
ORDER BY dmc_code;

-- Las que salgan aqui la 002 se las salta: no abortan el borrado. Revisar la
-- lista igualmente. Un DMC que no esta es un DMC que ya estaba libre, o que
-- nunca se escaneo, o un error del listado del cliente.
\echo '=== CONTROL 3: NO EXISTEN en celdas (la 002 los saltara) ==='
SELECT COUNT(*) AS no_existen
FROM tmp_borrar t
LEFT JOIN celdas ce ON ce.dmc_code = t.dmc_code
WHERE ce.dmc_code IS NULL;

\echo '=== CONTROL 4: cajas afectadas, que pierden y que les queda ==='
SELECT
    c.id_temporal,
    c.tipo_caja,
    c.estado_sync,
    COUNT(*) FILTER (WHERE t.dmc_code IS NOT NULL) AS celdas_a_borrar,
    COUNT(*) FILTER (WHERE t.dmc_code IS NULL)     AS celdas_que_quedan
FROM celdas ce
JOIN cajas_reempaque c ON c.id = ce.caja_reempaque_id
LEFT JOIN tmp_borrar t ON t.dmc_code = ce.dmc_code
GROUP BY c.id_temporal, c.tipo_caja, c.estado_sync
HAVING COUNT(*) FILTER (WHERE t.dmc_code IS NOT NULL) > 0
ORDER BY celdas_que_quedan, c.id_temporal;

-- EL CONTROL QUE PARA LA OPERACION.
-- La caja sobrevive al borrado, asi que si no esta EXPORTADO todavia tiene que
-- pasar por el generador, y pasaria con menos de 180 lineas. Sobre EXPORTADO
-- no hay riesgo: es un estado terminal, el worker solo mira las PENDIENTE y
-- nada devuelve una caja exportada a la cola.
-- Si sale alguna fila: o se saca ese DMC del listado, o se borra esa caja
-- entera con el procedimiento de 20260815_delete_list_boxes. El 002 aborta.
\echo '=== CONTROL 5: cajas afectadas que NO estan EXPORTADO (debe salir 0 filas) ==='
SELECT DISTINCT c.id_temporal, c.estado_sync, c.tipo_caja
FROM celdas ce
JOIN cajas_reempaque c ON c.id = ce.caja_reempaque_id
JOIN tmp_borrar t      ON t.dmc_code = ce.dmc_code
WHERE c.estado_sync IS DISTINCT FROM 'EXPORTADO'
ORDER BY c.estado_sync, c.id_temporal;

-- Una caja que se queda a 0 celdas es un cascaron: sigue contando en los
-- listados y en las consultas, pero ya no tiene contenido. No es un error y
-- el 002 no la toca, pero conviene saber cuales son para darlas de baja
-- despues si el cliente lo pide.
\echo '=== CONTROL 6: cajas que se quedan VACIAS ==='
SELECT
    c.id_temporal,
    c.tipo_caja,
    c.estado_sync,
    c.hu_silena_outbound,
    c.fecha_envio
FROM celdas ce
JOIN cajas_reempaque c ON c.id = ce.caja_reempaque_id
LEFT JOIN tmp_borrar t ON t.dmc_code = ce.dmc_code
GROUP BY c.id_temporal, c.tipo_caja, c.estado_sync,
         c.hu_silena_outbound, c.fecha_envio
HAVING COUNT(*) FILTER (WHERE t.dmc_code IS NULL) = 0
ORDER BY c.id_temporal;

-- Celdas sin caja (caja_reempaque_id es nullable). Se borran igual, pero si
-- hay muchas es que algo raro paso antes y conviene mirarlo.
\echo '=== CONTROL 7: celdas a borrar que no cuelgan de ninguna caja ==='
SELECT COUNT(*) AS celdas_huerfanas
FROM celdas ce
JOIN tmp_borrar t ON t.dmc_code = ce.dmc_code
WHERE ce.caja_reempaque_id IS NULL;

\echo '=== CONTROL 8: resumen de lo que se va a borrar ==='
SELECT
    (SELECT COUNT(*) FROM tmp_borrar) AS en_fichero,
    (SELECT COUNT(*) FROM celdas ce
       JOIN tmp_borrar t ON t.dmc_code = ce.dmc_code) AS celdas,
    (SELECT COUNT(*) FROM tmp_borrar t
       LEFT JOIN celdas ce ON ce.dmc_code = t.dmc_code
      WHERE ce.dmc_code IS NULL) AS saltados,
    (SELECT COUNT(DISTINCT ce.caja_reempaque_id) FROM celdas ce
       JOIN tmp_borrar t ON t.dmc_code = ce.dmc_code
      WHERE ce.caja_reempaque_id IS NOT NULL) AS cajas_tocadas;

\echo '=== CONTROL 9: interruptor de sincronizacion (debe estar a 0 al borrar) ==='
SELECT modelo, valor FROM configuraciones WHERE clave = 'sync_activo';

ROLLBACK;
