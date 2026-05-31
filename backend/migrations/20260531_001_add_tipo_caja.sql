BEGIN;

-- 1. Añadimos la columna nueva, todavía nullable para poder rellenarla sin romper datos existentes
ALTER TABLE cajas_reempaque
    ADD COLUMN IF NOT EXISTS tipo_caja VARCHAR(30);

-- 2. Migramos datos existentes desde is_defective
-- Si ya hubiera algún valor válido en tipo_caja, lo respetamos
UPDATE cajas_reempaque
SET tipo_caja = CASE
    WHEN tipo_caja IN ('NORMAL', 'DEFECTUOSA', 'CADUCIDAD_PROXIMA') THEN tipo_caja
    WHEN is_defective IS TRUE THEN 'DEFECTUOSA'
    ELSE 'NORMAL'
END
WHERE tipo_caja IS NULL
   OR tipo_caja NOT IN ('NORMAL', 'DEFECTUOSA', 'CADUCIDAD_PROXIMA');

-- Dejamos valor por defecto para cajas nuevas
ALTER TABLE cajas_reempaque
    ALTER COLUMN tipo_caja SET DEFAULT 'NORMAL';

-- Ahora que todas las filas tienen valor, bloqueamos NULL
ALTER TABLE cajas_reempaque
    ALTER COLUMN tipo_caja SET NOT NULL;

-- Añadimos constraint de valores permitidos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_cajas_reempaque_tipo_caja'
    ) THEN
        ALTER TABLE cajas_reempaque
        ADD CONSTRAINT ck_cajas_reempaque_tipo_caja
        CHECK (tipo_caja IN ('NORMAL', 'DEFECTUOSA', 'CADUCIDAD_PROXIMA'));
    END IF;
END $$;

-- 6. Índice para futuros filtros por tipo de caja
CREATE INDEX IF NOT EXISTS ix_cajas_reempaque_tipo_caja
    ON cajas_reempaque (tipo_caja);


INSERT INTO configuraciones (clave, valor)
VALUES ('caducidad_proxima_dias', '30')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO configuraciones (clave, valor)
VALUES ('limite_caducidad_proxima', '180')
ON CONFLICT (clave) DO NOTHING;

COMMIT;