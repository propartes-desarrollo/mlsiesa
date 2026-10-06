// ================================================================
// RUTAS DE USUARIOS - /api/usuarios (solo admin)
// PUT con actualización parcial: solo cambia los campos enviados.
// ================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param } = require('express-validator');
const { consulta } = require('../servicios/db');
const { verificarToken, requiereRol } = require('../middleware/autenticacion');
const validar = require('../middleware/validar');
const AppError = require('../utilidades/AppError');
const auditoria = require('../servicios/auditoria');

const router = express.Router();
router.use(verificarToken, requiereRol('admin'));

const ROLES = ['admin', 'operador', 'consulta'];
const CAMPOS = 'id, correo, nombre, rol, activo, creado_en';

// GET /api/usuarios
router.get('/', async (req, res, next) => {
    try {
        const { rows } = await consulta(`SELECT ${CAMPOS} FROM usuarios ORDER BY nombre`);
        res.json({ exito: true, usuarios: rows });
    } catch (error) { next(error); }
});

// POST /api/usuarios
router.post('/', [
    body('correo').isEmail().withMessage('Correo inválido'),
    body('nombre').trim().isLength({ min: 2 }).withMessage('Nombre demasiado corto'),
    body('contrasena').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('rol').isIn(ROLES).withMessage('Rol inválido'),
], validar, async (req, res, next) => {
    try {
        const correo = req.body.correo.toLowerCase().trim();
        const existe = await consulta('SELECT 1 FROM usuarios WHERE correo = $1', [correo]);
        if (existe.rowCount) throw new AppError('El correo ya está registrado.', 400);
        const hash = await bcrypt.hash(req.body.contrasena, 12);
        const { rows } = await consulta(
            `INSERT INTO usuarios (correo, nombre, contrasena, rol) VALUES ($1, $2, $3, $4) RETURNING ${CAMPOS}`,
            [correo, req.body.nombre.trim(), hash, req.body.rol]);
        await auditoria.registrar(req.usuario.id, 'crear_usuario', 'usuario', rows[0].id, { correo, rol: req.body.rol });
        res.status(201).json({ exito: true, usuario: rows[0] });
    } catch (error) { next(error); }
});

// PUT /api/usuarios/:id  { nombre?, rol?, activo?, contrasena? }
router.put('/:id', [
    param('id').isUUID(),
    body('nombre').optional().trim().isLength({ min: 2 }),
    body('rol').optional().isIn(ROLES),
    body('activo').optional().isBoolean(),
    body('contrasena').optional().isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
], validar, async (req, res, next) => {
    try {
        if (req.params.id === req.usuario.id && (req.body.activo === false || (req.body.rol && req.body.rol !== 'admin'))) {
            throw new AppError('No puede quitarse a sí mismo el rol de administrador ni desactivarse.', 400);
        }
        const cambios = [];
        const valores = [];
        for (const campo of ['nombre', 'rol', 'activo']) {
            if (req.body[campo] !== undefined) {
                valores.push(campo === 'nombre' ? req.body.nombre.trim() : req.body[campo]);
                cambios.push(`${campo} = $${valores.length}`);
            }
        }
        if (req.body.contrasena) {
            valores.push(await bcrypt.hash(req.body.contrasena, 12));
            cambios.push(`contrasena = $${valores.length}`);
        }
        if (!cambios.length) throw new AppError('No se envió ningún cambio.', 400);
        valores.push(req.params.id);
        const { rows } = await consulta(
            `UPDATE usuarios SET ${cambios.join(', ')} WHERE id = $${valores.length} RETURNING ${CAMPOS}`, valores);
        if (!rows[0]) throw new AppError('Usuario no encontrado.', 404);
        const { contrasena, ...sinClave } = req.body;
        await auditoria.registrar(req.usuario.id, 'editar_usuario', 'usuario', req.params.id, { ...sinClave, cambioContrasena: Boolean(contrasena) });
        res.json({ exito: true, usuario: rows[0] });
    } catch (error) { next(error); }
});

module.exports = router;
