BEGIN;

-- Sin esta fila, get_flag_global() cae al valor por defecto en código
-- (box_rules.FLAGS_GLOBALES). Se inserta explícitamente para que el estado
-- de arranque en producción no dependa de ese fallback ni pueda cambiar
-- por sorpresa si el default en código cambia en el futuro.
INSERT INTO configuraciones (modelo, clave, valor)
VALUES
    ('MODELO1', 'sync_activo', '0'),
    ('MODELO2', 'sync_activo', '0')
ON CONFLICT (modelo, clave) DO NOTHING;

COMMIT;
