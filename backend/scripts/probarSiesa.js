// ================================================================
// PRUEBA CONTRA SIESA con un reporte de Mercado Libre, sin pasar por la app.
//
//   node scripts/probarSiesa.js <reporte.xlsx>              solo consultas (lectura)
//   node scripts/probarSiesa.js <reporte.xlsx> --importar N  además importa el pedido
//                                                            de la venta N (# de venta)
//
// Las consultas (CONSULTA_ITEM_ML, CONSULTA_TERCERO_ECOMMERCE) no escriben nada.
// --importar ESCRIBE en el ERP de la conexión configurada (SIESA_CONEXION): un solo
// pedido, y solo si su comprador ya existe y todos sus ítems tienen centro de costo.
// Usa los parámetros por defecto (no los guardados en la BD).
// ================================================================
require('dotenv').config();
const excelMl = require('../src/servicios/excelMl');
const parametros = require('../src/servicios/parametros');
const documentos = require('../src/servicios/siesa/documentos');
const soap = require('../src/servicios/siesa/clienteSoap');

async function main() {
    const [archivo, bandera, ventaImportar] = process.argv.slice(2);
    if (!archivo || (bandera && (bandera !== '--importar' || !ventaImportar))) {
        console.error('Uso: node scripts/probarSiesa.js <reporte.xlsx> [--importar <# de venta>]');
        process.exit(1);
    }
    const cfg = parametros.armar();
    if (!cfg.siesa.clave) {
        console.error('Falta SIESA_CLAVE en backend/.env');
        process.exit(1);
    }
    console.log(`Conexión: ${cfg.siesa.conexion} · usuario ${cfg.siesa.usuario}`);

    const ventas = await excelMl.leer(archivo, cfg.ml.estados_excluidos);
    const ccostos = {};
    for (const sku of [...new Set(ventas.flatMap((v) => v.items.map((it) => it.sku)).filter(Boolean))]) {
        const r = await soap.consultarItem(sku, cfg.siesa);
        if (r.estado === 'ok') ccostos[sku] = r.ccosto;
        console.log(`Ítem ${sku.padEnd(14)} ${r.estado.padEnd(11)} ${r.ccosto || r.mensaje}`);
    }

    const terceros = {};
    for (const v of ventas) {
        const doc = v.comprador.documento;
        if (!doc || terceros[doc]) continue;
        terceros[doc] = await soap.consultarTercero(doc, cfg.siesa);
    }

    console.log('\nVenta              Logística  Bodega  Tercero      Bloqueos');
    for (const v of ventas) {
        const t = terceros[v.comprador.documento];
        console.log(`${v.numero}  ${(v.logistica || '-').padEnd(9)}  ${(documentos.bodega(v, cfg) || '-').padEnd(6)}  ${(t?.estado || '-').padEnd(11)}  ${v.bloqueos.join(' ')}`);
    }

    if (bandera !== '--importar') return;
    const v = ventas.find((x) => x.numero === ventaImportar);
    if (!v) throw new Error(`La venta ${ventaImportar} no está en el reporte.`);
    const faltan = v.items.filter((it) => !ccostos[it.sku]).map((it) => it.sku);
    if (v.bloqueos.length || faltan.length || terceros[v.comprador.documento]?.estado !== 'activo') {
        throw new Error(`No se importa ${v.numero}: bloqueos [${v.bloqueos.join(' ')}], ítems sin centro de costo [${faltan.join(', ')}], tercero ${terceros[v.comprador.documento]?.estado}.`);
    }
    const lineas = documentos.pedidoLineas(v, cfg, ccostos);
    const errores = documentos.verificarLargos(lineas);
    if (errores.length) throw new Error(errores.join(' '));
    console.log(`\nNotas: ${documentos.notas(v)}`);
    const r = await soap.importar(lineas, cfg.siesa);
    console.log(`ImportarXML venta ${v.numero}: printTipoError=${r.codigo} (${r.mensaje})`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
