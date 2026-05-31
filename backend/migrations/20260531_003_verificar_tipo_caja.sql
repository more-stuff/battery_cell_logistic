-- ============================================================
-- 1. Ver reparto por tipo de caja
-- ============================================================

SELECT tipo_caja, COUNT(*)
FROM cajas_reempaque
GROUP BY tipo_caja
ORDER BY tipo_caja;

-- ============================================================
-- 2. Verificar que no quedan NULL
-- ============================================================

SELECT id, id_temporal, is_defective, tipo_caja
FROM cajas_reempaque
WHERE tipo_caja IS NULL;

-- Esperado: 0 filas

-- ============================================================
-- 3. Verificar que las cajas defectuosas antiguas migraron bien
-- ============================================================

SELECT id, id_temporal, is_defective, tipo_caja
FROM cajas_reempaque
WHERE is_defective IS TRUE
  AND tipo_caja <> 'DEFECTUOSA';

-- Esperado: 0 filas

-- ============================================================
-- 4. Verificar que no hay valores inválidos
-- ============================================================

SELECT DISTINCT tipo_caja
FROM cajas_reempaque
ORDER BY tipo_caja;

-- Esperado máximo:
-- NORMAL
-- DEFECTUOSA
-- CADUCIDAD_PROXIMA

-- ============================================================
-- 5. Verificar parámetro de configuración
-- ============================================================

SELECT clave, valor
FROM configuraciones
WHERE clave = 'caducidad_proxima_dias';

-- Esperado:
-- caducidad_proxima_dias | 30

-- ============================================================
-- 6. Verificar índices creados
-- ============================================================

SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname IN (
    'ix_cajas_reempaque_tipo_caja',
    'ix_celdas_fecha_caducidad'
)
ORDER BY indexname;