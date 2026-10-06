// ================================================================
// MIDDLEWARE - Manejador global de errores
// ================================================================
const logger = require('../servicios/logger');

module.exports = (err, req, res, next) => {
    // Errores de multer (archivo demasiado grande, campo inesperado): son del cliente.
    if (err.name === 'MulterError') {
        err.statusCode = 400;
        err.isOperational = true;
        if (err.code === 'LIMIT_FILE_SIZE') err.message = 'El archivo supera el tamaño máximo (10 MB).';
    }
    const codigo = err.statusCode || 500;
    logger.error(`${req.method} ${req.path} - ${err.message}`, { codigo, stack: err.stack });

    const esProd = process.env.ENTORNO === 'production';
    res.status(codigo).json({
        exito: false,
        mensaje: esProd && !err.isOperational ? 'Error interno del servidor.' : err.message,
        ...(esProd ? {} : { stack: err.stack }),
    });
};
