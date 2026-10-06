// ================================================================
// REPOSITORIO DE ENVÍOS - una fila por venta de ML (llave: # de venta)
//
// Estados: enviando | importado | rechazado | error
// Una venta 'importado' nunca se reenvía. 'enviando' funciona como candado:
// solo un proceso puede reclamar la venta. Si el proceso se interrumpe a mitad
// (caída del servidor), la venta queda 'enviando': ImportarXML no devuelve el
// número del pedido, así que reintentar a ciegas podría duplicarlo. Se resuelve
// consultando el pedido en SIESA (CONSULTA_PEDIDO_ML): si aparece, pasa a
// 'importado'; si no, un admin la libera.
//
// pedido_siesa guarda el pedido tal como quedó en SIESA (número y líneas).
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
                respuesta = $7, resumen = $8,
                pedido_siesa = COALESCE($9::jsonb, pedido_siesa),
                pedido_consultado_en = CASE WHEN $9::jsonb IS NULL THEN pedido_consultado_en ELSE NOW() END
          WHERE venta = $1`,
        [venta, r.estado, r.detalle, Boolean(r.terceroCreado), r.documentoPedido || '',
            r.documentoTercero || '', r.respuesta || '', JSON.stringify(r.resumen || {}),
            r.pedidoSiesa ? JSON.stringify(r.pedidoSiesa) : null]);
}

// Guarda el pedido consultado en SIESA. Si el pedido existe, la venta está en SIESA
// pase lo que pase con su estado anterior (p. ej. 'enviando' sin respuesta de
// ImportarXML): queda 'importado' y ya no se puede reenviar.
async function guardarPedido(venta, pedidoSiesa) {
    const { rows } = await consulta(
        `UPDATE envios
            SET pedido_siesa = $2::jsonb, pedido_consultado_en = NOW(),
                estado = 'importado',
                detalle = CASE WHEN estado <> 'importado'
                               THEN 'Pedido encontrado en SIESA al consultarlo: ' || ($2::jsonb->>'numero')
                               ELSE detalle END
          WHERE venta = $1
      RETURNING estado, detalle`,
        [venta, JSON.stringify(pedidoSiesa)]);
    return rows[0] || null;
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
                e.pedido_siesa->>'numero' AS pedido_numero,
                e.creado_en, e.actualizado_en, c.archivo, u.nombre AS enviado_por
           FROM envios e
           LEFT JOIN cargues c ON c.id = e.cargue_id
           LEFT JOIN usuarios u ON u.id = e.enviado_por
          WHERE ($1::text IS NULL OR e.estado = $1)
            AND ($2::text IS NULL OR e.venta ILIKE '%' || $2 || '%'
                 OR e.resumen->>'comprador' ILIKE '%' || $2 || '%'
                 OR e.resumen->>'documento' ILIKE '%' || $2 || '%'
                 OR e.pedido_siesa->>'numero' ILIKE '%' || $2 || '%')
          ORDER BY e.actualizado_en DESC
          LIMIT $3`,
        [estado || null, buscar || null, limite]);
    return rows;
}

async function detalle(venta) {
    const { rows } = await consulta('SELECT * FROM envios WHERE venta = $1', [venta]);
    return rows[0] || null;
}

module.exports = { obtener, reclamar, finalizar, guardarPedido, liberar, historial, detalle };
