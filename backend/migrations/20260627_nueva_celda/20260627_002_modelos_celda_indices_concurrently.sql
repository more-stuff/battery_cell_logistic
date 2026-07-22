-- ============================================================================
-- ÍNDICE PARA FILTROS POR MODELO DE CELDA
-- ============================================================================
-- Ejecutar DESPUÉS de 20260627_001_modelos_celda.sql.
-- No usar BEGIN / COMMIT: CREATE INDEX CONCURRENTLY no puede ir dentro de una
-- transacción. Puede ejecutarse con la aplicación disponible.
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_cajas_reempaque_modelo
ON cajas_reempaque (modelo);

CREATE INDEX CONCURRENTLY IF NOT EXISTS
    ix_cajas_reempaque_blackbox_id
ON cajas_reempaque (blackbox_id)
WHERE blackbox_id IS NOT NULL;