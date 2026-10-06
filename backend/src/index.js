// ================================================================
// PUNTO DE ENTRADA - API Express
// ================================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./servicios/logger');
const manejadorErrores = require('./middleware/errores');
const AppError = require('./utilidades/AppError');

const app = express();
const PUERTO = process.env.PUERTO || 3001;

// CORS solo se restringe en producción (en local todo es mismo origen vía proxy)
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || process.env.ENTORNO !== 'production') return cb(null, true);
        const permitidos = [process.env.URL_FRONTEND].filter(Boolean);
        return permitidos.includes(origin) ? cb(null, true) : cb(new AppError('No permitido por CORS', 403));
    },
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => { logger.info(`${req.method} ${req.path}`); next(); });

app.get('/api/salud', (req, res) => res.json({
    estado: 'ok',
    entorno: process.env.ENTORNO || 'development',
    timestamp: new Date().toISOString(),
}));

// Módulos de ruta (registrar aquí cada nuevo dominio)
app.use('/api/auth', require('./rutas/autenticacion'));
app.use('/api/ventas-ml', require('./rutas/ventasMl'));
app.use('/api/envios', require('./rutas/envios'));
app.use('/api/parametros', require('./rutas/parametros'));
app.use('/api/usuarios', require('./rutas/usuarios'));

// 404 - catch-all (compatible con Express 5: middleware final sin ruta)
app.use((req, res, next) => next(new AppError(`No se encontró la ruta: ${req.originalUrl}`, 404)));
app.use(manejadorErrores);

// En pruebas se importa la app sin abrir el puerto.
if (require.main === module) app.listen(PUERTO, () => logger.info(`Servidor mlsiesa corriendo en el puerto ${PUERTO} (${process.env.ENTORNO || 'development'})`));

module.exports = app;
