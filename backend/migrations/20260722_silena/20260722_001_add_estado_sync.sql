BEGIN;

ALTER TABLE cajas_reempaque
    ADD COLUMN IF NOT EXISTS estado_sync VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE';

ALTER TABLE cajas_reempaque
    ADD COLUMN IF NOT EXISTS sync_exportado_at TIMESTAMP NULL;

ALTER TABLE cajas_reempaque
    ADD COLUMN IF NOT EXISTS intentos_sync INTEGER NOT NULL DEFAULT 0;

-- Valores permitidos:
-- NO_APLICA  = no se exporta (histórico aún no activado / cajas fuera de alcance)
-- PENDIENTE  = en cola para generar fichero
-- EXPORTADO  = fichero escrito en el NAS
-- ERROR      = agotó reintentos, requiere revisión manual

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_cajas_reempaque_estado_sync'
    ) THEN
        ALTER TABLE cajas_reempaque
        ADD CONSTRAINT ck_cajas_reempaque_estado_sync
        CHECK (estado_sync IN ('NO_APLICA', 'PENDIENTE', 'EXPORTADO', 'ERROR'));
    END IF;
END $$;

COMMIT;