-- ============================================================================
-- BORRADO DE DMC SUELTOS
-- ============================================================================
-- ESCRIBE Y ES IRREVERSIBLE. No hay volcado de constancia: se borra la fila de
-- la celda y no queda copia de su contenido, igual que en el endpoint
-- /admin/liberar-celda. Lo que se conserva es el CSV de entrada, que dice QUE
-- DMC se solto; el resto (HU de origen, caducidad, voltaje, posicion) se
-- pierde. Si eso no vale, hay que hacer el volcado antes a mano.
--
-- Ejecutar solo despues de:
--   1. Validar la salida de 001_control.sql, en especial el CONTROL 5.
--   2. Haber PAUSADO la sincronizacion (sync_activo = 0) desde el panel.
--   3. Confirmacion del cliente de que SILENA ha dado de baja esas piezas.
--
-- Las cajas NO se tocan: pierden celdas y se quedan como esten, incluso a 0.
-- Es lo mismo que hace liberar_celda y por el mismo motivo: la divergencia con
-- SILENA (alli el CSV con 180 lineas, aqui 179) se arregla por el ERP, no por
-- este fichero.
--
-- Tampoco se recalcula cajas_reempaque.fecha_caducidad_caja. Es a proposito:
-- ese campo es la caducidad que se mando a SILENA en su dia, no un derivado
-- vivo de las celdas que queden ahora.
--
-- Los DMC del fichero que NO existan en celdas se SALTAN a proposito: no
-- abortan el borrado. Pueden venir de una pasada anterior ya ejecutada o de un
-- fallo del listado del cliente. Se cuentan antes de borrar para que quede
-- constancia.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE tmp_borrar (dmc_code TEXT PRIMARY KEY) ON COMMIT DROP;

COPY tmp_borrar (dmc_code) FROM '/tmp/dmcs_a_borrar.csv'
    WITH (FORMAT csv, HEADER true);

-- Igual que en el 001: solo retornos de carro, nunca los espacios del propio
-- codigo.
UPDATE tmp_borrar SET dmc_code = btrim(dmc_code, E'\r\n');
DELETE FROM tmp_borrar WHERE dmc_code = '' OR dmc_code IS NULL;

-- Red de seguridad 1: que el fichero sea el validado en 001.
-- Si se regenera el CSV con extraer_dmcs.py y cambia el numero, hay que
-- cambiarlo aqui a mano y volver a pasar el 001. Es justo lo que queremos:
-- que nadie ejecute esto contra un listado distinto del que se reviso.
DO $$
DECLARE n INT;
BEGIN
    SELECT COUNT(*) INTO n FROM tmp_borrar;
    IF n <> 7114 THEN
        RAISE EXCEPTION
            'Abortado: el fichero trae % DMC, se esperaban 7114.', n;
    END IF;
END $$;

-- Red de seguridad 2: ningun DMC malformado.
DO $$
DECLARE n INT;
BEGIN
    SELECT COUNT(*) INTO n FROM tmp_borrar WHERE length(dmc_code) <> 87;
    IF n > 0 THEN
        RAISE EXCEPTION
            'Abortado: % DMC del fichero no miden 87 caracteres.', n;
    END IF;
END $$;

-- Red de seguridad 3: la sincronizacion tiene que estar en pausa.
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

-- Red de seguridad 4: LA IMPORTANTE.
-- Solo se sueltan celdas de cajas EXPORTADO. Sobre una PENDIENTE o una ERROR
-- la caja volveria a pasar por el generador y se exportaria con 179 lineas, en
-- silencio: el generador no valida el recuento, recorre las celdas que haya.
-- Si esto salta, mira el CONTROL 5 del 001 para ver que cajas son. La salida
-- es sacar ese DMC del listado, o borrar la caja entera con el procedimiento
-- de 20260815_delete_list_boxes.
DO $$
DECLARE n INT;
BEGIN
    SELECT COUNT(DISTINCT c.id) INTO n
    FROM celdas ce
    JOIN cajas_reempaque c ON c.id = ce.caja_reempaque_id
    JOIN tmp_borrar t      ON t.dmc_code = ce.dmc_code
    WHERE c.estado_sync IS DISTINCT FROM 'EXPORTADO';

    IF n > 0 THEN
        RAISE EXCEPTION
            'Abortado: % cajas afectadas no estan en EXPORTADO y se exportarian incompletas.', n;
    END IF;
END $$;

-- Bloqueo de las cajas afectadas antes de tocarles las celdas, por si el
-- worker sigue vivo pese al flag. El EXISTS no bloquea celdas, solo la
-- cabecera de la caja, que es lo que el worker mira.
SELECT c.id
FROM cajas_reempaque c
WHERE EXISTS (
    SELECT 1
    FROM celdas ce
    JOIN tmp_borrar t ON t.dmc_code = ce.dmc_code
    WHERE ce.caja_reempaque_id = c.id
)
FOR UPDATE;

\echo '=== ANTES: fichero, celdas encontradas, saltadas y cajas tocadas ==='
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

-- Foto de como quedan las cajas. Se saca AHORA porque despues del DELETE ya no
-- se puede reconstruir a que caja pertenecia cada DMC borrado.
\echo '=== COMO QUEDAN LAS CAJAS (guardar esta salida) ==='
SELECT
    c.id_temporal,
    c.estado_sync,
    c.hu_silena_outbound,
    COUNT(*) FILTER (WHERE t.dmc_code IS NOT NULL) AS celdas_borradas,
    COUNT(*) FILTER (WHERE t.dmc_code IS NULL)     AS celdas_restantes
FROM celdas ce
JOIN cajas_reempaque c ON c.id = ce.caja_reempaque_id
LEFT JOIN tmp_borrar t ON t.dmc_code = ce.dmc_code
GROUP BY c.id_temporal, c.estado_sync, c.hu_silena_outbound
HAVING COUNT(*) FILTER (WHERE t.dmc_code IS NOT NULL) > 0
ORDER BY celdas_restantes, c.id_temporal;

-- El borrado. Solo celdas: cajas_reempaque no se toca.
DELETE FROM celdas ce
USING tmp_borrar t
WHERE ce.dmc_code = t.dmc_code;

-- Verificacion: no puede quedar NINGUNA. Si sobrevive una sola, ese DMC sigue
-- pillado por el UNIQUE de celdas.dmc_code y el reescaneo volvera a dar 409,
-- que es justo lo que veniamos a arreglar.
DO $$
DECLARE restantes INT;
BEGIN
    SELECT COUNT(*) INTO restantes
    FROM celdas ce JOIN tmp_borrar t ON t.dmc_code = ce.dmc_code;

    IF restantes <> 0 THEN
        RAISE EXCEPTION 'Abortado: quedan % celdas sin borrar.', restantes;
    END IF;
END $$;

\echo '=== DESPUES: debe salir 0 ==='
SELECT COUNT(*) AS celdas
FROM celdas ce
JOIN tmp_borrar t ON t.dmc_code = ce.dmc_code;

COMMIT;
