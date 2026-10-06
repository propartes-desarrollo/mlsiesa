// ================================================================
// SERVICIO DE BASE DE DATOS - Pool de PostgreSQL (node-postgres)
// ================================================================
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {
    console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});

module.exports = {
    // Ejecuta una consulta parametrizada. SIEMPRE usar $1, $2... nunca concatenar.
    consulta: (texto, params) => pool.query(texto, params),
    pool,
};
