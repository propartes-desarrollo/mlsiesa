-- El pedido tal como quedó en SIESA (CONSULTA_PEDIDO_ML): número, estado y líneas.
-- pedido_siesa = { co, tipoDocto, consec, fecha, estado, tercero, lineas: [...] }
ALTER TABLE envios ADD COLUMN IF NOT EXISTS pedido_siesa JSONB;
ALTER TABLE envios ADD COLUMN IF NOT EXISTS pedido_consultado_en TIMESTAMPTZ;
