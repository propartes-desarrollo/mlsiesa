// ================================================================
// RUTAS DE VENTAS ML - /api/ventas-ml
// Cargue del Excel de Mercado Libre, vista previa y envío de pedidos a SIESA.
// ================================================================
const express = require('express');
const multer = require('multer');
const { param, query } = require('express-validator');
const { consulta } = require('../servicios/db');
const { verificarToken, requiereRol } = require('../middleware/autenticacion');
const validar = require('../middleware/validar');
const AppError = require('../utilidades/AppError');
const excelMl = require('../servicios/excelMl');
const parametros = require('../servicios/parametros');
const municipios = require('../servicios/municipios');
const envios = require('../servicios/envios');
const proceso = require('../servicios/procesoVentas');
const documentos = require('../servicios/siesa/documentos');
const soap = require('../servicios/siesa/clienteSoap');
const auditoria = require('../servicios/auditoria');
const logger = require('../servicios/logger');

const router = express.Router();
router.use(verificarToken);

const subida = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, archivo, cb) => (/\.xlsx$/i.test(archivo.originalname)
        ? cb(null, true)
        : cb(new AppError('El archivo debe ser el Excel (.xlsx) que descarga Mercado Libre.', 400))),
});

const uuidCargue = param('id').isUUID().withMessage('Cargue inválido');
const numeroVenta = param('venta').matches(/^\d{6,30}$/).withMessage('Número de venta inválido');

async function obtenerCargue(id) {
    const { rows } = await consulta(
        `SELECT c.id, c.archivo, c.total_ventas, c.ventas, c.creado_en, u.nombre AS cargado_por
           FROM cargues c LEFT JOIN usuarios u ON u.id = c.cargado_por WHERE c.id = $1`, [id]);
    if (!rows[0]) throw new AppError('Cargue no encontrado.', 404);
    return rows[0];
}

// Vista previa con los parámetros y el estado de envío ACTUALES (no los del momento del cargue).
async function armarVista(cargue) {
    const [cfg, mapa] = await Promise.all([parametros.cargar(), municipios.mapa()]);
    const previos = await envios.obtener(cargue.ventas.map((v) => v.numero));
    const ventas = cargue.ventas.map((v) => proceso.vistaPrevia(v, cfg, previos[v.numero] || null, mapa));
    const sinCodigo = [...new Set(ventas.filter((v) => v.tercero && !v.tercero.depto)
        .map((v) => `${v.comprador.ciudad}, ${v.comprador.depto}`))].sort();
    return {
        cargue: { id: cargue.id, archivo: cargue.archivo, totalVentas: cargue.total_ventas, creadoEn: cargue.creado_en, cargadoPor: cargue.cargado_por },
        ventas,
        ciudadesSinCodigo: sinCodigo,
    };
}

// POST /api/ventas-ml/cargues  (multipart, campo "archivo")
router.post('/cargues', requiereRol('admin', 'usuario'), subida.single('archivo'), async (req, res, next) => {
    try {
        if (!req.file) throw new AppError('Adjunte el Excel de ventas de Mercado Libre.', 400);
        const cfg = await parametros.cargar();
        const ventas = await excelMl.leer(req.file.buffer, cfg.ml.estados_excluidos);
        if (!ventas.length) throw new AppError('El archivo no tiene ventas.', 422);

        const nombre = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const { rows } = await consulta(
            'INSERT INTO cargues (archivo, total_ventas, ventas, cargado_por) VALUES ($1, $2, $3, $4) RETURNING id',
            [nombre, ventas.length, JSON.stringify(ventas), req.usuario.id]);
        await auditoria.registrar(req.usuario.id, 'cargar_reporte', 'cargue', rows[0].id, { archivo: nombre, ventas: ventas.length });
        res.status(201).json({ exito: true, ...(await armarVista(await obtenerCargue(rows[0].id))) });
    } catch (error) { next(error); }
});

// GET /api/ventas-ml/cargues
router.get('/cargues', [query('limite').optional().isInt({ min: 1, max: 200 })], validar, async (req, res, next) => {
    try {
        const { rows } = await consulta(
            `SELECT c.id, c.archivo, c.total_ventas, c.creado_en, u.nombre AS cargado_por,
                    (SELECT COUNT(*) FROM envios e WHERE e.cargue_id = c.id AND e.estado = 'importado')::int AS importadas
               FROM cargues c LEFT JOIN usuarios u ON u.id = c.cargado_por
              ORDER BY c.creado_en DESC LIMIT $1`, [Number(req.query.limite) || 30]);
        res.json({ exito: true, cargues: rows });
    } catch (error) { next(error); }
});

// GET /api/ventas-ml/cargues/:id
router.get('/cargues/:id', [uuidCargue], validar, async (req, res, next) => {
    try {
        res.json({ exito: true, ...(await armarVista(await obtenerCargue(req.params.id))) });
    } catch (error) { next(error); }
});

// GET /api/ventas-ml/cargues/:id/ventas/:venta/documento?tipo=pedido|tercero
// El XML exacto que se enviaría, con la clave enmascarada.
router.get('/cargues/:id/ventas/:venta/documento', requiereRol('admin'),
    [uuidCargue, numeroVenta, query('tipo').optional().isIn(['pedido', 'tercero'])], validar,
    async (req, res, next) => {
        try {
            const cargue = await obtenerCargue(req.params.id);
            const venta = cargue.ventas.find((v) => v.numero === req.params.venta);
            if (!venta) throw new AppError('La venta no está en este cargue.', 404);
            if (venta.bloqueos.length) throw new AppError(`Esta venta no se puede enviar: ${venta.bloqueos.join(' ')}`, 409);
            const [cfg, mapa] = await Promise.all([parametros.cargar(), municipios.mapa()]);
            const lineas = req.query.tipo === 'tercero'
                ? documentos.terceroLineas(venta, cfg, null, mapa)
                : documentos.pedidoLineas(venta, cfg);
            res.json({ exito: true, documento: soap.documento(lineas, cfg.siesa, true) });
        } catch (error) { next(error); }
    });

// POST /api/ventas-ml/cargues/:id/ventas/:venta/enviar
// Una venta por petición: el frontend las recorre en orden y muestra el avance.
router.post('/cargues/:id/ventas/:venta/enviar', requiereRol('admin', 'usuario'),
    [uuidCargue, numeroVenta], validar, async (req, res, next) => {
        try {
            const [cfg, mapa] = await Promise.all([parametros.cargar(), municipios.mapa()]);
            if (!cfg.envio.activo) {
                throw new AppError('El envío a SIESA está apagado. Un administrador debe activarlo.', 409);
            }
            if (!cfg.siesa.clave) throw new AppError('La conexión con SIESA no está configurada. Avise al administrador.', 409);

            const cargue = await obtenerCargue(req.params.id);
            const venta = cargue.ventas.find((v) => v.numero === req.params.venta);
            if (!venta) throw new AppError('La venta no está en este cargue.', 404);

            const resultado = await proceso.enviar(venta, cfg, { cargueId: cargue.id, usuarioId: req.usuario.id }, { repo: envios, soap }, mapa);
            logger.info(`Envío venta ${venta.numero}: ${resultado.estado}`, { pasos: resultado.pasos });
            await auditoria.registrar(req.usuario.id, 'enviar_pedido', 'venta', venta.numero, {
                cargue: cargue.id, conexion: cfg.siesa.conexion, estado: resultado.estado, mensaje: resultado.mensaje, pasos: resultado.pasos,
            });
            res.json({ exito: true, venta: venta.numero, ...resultado });
        } catch (error) { next(error); }
    });

module.exports = router;
