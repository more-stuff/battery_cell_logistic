BEGIN;

LOCK TABLE dmc_defectuosos IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM dmc_defectuosos WHERE motivo = 'COBRE') THEN
        RAISE EXCEPTION
            'Rollback cancelado: ya hay DMC marcados como COBRE. Perderías la reclasificación.';
    END IF;
END $$;

DROP INDEX IF EXISTS ix_dmc_defectuosos_motivo;

ALTER TABLE dmc_defectuosos
    DROP CONSTRAINT IF EXISTS ck_dmc_defectuosos_motivo;

ALTER TABLE dmc_defectuosos
    DROP COLUMN IF EXISTS motivo;

DELETE FROM configuraciones WHERE clave = 'blacklist_version';

COMMIT;