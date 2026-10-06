// ================================================================
// RUTAS DE PARÁMETROS - /api/parametros
// Valores del documento SIESA (CO, tipo de documento, lista de precios...)
// y municipios adicionales. Solo el admin los cambia.
// ================================================================
const express = require('express');
const { body, param } = require('express-validator');
const { consulta } = require('../servicios/db');
const { verificarToken, requiereRol } = require('../middleware/autenticacion');
const validar = require('../middleware/validar');
const AppError = require('../utilidades/AppError');
const parametros = require('../servicios/parametros');
const dane = require('../servicios/dane');
const auditoria = require('../servicios/auditoria');

const router = express.Router();
router.use(verificarToken);

// GET /api/parametros/estado  - resumen para la barra superior (todos los roles)
router.get('/estado', async (req, res, next) => {
    try {
        const cfg = await parametros.cargar();
        res.json({
            exito: true,
            estado: {
                envioActivo: cfg.envio.activo,
                conexion: cfg.siesa.conexion,
                usuarioSiesa: cfg.siesa.usuario,
                claveConfigurada: Boolean(cfg.siesa.clave),
                validarTercero: cfg.envio.validar_tercero,
                crearTercero: cfg.envio.crear_tercero,
                emailRespaldo: Boolean(cfg.tercero.email_respaldo),
            },
        });
    } catch (error) { next(error); }
});

// GET /api/parametros
router.get('/', requiereRol('admin', 'operador'), async (req, res, next) => {
    try {
        res.json({ exito: true, parametros: await parametros.listar() });
    } catch (error) { next(error); }
});

// PUT /api/parametros/:clave  { valor }
router.put('/:clave', requiereRol('admin'), [param('clave').isString(), body('valor').exists()], validar,
    async (req, res, next) => {
        try {
            const def = parametros.definicion(req.params.clave);
            if (!def) throw new AppError('Parámetro inexistente.', 404);
            const [clave, , tipo] = def;
            let valor = req.body.valor;
            if (tipo === 'numero' && !Number.isFinite(Number(valor))) throw new AppError('El valor debe ser numérico.', 400);
            if (tipo === 'booleano') valor = parametros.convertir(valor, 'booleano');
            if (tipo === 'lista') valor = parametros.convertir(valor, 'lista').join(',');
            if (tipo === 'texto') {
                valor = String(valor ?? '').trim();
                if (valor.length > 255) throw new AppError('Valor demasiado largo.', 400);
            }

            const { rows } = await consulta('SELECT valor FROM parametros WHERE clave = $1', [clave]);
            await consulta(
                `INSERT INTO parametros (clave, valor, actualizado_por) VALUES ($1, $2, $3)
                 ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_por = EXCLUDED.actualizado_por`,
                [clave, String(valor), req.usuario.id]);
            await auditoria.registrar(req.usuario.id, 'cambiar_parametro', 'parametro', clave, {
                antes: rows[0]?.valor ?? null, despues: String(valor),
            });
            res.json({ exito: true, parametros: await parametros.listar() });
        } catch (error) { next(error); }
    });

// DELETE /api/parametros/:clave  - vuelve al valor por defecto
router.delete('/:clave', requiereRol('admin'), async (req, res, next) => {
    try {
        const { rows } = await consulta('DELETE FROM parametros WHERE clave = $1 RETURNING valor', [req.params.clave]);
        if (rows[0]) await auditoria.registrar(req.usuario.id, 'restaurar_parametro', 'parametro', req.params.clave, { antes: rows[0].valor });
        res.json({ exito: true, parametros: await parametros.listar() });
    } catch (error) { next(error); }
});

// ── Municipios adicionales ──────────────────────────────────────

// GET /api/parametros/municipios
router.get('/municipios', async (req, res, next) => {
    try {
        const { rows } = await consulta('SELECT cod_depto, nombre, cod_ciudad, creado_en FROM municipios ORDER BY cod_depto, nombre');
        res.json({ exito: true, municipios: rows, departamentos: dane.DEPTOS });
    } catch (error) { next(error); }
});

// POST /api/parametros/municipios  { departamento, nombre, codCiudad }
router.post('/municipios', requiereRol('admin'), [
    body('departamento').trim().notEmpty().withMessage('Departamento requerido'),
    body('nombre').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre del municipio requerido'),
    body('codCiudad').matches(/^\d{3}$/).withMessage('El código de ciudad son 3 dígitos (DANE)'),
], validar, async (req, res, next) => {
    try {
        const codDepto = dane.DEPTOS[dane.normalizar(req.body.departamento)] || (/^\d{2}$/.test(req.body.departamento) ? req.body.departamento : null);
        if (!codDepto) throw new AppError('Departamento no reconocido.', 400);
        await consulta(
            `INSERT INTO municipios (cod_depto, nombre_normalizado, nombre, cod_ciudad) VALUES ($1, $2, $3, $4)
             ON CONFLICT (cod_depto, nombre_normalizado) DO UPDATE SET nombre = EXCLUDED.nombre, cod_ciudad = EXCLUDED.cod_ciudad`,
            [codDepto, dane.normalizar(req.body.nombre), req.body.nombre.trim(), req.body.codCiudad]);
        await auditoria.registrar(req.usuario.id, 'guardar_municipio', 'municipio', `${codDepto}-${req.body.codCiudad}`, { nombre: req.body.nombre });
        res.status(201).json({ exito: true });
    } catch (error) { next(error); }
});

module.exports = router;
