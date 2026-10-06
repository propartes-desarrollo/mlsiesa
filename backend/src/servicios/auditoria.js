// ================================================================
// SERVICIO DE AUDITORÍA - bitácora de acciones sensibles
// Un fallo al auditar se registra en el log pero no tumba la operación.
// ================================================================
const { consulta } = require('./db');
const logger = require('./logger');

async function registrar(usuarioId, accion, entidad, entidadId, detalle = {}) {
    try {
        await consulta(
            'INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle) VALUES ($1, $2, $3, $4, $5)',
            [usuarioId || null, accion, entidad, entidadId ? String(entidadId) : null, JSON.stringify(detalle)]
        );
    } catch (e) {
        logger.error(`No se pudo registrar auditoría ${accion}/${entidad}: ${e.message}`);
    }
}

module.exports = { registrar };
