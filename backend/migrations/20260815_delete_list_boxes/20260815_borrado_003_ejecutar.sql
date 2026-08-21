-- ============================================================================
-- BORRADO DE CAJAS BLOQUEADAS POR SILENA
-- ============================================================================
-- ESCRIBE Y ES IRREVERSIBLE. Ejecutar solo despues de:
--   1. Validar la salida de 001_control.sql
--   2. Haber sacado del contenedor los ficheros de 002_volcado.sql
--   3. Haber PAUSADO la sincronizacion (sync_activo = 0) desde el panel
--   4. Confirmacion del cliente de que SILENA las ha dado de baja por su lado
--
-- Se salta a proposito verificar_caja_editable: estas cajas estan EXPORTADO y
-- el endpoint DELETE las rechaza por diseno. Es una excepcion controlada en
-- ventana de mantenimiento, no un camino normal.
--
-- Las celdas se borran EXPLICITAMENTE antes que las cajas: el cascade
-- "all, delete-orphan" es de SQLAlchemy, no de la base de datos, y la FK
-- celdas.caja_reempaque_id no tiene ON DELETE CASCADE.
--
-- El borrado debe ser COMPLETO: celdas.dmc_code es UNIQUE global, asi que si
-- alguna celda sobrevive, el reescaneo fallara con un 409 de duplicados.
--
-- Los identificadores del fichero que NO existan en la base de datos se SALTAN
-- a proposito: no abortan el borrado. Pueden venir de una pasada anterior ya
-- ejecutada o de un fallo del listado del cliente. Se listan antes de borrar
-- para que quede constancia de cuales fueron.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE tmp_borrar (id_temporal TEXT PRIMARY KEY) ON COMMIT DROP;

COPY tmp_borrar (id_temporal) FROM '/tmp/cajas_a_borrar.csv'
    WITH (FORMAT csv, HEADER true);

UPDATE tmp_borrar SET id_temporal = btrim(id_temporal, E' \t\r\n');
DELETE FROM tmp_borrar WHERE id_temporal = '' OR id_temporal IS NULL;

-- Red de seguridad 1: que el fichero sea el validado en 001.
DO $$
DECLARE n INT;
BEGIN
    SELECT COUNT(*) INTO n FROM tmp_borrar;
    IF n <> 112 THEN
        RAISE EXCEPTION
            'Abortado: el fichero trae % identificadores, se esperaban 112.', n;
    END IF;
END $$;

-- Red de seguridad 2: la sincronizacion tiene que estar en pausa.
-- Con el worker vivo podria estar exportando una de estas cajas ahora mismo.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM configuraciones
        WHERE clave = 'sync_activo'
          AND lower(btrim(valor)) IN ('1', 'true', 'on', 'si')
    ) THEN
        RAISE EXCEPTION
            'Abortado: la sincronizacion con SILENA esta ACTIVA. Pausala antes de borrar.';
    END IF;
END $$;

-- Bloqueo de las filas antes de tocarlas, por si el worker sigue vivo pese al
-- flag. Si esta exportando una, aqui se espera a que termine.
SELECT c.id
FROM cajas_reempaque c
JOIN tmp_borrar t ON t.id_temporal = c.id_temporal
FOR UPDATE;

-- Las que no esten en la base de datos se saltan. No es un error, pero tiene
-- que verse: si aqui sale algo que esperabas borrar, el listado esta mal.
\echo '=== SALTADAS: en el fichero pero NO en la base de datos ==='
SELECT t.id_temporal
FROM tmp_borrar t
LEFT JOIN cajas_reempaque c ON c.id_temporal = t.id_temporal
WHERE c.id_temporal IS NULL
ORDER BY t.id_temporal;

\echo '=== ANTES: fichero, cajas encontradas, saltadas y celdas afectadas ==='
SELECT
    (SELECT COUNT(*) FROM tmp_borrar) AS en_fichero,
    (SELECT COUNT(*) FROM cajas_reempaque c
       JOIN tmp_borrar t ON t.id_temporal = c.id_temporal) AS cajas,
    (SELECT COUNT(*) FROM tmp_borrar t
       LEFT JOIN cajas_reempaque c ON c.id_temporal = t.id_temporal
      WHERE c.id_temporal IS NULL) AS saltadas,
    (SELECT COUNT(*) FROM celdas ce
       JOIN cajas_reempaque c ON c.id = ce.caja_reempaque_id
       JOIN tmp_borrar t      ON t.id_temporal = c.id_temporal) AS celdas;

-- 1. CELDAS primero (la FK no tiene ON DELETE CASCADE).
DELETE FROM celdas ce
USING cajas_reempaque c, tmp_borrar t
WHERE ce.caja_reempaque_id = c.id
  AND c.id_temporal = t.id_temporal;

-- 2. CAJAS despues.
DELETE FROM cajas_reempaque c
USING tmp_borrar t
WHERE c.id_temporal = t.id_temporal;

-- Verificacion: no puede quedar NADA. Si queda una sola celda, el reescaneo
-- de esa caja fallara por el UNIQUE de dmc_code.
DO $$
DECLARE cajas_restantes INT; celdas_restantes INT;
BEGIN
    SELECT COUNT(*) INTO cajas_restantes
    FROM cajas_reempaque c JOIN tmp_borrar t ON t.id_temporal = c.id_temporal;

    SELECT COUNT(*) INTO celdas_restantes
    FROM celdas ce
    JOIN cajas_reempaque c ON c.id = ce.caja_reempaque_id
    JOIN tmp_borrar t      ON t.id_temporal = c.id_temporal;

    IF cajas_restantes <> 0 OR celdas_restantes <> 0 THEN
        RAISE EXCEPTION
            'Abortado: quedan % cajas y % celdas sin borrar.',
            cajas_restantes, celdas_restantes;
    END IF;
END $$;

\echo '=== DESPUES: debe salir 0 y 0 ==='
SELECT
    (SELECT COUNT(*) FROM cajas_reempaque c
       JOIN tmp_borrar t ON t.id_temporal = c.id_temporal) AS cajas,
    (SELECT COUNT(*) FROM celdas ce
       JOIN cajas_reempaque c ON c.id = ce.caja_reempaque_id
       JOIN tmp_borrar t      ON t.id_temporal = c.id_temporal) AS celdas;

COMMIT;
