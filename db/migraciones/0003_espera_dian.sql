-- Estado espera_dian: la DIAN no respondió al validar el RUT del comprador. La venta se
-- reintenta sola (proximo_intento) hasta la espera máxima contada desde espera_desde.
-- Excepción a la regla de migraciones aditivas: hay que reemplazar el CHECK de estado
-- (no se borran datos).
BEGIN;
ALTER TABLE envios DROP CONSTRAINT IF EXISTS envios_estado_check;
ALTER TABLE envios ADD CONSTRAINT envios_estado_check
    CHECK (estado IN ('enviando', 'importado', 'rechazado', 'error', 'espera_dian'));
ALTER TABLE envios ADD COLUMN IF NOT EXISTS espera_desde TIMESTAMPTZ;
ALTER TABLE envios ADD COLUMN IF NOT EXISTS proximo_intento TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_envios_proximo_intento ON envios(proximo_intento) WHERE estado = 'espera_dian';
COMMIT;
