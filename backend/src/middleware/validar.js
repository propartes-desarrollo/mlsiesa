// ================================================================
// MIDDLEWARE - corta la petición si express-validator encontró errores
// ================================================================
const { validationResult } = require('express-validator');

module.exports = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ exito: false, mensaje: errores.array()[0].msg, errores: errores.array() });
    }
    next();
};
