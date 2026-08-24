BEGIN;

ALTER TABLE palets_entrada
    ADD CONSTRAINT ck_palets_fecha_recibo_rango
    CHECK (
        fecha_recibo IS NULL
        OR fecha_recibo BETWEEN TIMESTAMP '2020-01-01 00:00:00'
                            AND TIMESTAMP '2050-12-31 23:59:59'
    );

COMMIT;