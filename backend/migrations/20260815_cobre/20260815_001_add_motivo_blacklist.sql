BEGIN;

-- 1. Columna nueva, todavía nullable para poder rellenarla sin romper nada.
ALTER TABLE dmc_defectuosos
    ADD COLUMN IF NOT EXISTS motivo VARCHAR(20);

-- 2. Relleno del histórico. Si en una reejecución hubiera valores válidos,
--    se respetan; solo se tocan los NULL y los valores fuera de dominio.
UPDATE dmc_defectuosos
SET motivo = 'DEFECTUOSO'
WHERE motivo IS NULL
   OR motivo NOT IN ('DEFECTUOSO', 'COBRE');

-- 3. Valor por defecto para las importaciones que no especifiquen motivo.
ALTER TABLE dmc_defectuosos
    ALTER COLUMN motivo SET DEFAULT 'DEFECTUOSO';

-- 4. Ahora que todas las filas tienen valor, bloqueamos NULL.
ALTER TABLE dmc_defectuosos
    ALTER COLUMN motivo SET NOT NULL;

-- 5. Dominio cerrado. Cualquier motivo nuevo pasará por migración explícita.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_dmc_defectuosos_motivo'
    ) THEN
        ALTER TABLE dmc_defectuosos
        ADD CONSTRAINT ck_dmc_defectuosos_motivo
        CHECK (motivo IN ('DEFECTUOSO', 'COBRE'));
    END IF;
END $$;

-- 6. Índice para servir cada lista por separado al frontend.
--    Sin él, "dame todos los de cobre" es un full scan sobre la tabla entera.
CREATE INDEX IF NOT EXISTS ix_dmc_defectuosos_motivo
    ON dmc_defectuosos (motivo);

-- 7. Versión de la lista de bloqueo.
--    Global (no depende del modelo), pero se guarda una fila por modelo con el
--    mismo valor, igual que sync_activo, para reutilizar los helpers de
--    configuración y la pantalla de administración que ya existen.
--
--    El backend la incrementa en CADA escritura sobre dmc_defectuosos: import
--    CSV, borrados y el UPDATE de reclasificación. Es lo que permite que un
--    terminal sepa si su copia local sigue siendo válida.
INSERT INTO configuraciones (modelo, clave, valor)
VALUES ('MODELO1', 'blacklist_version', '1'),
       ('MODELO2', 'blacklist_version', '1')
ON CONFLICT (modelo, clave) DO NOTHING;

COMMIT;