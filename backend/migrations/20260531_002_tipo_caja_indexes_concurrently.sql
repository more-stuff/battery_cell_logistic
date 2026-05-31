-- IMPORTANTE:
-- Este script NO debe ejecutarse dentro de BEGIN / COMMIT.
-- CREATE INDEX CONCURRENTLY no puede ejecutarse dentro de una transacción.

-- Índice para futuros filtros por tipo de caja:
-- NORMAL / DEFECTUOSA / CADUCIDAD_PROXIMA

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_cajas_reempaque_tipo_caja
ON cajas_reempaque (tipo_caja);

-- Índice para optimizar los filtros actuales de consulta por fecha de caducidad
-- en la tabla celdas.

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_celdas_fecha_caducidad
ON celdas (fecha_caducidad);