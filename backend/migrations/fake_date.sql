-- diag_fechas_v2.sql
DO $$
DECLARE
    r       RECORD;
    res     RECORD;
    q       TEXT;
    n_cols  INT := 0;
    n_bad   INT := 0;
BEGIN
    FOR r IN
        SELECT c.table_schema, c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema
         AND t.table_name   = c.table_name
        WHERE t.table_type = 'BASE TABLE'
          AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
          AND c.data_type IN ('date',
                              'timestamp without time zone',
                              'timestamp with time zone')
        ORDER BY c.table_schema, c.table_name, c.column_name
    LOOP
        n_cols := n_cols + 1;
        q := format(
            'SELECT ctid::text AS fila, %I::text AS valor
             FROM %I.%I
             WHERE %I > DATE ''9999-12-31'' OR %I < DATE ''0001-01-01''',
            r.column_name,
            r.table_schema, r.table_name,
            r.column_name, r.column_name
        );
        BEGIN
            FOR res IN EXECUTE q LOOP
                n_bad := n_bad + 1;
                RAISE NOTICE 'FUERA_DE_RANGO_PYTHON | %.% | COL=% | CTID=% | VALOR=%',
                             r.table_schema, r.table_name, r.column_name,
                             res.fila, res.valor;
            END LOOP;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'SALTADA | %.% | COL=% | ERROR=%',
                         r.table_schema, r.table_name, r.column_name, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '--- Columnas revisadas: % | Filas fuera de rango: % ---', n_cols, n_bad;
END $$;