// ================================================================
// RUTAS DE ENVÍOS - /api/envios (historial de lo enviado a SIESA)
// ================================================================
const express = require('express');
const { param, query } = require('express-validator');
const { verificarToken, requiereRol } = require('../middleware/autenticacion');
const validar = require('../middleware/validar');
const AppError = require('../utilidades/AppError');
const envios = require('../servicios/envios');
const auditoria = require('../servicios/auditoria');

const router = express.Router();
router.use(verificarToken);

const numeroVenta = param('venta').matches(/^\d{6,30}$/).withMessage('Número de venta inválido');

// GET /api/envios?estado=&buscar=
router.get('/', [
    query('estado').optional({ values: 'falsy' }).isIn(['enviando', 'importado', 'rechazado', 'error']),
    query('buscar').optional().trim().isLength({ max: 60 }),
], validar, async (req, res, next) => {
    try {
        res.json({ exito: true, envios: await envios.historial({ estado: req.query.estado, buscar: req.query.buscar }) });
    } catch (error) { next(error); }
});

// GET /api/envios/:venta  (incluye los documentos enviados y la respuesta de SIESA)
router.get('/:venta', [numeroVenta], validar, async (req, res, next) => {
    try {
        const envio = await envios.detalle(req.params.venta);
        if (!envio) throw new AppError('Esa venta no se ha enviado.', 404);
        res.json({ exito: true, envio });
    } catch (error) { next(error); }
});

// POST /api/envios/:venta/liberar
// Para ventas que quedaron 'enviando' (SIESA no respondió o se cayó el servidor).
// Solo después de verificar en SIESA que el pedido NO quedó registrado.
router.post('/:venta/liberar', requiereRol('admin'), [numeroVenta], validar, async (req, res, next) => {
    try {
        if (!(await envios.liberar(req.params.venta))) {
            throw new AppError('Solo se pueden liberar ventas que estén en proceso de envío.', 409);
        }
        await auditoria.registrar(req.usuario.id, 'liberar_envio', 'venta', req.params.venta);
        res.json({ exito: true, mensaje: 'Venta liberada: ya se puede volver a enviar.' });
    } catch (error) { next(error); }
});

module.exports = router;
