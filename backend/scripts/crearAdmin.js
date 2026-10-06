// ================================================================
// Crea (o reactiva) el primer administrador.
// Uso: node scripts/crearAdmin.js correo@propartes.com "Nombre" contrasena
// En Docker: docker exec -it mlsiesa_backend node scripts/crearAdmin.js ...
// ================================================================
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { consulta, pool } = require('../src/servicios/db');

(async () => {
    const [correo, nombre, contrasena] = process.argv.slice(2);
    if (!correo || !nombre || !contrasena || contrasena.length < 8) {
        console.error('Uso: node scripts/crearAdmin.js <correo> "<nombre>" <contrasena (min. 8)>');
        process.exit(1);
    }
    const hash = await bcrypt.hash(contrasena, 12);
    await consulta(
        `INSERT INTO usuarios (correo, nombre, contrasena, rol) VALUES ($1, $2, $3, 'admin')
         ON CONFLICT (correo) DO UPDATE SET nombre = EXCLUDED.nombre, contrasena = EXCLUDED.contrasena, rol = 'admin', activo = TRUE`,
        [correo.toLowerCase().trim(), nombre, hash]);
    console.log(`Administrador listo: ${correo}`);
    await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
