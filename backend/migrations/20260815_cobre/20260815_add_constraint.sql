BEGIN;

-- DROP + ADD: Postgres no deja alterar un CHECK en sitio.
-- Al ser una AMPLIACION del dominio, ninguna fila existente puede violarlo,
-- por lo que la validacion es inmediata y no bloquea la tabla de forma
-- apreciable.
ALTER TABLE cajas_reempaque
    DROP CONSTRAINT IF EXISTS ck_cajas_reempaque_tipo_caja;

ALTER TABLE cajas_reempaque
    ADD CONSTRAINT ck_cajas_reempaque_tipo_caja
    CHECK (tipo_caja IN ('NORMAL', 'DEFECTUOSA', 'CADUCIDAD_PROXIMA', 'COBRE'));

COMMIT;