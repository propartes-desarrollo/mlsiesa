// ================================================================
// MIDDLEWARE DE AUTENTICACIÓN - JWT + RBAC
// ================================================================
const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
    const auth = req.headers['authorization'];
    const token = auth && auth.split(' ')[1]; // Bearer <token>
    if (!token) {
        return res.status(401).json({ exito: false, mensaje: 'Se requiere autenticación.' });
    }
    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRETO);
        next();
    } catch (error) {
        const expirado = error.name === 'TokenExpiredError';
        return res.status(expirado ? 401 : 403).json({
            exito: false,
            mensaje: expirado ? 'Tu sesión ha expirado.' : 'Token inválido.',
        });
    }
}

function requiereRol(...roles) {
    return (req, res, next) => {
        if (!req.usuario) return res.status(401).json({ exito: false, mensaje: 'No autenticado.' });
        if (!roles.includes(req.usuario.rol)) {
            return res.status(403).json({ exito: false, mensaje: 'Acceso denegado. Permisos insuficientes.' });
        }
        next();
    };
}

module.exports = { verificarToken, requiereRol };
