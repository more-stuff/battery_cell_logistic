-- ============================================================================
-- ROLLBACK DE MODELOS DE CELDA
-- ============================================================================
-- SOLO usar si todavía no se ha creado ninguna caja MODELO2.
-- Ejecutar con el backend parado, durante ventana de mantenimiento.
--
-- Si detecta cualquier caja MODELO2, aborta sin modificar nada.
-- ============================================================================

BEGIN;

-- Evita que se pueda crear una caja mientras se valida y se revierte.
LOCK TABLE cajas_reempaque IN ACCESS EXCLUSIVE MODE;

-- Seguridad: no permitir rollback si ya existe trazabilidad real de MODELO2.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM cajas_reempaque
        WHERE modelo = 'MODELO2'
    ) THEN
        RAISE EXCEPTION
            'Rollback cancelado: ya existen cajas MODELO2. No es seguro borrar la columna modelo.';
    END IF;
END $$;


-- 1. Eliminar índice de filtro por modelo.
DROP INDEX IF EXISTS ix_cajas_reempaque_modelo;


-- 2. Eliminar restricciones y columna modelo de cajas.
ALTER TABLE cajas_reempaque
    DROP CONSTRAINT IF EXISTS ck_cajas_reempaque_modelo;

ALTER TABLE cajas_reempaque
    DROP COLUMN IF EXISTS modelo;


-- 3. Eliminar configuración exclusiva de MODELO2.
DELETE FROM configuraciones
WHERE modelo = 'MODELO2';


-- 4. Eliminar restricciones y PK compuesta de configuraciones.
ALTER TABLE configuraciones
    DROP CONSTRAINT IF EXISTS ck_configuraciones_modelo;

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


-- 5. Eliminar la columna modelo y restaurar PK original por clave.
ALTER TABLE configuraciones
    DROP COLUMN IF EXISTS modelo;

ALTER TABLE configuraciones
    ADD CONSTRAINT configuraciones_pkey PRIMARY KEY (clave);

COMMIT;