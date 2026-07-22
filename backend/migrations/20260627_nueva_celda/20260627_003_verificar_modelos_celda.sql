-- ============================================================================
-- VERIFICACIONES POSTERIORES A LA MIGRACIÓN DE MODELOS DE CELDA
-- ============================================================================

-- 1. Reparto de cajas por modelo.
-- Al acabar la migración inicial, todas las históricas deberían ser MODELO1.
SELECT modelo, COUNT(*) AS total_cajas
FROM cajas_reempaque
GROUP BY modelo
ORDER BY modelo;


-- 2. No debe haber cajas sin modelo ni con un valor inválido.
SELECT id, id_temporal, modelo
FROM cajas_reempaque
WHERE modelo IS NULL
   OR modelo NOT IN ('MODELO1', 'MODELO2');

-- Esperado: 0 filas.


-- 3. Ver las configuraciones de ambos modelos.
SELECT modelo, clave, valor
FROM configuraciones
WHERE clave IN (
    'alerta_cada',
    'limite_caja',
    'limite_defectuosa',
    'limite_caducidad_proxima',
    'len_dmc',
    'caducidad_proxima_dias'
)
ORDER BY clave, modelo;

-- Esperado: 12 filas.
-- 6 para MODELO1 y 6 para MODELO2.


-- 4. Comprobar si falta alguna configuración obligatoria.
WITH modelos AS (
    SELECT 'MODELO1'::VARCHAR AS modelo
    UNION ALL
    SELECT 'MODELO2'::VARCHAR
),
claves AS (
    SELECT 'alerta_cada'::VARCHAR AS clave
    UNION ALL SELECT 'limite_caja'
    UNION ALL SELECT 'limite_defectuosa'
    UNION ALL SELECT 'limite_caducidad_proxima'
    UNION ALL SELECT 'len_dmc'
    UNION ALL SELECT 'caducidad_proxima_dias'
)
SELECT
    modelos.modelo,
    claves.clave AS configuracion_faltante
FROM modelos
CROSS JOIN claves
LEFT JOIN configuraciones c
    ON c.modelo = modelos.modelo
   AND c.clave = claves.clave
WHERE c.clave IS NULL
ORDER BY modelos.modelo, claves.clave;

-- Esperado: 0 filas.


-- 5. Al inicio MODELO1 y MODELO2 deben tener los mismos valores.
SELECT
    c1.clave,
    c1.valor AS valor_modelo1,
    c2.valor AS valor_modelo2,
    (c1.valor = c2.valor) AS coinciden
FROM configuraciones c1
JOIN configuraciones c2
    ON c2.clave = c1.clave
   AND c2.modelo = 'MODELO2'
WHERE c1.modelo = 'MODELO1'
  AND c1.clave IN (
      'alerta_cada',
      'limite_caja',
      'limite_defectuosa',
      'limite_caducidad_proxima',
      'len_dmc',
      'caducidad_proxima_dias'
  )
ORDER BY c1.clave;

-- Esperado: 6 filas y coinciden = true en todas.


-- 6. Confirmar que existe el índice de filtro por modelo.
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'cajas_reempaque'
  AND indexname = 'ix_cajas_reempaque_modelo';

-- Esperado: 1 fila.


-- 7. Confirmar que existen las restricciones de modelo.
SELECT
    conname,
    pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid IN (
    'cajas_reempaque'::regclass,
    'configuraciones'::regclass
)
AND conname IN (
    'ck_cajas_reempaque_modelo',
    'ck_configuraciones_modelo',
    'configuraciones_pkey'
)
ORDER BY conname;