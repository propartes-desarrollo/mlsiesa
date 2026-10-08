-- ================================================================
-- ESQUEMA INICIAL - se aplica en la PRIMERA creación del volumen
-- (docker-entrypoint-initdb.d). Los cambios posteriores van en
-- db/migraciones/ como sentencias aditivas.
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Actualiza automáticamente la columna actualizado_en
CREATE OR REPLACE FUNCTION actualizar_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------
-- usuarios
--   admin    todo: parámetros SIESA, usuarios, municipios, liberar envíos
--   usuario  carga ventas, las envía a SIESA y consulta el historial
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  correo         VARCHAR(255) UNIQUE NOT NULL,
  nombre         VARCHAR(255) NOT NULL,
  contrasena     VARCHAR(255) NOT NULL,
  rol            VARCHAR(50) NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
  activo         BOOLEAN DEFAULT TRUE,
  creado_en      TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_usuarios_actualizado ON usuarios;
CREATE TRIGGER trg_usuarios_actualizado BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

-- ---------------------------------------------------------------
-- parametros: valores del documento SIESA que el admin cambia desde la app.
-- Solo se guardan los modificados; el resto toma el valor por defecto
-- definido en backend/src/servicios/parametros.js.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parametros (
  clave           VARCHAR(100) PRIMARY KEY,
  valor           TEXT NOT NULL,
  actualizado_por UUID REFERENCES usuarios(id),
  actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_parametros_actualizado ON parametros;
CREATE TRIGGER trg_parametros_actualizado BEFORE UPDATE ON parametros
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

-- ---------------------------------------------------------------
-- municipios: códigos DANE que no trae la tabla incorporada
-- (backend/src/servicios/dane.js). nombre_normalizado = sin tildes, minúsculas.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS municipios (
  cod_depto          CHAR(2) NOT NULL,
  nombre_normalizado VARCHAR(100) NOT NULL,
  nombre             VARCHAR(100) NOT NULL,
  cod_ciudad         CHAR(3) NOT NULL,
  creado_en          TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cod_depto, nombre_normalizado)
);

-- ---------------------------------------------------------------
-- cargues: cada Excel subido, con las ventas ya interpretadas.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cargues (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  archivo      VARCHAR(255) NOT NULL,
  total_ventas INTEGER NOT NULL,
  ventas       JSONB NOT NULL,
  cargado_por  UUID REFERENCES usuarios(id),
  creado_en    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cargues_creado_en ON cargues(creado_en DESC);

-- ---------------------------------------------------------------
-- envios: una fila por venta de ML (llave natural: # de venta).
--   enviando | importado | rechazado | error
-- Una venta 'importado' nunca se reenvía; 'enviando' es el candado.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS envios (
  venta             VARCHAR(30) PRIMARY KEY,
  estado            VARCHAR(20) NOT NULL CHECK (estado IN ('enviando', 'importado', 'rechazado', 'error')),
  detalle           TEXT,
  tercero_creado    BOOLEAN NOT NULL DEFAULT FALSE,
  documento_pedido  TEXT,          -- XML enviado, con la clave enmascarada
  documento_tercero TEXT,
  respuesta         TEXT,          -- respuesta SOAP de SIESA (recortada)
  resumen           JSONB DEFAULT '{}'::jsonb,
  pedido_siesa      JSONB,         -- el pedido como quedó en SIESA (número y líneas)
  pedido_consultado_en TIMESTAMPTZ,
  intentos          INTEGER NOT NULL DEFAULT 0,
  cargue_id         UUID REFERENCES cargues(id),
  enviado_por       UUID REFERENCES usuarios(id),
  creado_en         TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_envios_estado ON envios(estado);
CREATE INDEX IF NOT EXISTS idx_envios_actualizado ON envios(actualizado_en DESC);

DROP TRIGGER IF EXISTS trg_envios_actualizado ON envios;
CREATE TRIGGER trg_envios_actualizado BEFORE UPDATE ON envios
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

-- ---------------------------------------------------------------
-- auditoria: quién hizo qué y cuándo (cargues, envíos, parámetros, usuarios).
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id),
  accion     VARCHAR(60) NOT NULL,
  entidad    VARCHAR(60) NOT NULL,
  entidad_id VARCHAR(100),
  detalle    JSONB DEFAULT '{}'::jsonb,
  creado_en  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auditoria_creado_en ON auditoria(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad, entidad_id);
