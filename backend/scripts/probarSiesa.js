// ================================================================
// PRUEBA CONTRA SIESA con un reporte de Mercado Libre, sin pasar por la app.
//
//   node scripts/probarSiesa.js <reporte.xlsx>              solo consultas (lectura)
//   node scripts/probarSiesa.js <reporte.xlsx> --importar N  además importa el pedido
//                                                            de la venta N (# de venta)
//   node scripts/probarSiesa.js <reporte.xlsx> --crear-tercero N DOC [--enviar]
//        arma el tercero (0200/0201/0046/0047) con la dirección del comprador de la venta N,
//        un nombre ficticio y el documento de prueba DOC. Sin --enviar solo lo muestra; con --enviar
//        lo importa (si DOC no existe en SIESA) y lo vuelve a consultar.
//   node scripts/probarSiesa.js <reporte.xlsx> --pedido N    consulta el pedido de la
//                                                            venta N en SIESA
//
// Las consultas (CONSULTA_ITEM_ML, CONSULTA_TERCERO_ECOMMERCE, CONSULTA_PEDIDO_ML) no
// escriben nada. --importar y --crear-tercero --enviar ESCRIBEN en el ERP de la
// conexión configurada (SIESA_CONEXION) y se niegan a correr fuera de Pruebas.
// --importar envía un solo pedido, y solo si su comprador ya existe y todos sus ítems
// tienen centro de costo.
// Usa los parámetros por defecto (no los guardados en la BD).
// ================================================================
require('dotenv').config();
const excelMl = require('../src/servicios/excelMl');
const parametros = require('../src/servicios/parametros');
const documentos = require('../src/servicios/siesa/documentos');
const soap = require('../src/servicios/siesa/clienteSoap');

async function main() {
    const [archivo, bandera, ventaImportar, docPrueba, enviarTercero] = process.argv.slice(2);
    const valido = !bandera || (bandera === '--importar' && ventaImportar) || (bandera === '--pedido' && ventaImportar)
        || (bandera === '--crear-tercero' && ventaImportar && /^\d{5,15}$/.test(docPrueba || ''));
    if (!archivo || !valido) {
        console.error('Uso: node scripts/probarSiesa.js <reporte.xlsx> [--importar <venta> | --pedido <venta> | --crear-tercero <venta> <documento> [--enviar]]');
        process.exit(1);
    }
    const cfg = parametros.armar();
    if (!cfg.siesa.clave) {
        console.error('Falta SIESA_CLAVE en backend/.env');
        process.exit(1);
    }
    console.log(`Conexión: ${cfg.siesa.conexion} · usuario ${cfg.siesa.usuario}`);
    const escribe = bandera === '--importar' || (bandera === '--crear-tercero' && enviarTercero === '--enviar');
    if (escribe && cfg.siesa.conexion !== 'Pruebas') throw new Error('Este script solo escribe en la conexión Pruebas.');

    const ventas = await excelMl.leer(archivo, cfg.ml.estados_excluidos);
    if (bandera === '--pedido') return mostrarPedido(ventaImportar, cfg);
    if (bandera === '--crear-tercero') return crearTercero(ventas, ventaImportar, docPrueba, enviarTercero === '--enviar', cfg);

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
    if (r.exito) await mostrarPedido(v.numero, cfg);
}

async function mostrarPedido(venta, cfg) {
    const r = await soap.consultarPedido(documentos.referenciaMl(venta), cfg.siesa);
    if (r.estado !== 'encontrado') { console.log(`Pedido de la venta ${venta}: ${r.estado} ${r.mensaje}`); return; }
    for (const p of r.pedidos) {
        console.log(`Pedido ${p.numero} (CO ${p.co}) · ${p.fecha} · ${p.estadoTexto} · cliente ${p.tercero} ${p.terceroNombre}`);
        console.log(`  Notas: ${p.notas}`);
        for (const l of p.lineas) console.log(`  ${l.item.padEnd(14)} ${l.bodega.padEnd(6)} ${String(l.cantidad).padStart(4)} x ${l.precioUnitario}  IVA ${l.vlrImp}  total ${l.vlrNeto}`);
        console.log(`  Total ${p.totalNeto} (IVA ${p.totalImp})`);
    }
}

async function crearTercero(ventas, numero, doc, enviar, cfg) {
    const v = ventas.find((x) => x.numero === numero);
    if (!v) throw new Error(`La venta ${numero} no está en el reporte.`);
    // Nombre ficticio: el documento es de prueba y no debe quedar asociado a un comprador real.
    // Dirección y ciudad sí son las del reporte, para probar el código DANE.
    const prueba = { ...v, comprador: { ...v.comprador, documento: doc, tipoDoc: 'C', juridica: false, nombre: 'Prueba Mlsiesa Tercero Ficticio' } };
    const d = documentos.datosTercero(prueba, cfg);
    console.log(`Tercero de prueba ${doc} (DV ${d.dv}): nombres "${d.nombres}" · apellidos "${d.apellido1}" "${d.apellido2}"`);
    console.log(`  Dirección "${d.direccion}" · ciudad ${d.depto}-${d.ciudad} · email "${d.email}" · teléfono "${d.telefono}"`);
    const lineas = documentos.terceroLineas(prueba, cfg);
    const errores = documentos.verificarLargos(lineas);
    if (errores.length) throw new Error(errores.join(' '));
    console.log(`  Registros: ${lineas.map((l) => l.slice(7, 11)).join(' ')}`);

    const antes = await soap.consultarTercero(doc, cfg.siesa);
    console.log(`Consulta antes: ${antes.estado} ${antes.mensaje}`);
    if (!enviar) { console.log('Sin --enviar: no se importa nada.'); return; }
    if (antes.estado !== 'no_existe' || antes.tercero) throw new Error(`El documento ${doc} ya existe en SIESA (${antes.estado}): use otro.`);

    const r = await soap.importar(lineas, cfg.siesa);
    console.log(`ImportarXML tercero ${doc}: printTipoError=${r.codigo} (${r.mensaje})`);
    const despues = await soap.consultarTercero(doc, cfg.siesa);
    console.log(`Consulta después: ${despues.estado} ${despues.mensaje}`);
    if (despues.tercero) console.log(`  ${JSON.stringify(despues.tercero)}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
