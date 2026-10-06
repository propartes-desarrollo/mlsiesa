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
const parametros = require('../servicios/parametros');
const soap = require('../servicios/siesa/clienteSoap');
const { referenciaMl } = require('../servicios/siesa/documentos');

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

// POST /api/envios/:venta/consultar-siesa
// Busca el pedido en SIESA por su referencia (CONSULTA_PEDIDO_ML) y guarda número y
// líneas. Si aparece, la venta queda 'importado' aunque el envío no hubiera tenido
// respuesta: así se resuelven sin intervención los envíos que quedaron en verificación.
router.post('/:venta/consultar-siesa', requiereRol('admin', 'operador'), [numeroVenta], validar, async (req, res, next) => {
    try {
        if (!(await envios.detalle(req.params.venta))) throw new AppError('Esa venta no se ha enviado.', 404);
        const cfg = await parametros.cargar();
        if (!cfg.siesa.clave) throw new AppError('Falta la clave del conector SIESA en el servidor (SIESA_CLAVE).', 409);
        const r = await soap.consultarPedido(referenciaMl(req.params.venta), cfg.siesa);
        if (r.estado === 'desconocido') throw new AppError(`No se pudo consultar SIESA: ${r.mensaje}`, 502);
        if (r.estado === 'no_existe') {
            return res.json({ exito: true, encontrado: false, mensaje: 'SIESA no tiene un pedido con la referencia de esta venta.' });
        }
        const actualizado = await envios.guardarPedido(req.params.venta, r.pedidos[0]);
        await auditoria.registrar(req.usuario.id, 'consultar_pedido_siesa', 'venta', req.params.venta, { pedido: r.pedidos[0].numero, estado: actualizado?.estado });
        res.json({
            exito: true, encontrado: true, pedido: r.pedidos[0], duplicados: r.pedidos.length - 1,
            mensaje: r.pedidos.length > 1
                ? `Hay ${r.pedidos.length} pedidos en SIESA con la referencia de esta venta: revisar duplicados.`
                : `Pedido ${r.pedidos[0].numero} en SIESA.`,
        });
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
