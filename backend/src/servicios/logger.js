// ================================================================
// SERVICIO DE LOGGING - a archivo (logs/) + consola
// ================================================================
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '../../logs');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

function escribir(tipo, mensaje, meta = {}) {
    const stack = meta.stack || '';
    delete meta.stack;
    const linea = `[${new Date().toISOString()}] [${tipo}] ${mensaje} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}${stack ? '\n' + stack : ''}\n`;
    try {
        fs.appendFileSync(path.join(DIR, tipo === 'ERROR' ? 'errores.log' : 'acceso.log'), linea);
    } catch (e) { /* noop */ }
    (tipo === 'ERROR' ? console.error : console.log)(`[${tipo}] ${mensaje}`);
}

module.exports = {
    error: (m, meta) => escribir('ERROR', m, meta),
    info: (m, meta) => escribir('INFO', m, meta),
    warn: (m, meta) => escribir('WARN', m, meta),
};
