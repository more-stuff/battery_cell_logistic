-- ============================================================
-- ROLLBACK TIPO_CAJA + CADUCIDAD PRÓXIMA + ÍNDICES
-- ============================================================
-- IMPORTANTE:
-- DROP INDEX CONCURRENTLY no puede ejecutarse dentro de BEGIN / COMMIT.
-- Por eso todos los índices se eliminan primero, fuera de transacción.
-- ============================================================


-- ============================================================
-- 1. Eliminar índices concurrentes
-- ============================================================

DROP INDEX CONCURRENTLY IF EXISTS ix_cajas_reempaque_tipo_caja;

DROP INDEX CONCURRENTLY IF EXISTS ix_celdas_fecha_caducidad;

DROP INDEX CONCURRENTLY IF EXISTS ix_cajas_reempaque_fecha_fin_reempaque;

DROP INDEX CONCURRENTLY IF EXISTS ix_cajas_reempaque_is_defective;

DROP INDEX CONCURRENTLY IF EXISTS ix_cajas_reempaque_usuario_id;

DROP INDEX CONCURRENTLY IF EXISTS ix_celdas_hu_origen_id;


-- ============================================================
-- 2. Rollback transaccional del resto
-- ============================================================

BEGIN;

ALTER TABLE cajas_reempaque
DROP CONSTRAINT IF EXISTS ck_cajas_reempaque_tipo_caja;

ALTER TABLE cajas_reempaque
DROP COLUMN IF EXISTS tipo_caja;

DELETE FROM configuraciones
WHERE clave IN (
  'caducidad_proxima_dias',
  'limite_caducidad_proxima'
);

COMMIT;