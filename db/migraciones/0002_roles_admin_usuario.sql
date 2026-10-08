-- Dos roles: admin y usuario. Los antiguos operador y consulta pasan a usuario.
-- Excepción a la regla de migraciones aditivas: hay que reemplazar el CHECK de rol
-- (no se borran datos).
BEGIN;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
UPDATE usuarios SET rol = 'usuario' WHERE rol NOT IN ('admin', 'usuario');
ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'usuario';
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('admin', 'usuario'));
COMMIT;
