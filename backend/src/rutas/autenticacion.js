// ================================================================
// RUTAS DE AUTENTICACIÓN - /api/auth
// La lógica de negocio vive aquí (validación inline + consultas a la BD).
// ================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { consulta } = require('../servicios/db');
const { verificarToken } = require('../middleware/autenticacion');

const router = express.Router();

// El registro público no existe: los usuarios los crea un admin en /api/usuarios
// (la app escribe en el ERP, así que nadie entra sin que se le asigne un rol).

// POST /api/auth/inicio-sesion
router.post('/inicio-sesion', [
    body('correo').isEmail().withMessage('Correo inválido'),
    body('contrasena').notEmpty().withMessage('La contraseña es requerida'),
], async (req, res, next) => {
    try {
        const errores = validationResult(req);
        if (!errores.isEmpty()) return res.status(400).json({ exito: false, errores: errores.array() });

        const correo = req.body.correo.toLowerCase().trim();
        const { rows } = await consulta('SELECT * FROM usuarios WHERE correo = $1', [correo]);
        const usuario = rows[0];

        if (!usuario || !(await bcrypt.compare(req.body.contrasena, usuario.contrasena))) {
            return res.status(401).json({ exito: false, mensaje: 'Credenciales incorrectas.' });
        }
        if (!usuario.activo) {
            return res.status(403).json({ exito: false, mensaje: 'Cuenta desactivada.' });
        }

        const token = jwt.sign(
            { id: usuario.id, correo: usuario.correo, nombre: usuario.nombre, rol: usuario.rol },
            process.env.JWT_SECRETO,
            { expiresIn: process.env.JWT_EXPIRACION || '7d' }
        );
        res.json({
            exito: true,
            token,
            usuario: { id: usuario.id, correo: usuario.correo, nombre: usuario.nombre, rol: usuario.rol },
        });
    } catch (error) { next(error); }
});

// GET /api/auth/perfil
router.get('/perfil', verificarToken, async (req, res, next) => {
    try {
        const { rows } = await consulta(
            'SELECT id, correo, nombre, rol, creado_en FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );
        if (!rows[0]) return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado.' });
        res.json({ exito: true, usuario: rows[0] });
    } catch (error) { next(error); }
});

module.exports = router;
