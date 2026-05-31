-- ============================================================
-- IMPORTANTE:
-- DROP INDEX CONCURRENTLY tampoco puede ir dentro de BEGIN / COMMIT.
-- Por eso los índices se eliminan primero, fuera de transacción.
-- ============================================================

DROP INDEX CONCURRENTLY IF EXISTS ix_cajas_reempaque_tipo_caja;

DROP INDEX CONCURRENTLY IF EXISTS ix_celdas_fecha_caducidad;

-- ============================================================
-- Ahora sí: rollback transaccional del resto
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