-- diag_fechas.sql
DO $$
DECLARE
    r   RECORD;
    res RECORD;
    q   TEXT;
BEGIN
    FOR r IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type IN ('date',
                            'timestamp without time zone',
                            'timestamp with time zone')
    LOOP
        q := format(
            'SELECT id, %I::text AS valor FROM %I
             WHERE %I > DATE ''9999-12-31'' OR %I < DATE ''1000-01-01''',
            r.column_name, r.table_name, r.column_name, r.column_name
        );
        BEGIN
            FOR res IN EXECUTE q LOOP
                RAISE NOTICE 'TABLA=% | COL=% | ID=% | VALOR=%',
                             r.table_name, r.column_name, res.id, res.valor;
            END LOOP;
        EXCEPTION WHEN undefined_column THEN
            NULL;  -- tablas sin columna id, se ignoran
        END;
    END LOOP;
END $$;