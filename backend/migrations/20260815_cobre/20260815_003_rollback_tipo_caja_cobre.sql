BEGIN;

LOCK TABLE cajas_reempaque IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cajas_reempaque WHERE tipo_caja = 'COBRE') THEN
        RAISE EXCEPTION
            'Rollback cancelado: ya existen cajas COBRE. Reducir el dominio dejaria filas invalidas.';
    END IF;
END $$;

ALTER TABLE cajas_reempaque
    DROP CONSTRAINT IF EXISTS ck_cajas_reempaque_tipo_caja;

ALTER TABLE cajas_reempaque
    ADD CONSTRAINT ck_cajas_reempaque_tipo_caja
    CHECK (tipo_caja IN ('NORMAL', 'DEFECTUOSA', 'CADUCIDAD_PROXIMA'));

COMMIT;