-- ============================================================
-- ÍNDICES CONCURRENTES PARA PRODUCCIÓN
-- ============================================================
-- IMPORTANTE:
-- Este archivo NO debe ejecutarse dentro de BEGIN / COMMIT.
-- CREATE INDEX CONCURRENTLY no puede ejecutarse dentro de una transacción.
-- Ejecutar en ventana controlada, pero permite menos bloqueo que CREATE INDEX normal.
-- ============================================================


-- Índice para filtrar cajas por tipo:
-- NORMAL / DEFECTUOSA / CADUCIDAD_PROXIMA

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_cajas_reempaque_tipo_caja
ON cajas_reempaque (tipo_caja);


-- Índice para optimizar los filtros de consulta por fecha de caducidad
-- en la tabla celdas.

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_celdas_fecha_caducidad
ON celdas (fecha_caducidad);


-- Índice para optimizar filtros por fecha de cierre/reempaque de caja
-- usado en consulta/exportación por rango de fechas.

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_cajas_reempaque_fecha_fin_reempaque
ON cajas_reempaque (fecha_fin_reempaque);


-- Índice para filtros por caja defectuosa.
-- Aunque estamos migrando hacia tipo_caja, is_defective sigue existiendo
-- y todavía puede usarse en filtros antiguos.

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_cajas_reempaque_is_defective
ON cajas_reempaque (is_defective);


-- Índice para filtros por puesto/usuario de escaneo.

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_cajas_reempaque_usuario_id
ON cajas_reempaque (usuario_id);


-- Índice para joins/filtros por HU de origen desde celdas.
-- Útil si la consulta filtra por HU entrada / proveedor.

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_celdas_hu_origen_id
ON celdas (hu_origen_id);