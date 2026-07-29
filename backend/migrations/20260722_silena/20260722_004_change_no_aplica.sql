
BEGIN;

UPDATE cajas_reempaque
SET estado_sync = 'PENDIENTE'
WHERE estado_sync = 'NO_APLICA';

COMMIT;