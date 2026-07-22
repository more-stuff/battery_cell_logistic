CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_cajas_reempaque_estado_sync_pendiente
ON cajas_reempaque (id)
WHERE estado_sync = 'PENDIENTE';