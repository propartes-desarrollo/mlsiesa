// ================================================================
// REINTENTO AUTOMÁTICO de las ventas en espera de la DIAN
//
// Cada minuto busca las ventas 'espera_dian' a las que les llegó el proximo_intento y las
// vuelve a enviar con el mismo flujo del botón Enviar, a nombre de quien las envió. El
// flujo decide si sigue esperando o, cumplida la espera máxima, registra al comprador
// con cédula y deja el aviso.
// ================================================================
const { consulta } = require('./db');
const logger = require('./logger');
const parametros = require('./parametros');
const municipios = require('./municipios');
const envios = require('./envios');
const auditoria = require('./auditoria');
const proceso = require('./procesoVentas');
const soap = require('./siesa/clienteSoap');
const dian = require('./dian');

const CADA_MS = 60 * 1000;
let corriendo = false;

async function revisar() {
    if (corriendo) return;
    corriendo = true;
    try {
        const pendientes = await envios.pendientesDian();
        if (!pendientes.length) return;
        const [cfg, mapa] = await Promise.all([parametros.cargar(), municipios.mapa()]);
        // Con el envío apagado o sin clave no se envía nada: siguen en espera.
        if (!cfg.envio.activo || !cfg.siesa.clave) return;
        for (const p of pendientes) {
            const { rows } = await consulta('SELECT ventas FROM cargues WHERE id = $1', [p.cargue_id]);
            const venta = rows[0]?.ventas.find((v) => v.numero === p.venta);
            if (!venta) {
                logger.error(`Reintento DIAN: la venta ${p.venta} no está en su cargue ${p.cargue_id}.`);
                continue;
            }
            const r = await proceso.enviar(venta, cfg, { cargueId: p.cargue_id, usuarioId: p.enviado_por }, { repo: envios, soap, dian }, mapa);
            logger.info(`Reintento DIAN venta ${p.venta}: ${r.estado}`, { pasos: r.pasos });
            await auditoria.registrar(p.enviado_por, 'reenvio_automatico', 'venta', p.venta, {
                cargue: p.cargue_id, conexion: cfg.siesa.conexion, estado: r.estado, mensaje: r.mensaje, pasos: r.pasos,
            });
        }
    } catch (e) {
        logger.error(`Reintento DIAN: ${e.message}`);
    } finally {
        corriendo = false;
    }
}

function iniciar() {
    setInterval(revisar, CADA_MS).unref();
}

module.exports = { iniciar, revisar };
