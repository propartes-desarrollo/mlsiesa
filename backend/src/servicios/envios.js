// ================================================================
// REPOSITORIO DE ENVÍOS - una fila por venta de ML (llave: # de venta)
//
// Estados: enviando | importado | rechazado | error
// Una venta 'importado' nunca se reenvía. 'enviando' funciona como candado:
// solo un proceso puede reclamar la venta. Si el proceso se interrumpe a mitad
// (caída del servidor), la venta queda 'enviando' y un admin debe verificar en
// SIESA antes de liberarla: SIESA no devuelve el número del pedido creado, así
// que reintentar a ciegas podría duplicarlo.
// ================================================================
const { consulta } = require('./db');

async function obtener(ventas) {
    if (!ventas.length) return {};
    const { rows } = await consulta(
        `SELECT venta, estado, detalle, intentos, tercero_creado, actualizado_en
           FROM envios WHERE venta = ANY($1::text[])`, [ventas]);
    return Object.fromEntries(rows.map((r) => [r.venta, r]));
}

// Devuelve true si este proceso quedó a cargo de enviar la venta.
async function reclamar(venta, { cargueId, usuarioId }) {
    const { rowCount } = await consulta(
        `INSERT INTO envios (venta, estado, cargue_id, enviado_por, intentos)
              VALUES ($1, 'enviando', $2, $3, 1)
         ON CONFLICT (venta) DO UPDATE
               SET estado = 'enviando', cargue_id = EXCLUDED.cargue_id,
                   enviado_por = EXCLUDED.enviado_por, intentos = envios.intentos + 1
             WHERE envios.estado IN ('rechazado', 'error')`,
        [venta, cargueId, usuarioId]);
    return rowCount === 1;
}

async function finalizar(venta, r) {
    await consulta(
        `UPDATE envios SET estado = $2, detalle = $3, tercero_creado = tercero_creado OR $4,
                documento_pedido = $5, documento_tercero = COALESCE(NULLIF($6, ''), documento_tercero),
                respuesta = $7, resumen = $8
          WHERE venta = $1`,
        [venta, r.estado, r.detalle, Boolean(r.terceroCreado), r.documentoPedido || '',
            r.documentoTercero || '', r.respuesta || '', JSON.stringify(r.resumen || {})]);
}

async function liberar(venta) {
    const { rowCount } = await consulta(
        `UPDATE envios SET estado = 'error', detalle = 'Liberada por un administrador tras verificar en SIESA.'
          WHERE venta = $1 AND estado = 'enviando'`, [venta]);
    return rowCount === 1;
}

async function historial({ estado, buscar, limite = 200 }) {
    const { rows } = await consulta(
        `SELECT e.venta, e.estado, e.detalle, e.intentos, e.tercero_creado, e.resumen,
                e.creado_en, e.actualizado_en, c.archivo, u.nombre AS enviado_por
           FROM envios e
           LEFT JOIN cargues c ON c.id = e.cargue_id
           LEFT JOIN usuarios u ON u.id = e.enviado_por
          WHERE ($1::text IS NULL OR e.estado = $1)
            AND ($2::text IS NULL OR e.venta ILIKE '%' || $2 || '%'
                 OR e.resumen->>'comprador' ILIKE '%' || $2 || '%'
                 OR e.resumen->>'documento' ILIKE '%' || $2 || '%')
          ORDER BY e.actualizado_en DESC
          LIMIT $3`,
        [estado || null, buscar || null, limite]);
    return rows;
}

async function detalle(venta) {
    const { rows } = await consulta('SELECT * FROM envios WHERE venta = $1', [venta]);
    return rows[0] || null;
}

module.exports = { obtener, reclamar, finalizar, liberar, historial, detalle };
