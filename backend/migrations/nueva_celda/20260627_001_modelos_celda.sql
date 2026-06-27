-- ============================================================================
-- MODELOS DE CELDA: MODELO1 y MODELO2
-- ============================================================================
-- Ejecutar ANTES de desplegar el backend que incorpora tipo_celda.
-- Ventana recomendada: mantenimiento de domingo.
--
-- Qué hace:
--   1) Todas las cajas históricas pasan a MODELO1.
--   2) Configuraciones deja de tener PK por "clave" y pasa a tener PK compuesta:
--      (tipo_celda, clave).
--   3) Se crean los valores iniciales de MODELO2 copiando MODELO1.
--
-- Este archivo es transaccional. Si algo falla, no deja una migración a medias.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. CAJAS: el modelo queda guardado en la caja, no en cada celda.
-- ---------------------------------------------------------------------------
ALTER TABLE cajas_reempaque
    ADD COLUMN IF NOT EXISTS modelo VARCHAR(30);

-- Históricos y valores inválidos previos se consideran MODELO1.
UPDATE cajas_reempaque
SET modelo = 'MODELO1'
WHERE modelo IS NULL
   OR modelo NOT IN ('MODELO1', 'MODELO2');

ALTER TABLE cajas_reempaque
    ALTER COLUMN modelo SET DEFAULT 'MODELO1';

ALTER TABLE cajas_reempaque
    ALTER COLUMN modelo SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_cajas_reempaque_modelo'
          AND conrelid = 'cajas_reempaque'::regclass
    ) THEN
        ALTER TABLE cajas_reempaque
        ADD CONSTRAINT ck_cajas_reempaque_modelo
        CHECK (modelo IN ('MODELO1', 'MODELO2')) NOT VALID;
    END IF;
END $$;

ALTER TABLE cajas_reempaque
    VALIDATE CONSTRAINT ck_cajas_reempaque_modelo;

-- ---------------------------------------------------------------------------
-- 2. CONFIGURACIONES: una misma clave puede existir una vez por modelo.
-- ---------------------------------------------------------------------------
ALTER TABLE configuraciones
    ADD COLUMN IF NOT EXISTS modelo VARCHAR(30);

-- Todas las configuraciones existentes pertenecen al modelo actual.
UPDATE configuraciones
SET modelo = 'MODELO1'
WHERE modelo IS NULL
   OR modelo NOT IN ('MODELO1', 'MODELO2');

ALTER TABLE configuraciones
    ALTER COLUMN modelo SET DEFAULT 'MODELO1';

ALTER TABLE configuraciones
    ALTER COLUMN modelo SET NOT NULL;

-- La PK actual es solo (clave). La sustituimos por (modelo, clave).
-- Se detecta el nombre real de la PK para que sea robusto ante instalaciones
-- donde no se llame exactamente configuraciones_pkey.
DO $$
DECLARE
    nombre_pk TEXT;
BEGIN
    SELECT conname
    INTO nombre_pk
    FROM pg_constraint
    WHERE conrelid = 'configuraciones'::regclass
      AND contype = 'p';

    IF nombre_pk IS NOT NULL THEN
        EXECUTE format(
            'ALTER TABLE configuraciones DROP CONSTRAINT %I',
            nombre_pk
        );
    END IF;
END $$;

ALTER TABLE configuraciones
    ADD CONSTRAINT configuraciones_pkey PRIMARY KEY (modelo, clave);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_configuraciones_modelo'
          AND conrelid = 'configuraciones'::regclass
    ) THEN
        ALTER TABLE configuraciones
        ADD CONSTRAINT ck_configuraciones_modelo
        CHECK (modelo IN ('MODELO1', 'MODELO2')) NOT VALID;
    END IF;
END $$;

ALTER TABLE configuraciones
    VALIDATE CONSTRAINT ck_configuraciones_modelo;

-- Asegura que MODELO1 tenga todos los parámetros actualmente soportados.
INSERT INTO configuraciones (modelo, clave, valor)
VALUES
    ('MODELO1', 'alerta_cada', '15'),
    ('MODELO1', 'limite_caja', '180'),
    ('MODELO1', 'limite_defectuosa', '180'),
    ('MODELO1', 'limite_caducidad_proxima', '180'),
    ('MODELO1', 'len_dmc', '87'),
    ('MODELO1', 'caducidad_proxima_dias', '30')
ON CONFLICT (modelo, clave) DO NOTHING;

-- MODELO2 nace con exactamente los valores vigentes de MODELO1.
-- No altera MODELO2 si el script se ejecuta de nuevo.
INSERT INTO configuraciones (modelo, clave, valor)
SELECT 'MODELO2', clave, valor
FROM configuraciones
WHERE modelo = 'MODELO1'
  AND clave IN (
      'alerta_cada',
      'limite_caja',
      'limite_defectuosa',
      'limite_caducidad_proxima',
      'len_dmc',
      'caducidad_proxima_dias'
  )
ON CONFLICT (modelo, clave) DO NOTHING;

COMMIT;
