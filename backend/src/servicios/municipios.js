// ================================================================
// MUNICIPIOS ADICIONALES - códigos DANE agregados por el admin en la BD
// Complementan la tabla incorporada en servicios/dane.js.
// ================================================================
const { consulta } = require('./db');

// { '<cod_depto>': { '<nombre normalizado>': '<cod_ciudad>' } }
async function mapa() {
    const { rows } = await consulta('SELECT cod_depto, nombre_normalizado, cod_ciudad FROM municipios');
    const out = {};
    for (const r of rows) (out[r.cod_depto] ||= {})[r.nombre_normalizado] = r.cod_ciudad;
    return out;
}

module.exports = { mapa };
