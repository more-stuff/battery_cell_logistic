-- ============================================================================
-- PUESTOS ZEO: catálogo de unidades productivas de ZEO + puesto en la caja
-- ============================================================================
-- Ejecutar ANTES de desplegar el backend que incorpora el modelo Puesto.
-- Ventana recomendada: mantenimiento de domingo.
--
-- Qué hace:
--   1) Crea la tabla puestos (reflejo local 1:1 de las unidades productivas
--      de ZEO que intervienen en el reempaque de cajas).
--   2) Añade cajas_reempaque.puesto_id como FK nullable (el histórico de cajas
--      ya cerradas no tiene puesto, igual que se hizo con tipo_caja).
--
-- pu_integration_code queda NULLABLE de momento: se rellena cuando ZEO
-- confirme qué unidades aplican y con el worker de sincronización.
--
-- Este archivo es transaccional. Si algo falla, no deja una migración a medias.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. TABLA puestos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS puestos (
    id                  SERIAL PRIMARY KEY,
    -- Nombre que ve el operario al iniciar sesión (ej. "PWC-MESA 4B").
    nombre              VARCHAR(100) NOT NULL,
    -- Código de integración de ZEO (ej. "46346aac-0" o "THIMM_MANIP_3").
    -- Nullable hasta que ZEO confirme el mapeo. Es el valor que se envía en
    -- increase-counter-values como puIntegrationCode.
    pu_integration_code VARCHAR(100),
    -- productionUnitName tal cual lo devuelve ZEO, para poder casarlos en el
    -- CRUD de administración aunque el nombre visible del puesto se edite.
    pu_nombre_zeo       VARCHAR(100),
    activo              BOOLEAN NOT NULL DEFAULT TRUE
);

-- Un mismo puIntegrationCode no debe mapearse a dos puestos.
-- Índice único parcial: aplica solo cuando el código ya está informado
-- (permite varias filas con code NULL mientras ZEO no confirma).
CREATE UNIQUE INDEX IF NOT EXISTS ux_puestos_pu_integration_code
    ON puestos (pu_integration_code)
    WHERE pu_integration_code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. CAJAS: puesto donde se cerró la caja.
-- ---------------------------------------------------------------------------
ALTER TABLE cajas_reempaque
    ADD COLUMN IF NOT EXISTS puesto_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_cajas_reempaque_puesto'
          AND conrelid = 'cajas_reempaque'::regclass
    ) THEN
        ALTER TABLE cajas_reempaque
        ADD CONSTRAINT fk_cajas_reempaque_puesto
        FOREIGN KEY (puesto_id) REFERENCES puestos (id);
    END IF;
END $$;

-- PostgreSQL NO crea índice automático en FKs: sin él, buscar "todas las
-- cajas de este puesto" hace full table scan.
CREATE INDEX IF NOT EXISTS ix_cajas_reempaque_puesto_id
    ON cajas_reempaque (puesto_id);

COMMIT;