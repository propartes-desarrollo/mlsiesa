// Lectura de los reportes reales de ML, documentos generados y flujo de envío con SIESA simulado.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const excelMl = require('../src/servicios/excelMl');
const documentos = require('../src/servicios/siesa/documentos');
const dane = require('../src/servicios/dane');
const proceso = require('../src/servicios/procesoVentas');
const parametros = require('../src/servicios/parametros');
const soapReal = require('../src/servicios/siesa/clienteSoap');
const L = require('../src/servicios/siesa/layouts');
const { campo } = require('../src/servicios/siesa/plano');

const FIX = path.join(__dirname, 'fixtures');
const archivo = (prefijo) => path.join(FIX, fs.readdirSync(FIX).find((f) => f.startsWith(prefijo)));
const R0928 = archivo('reporte_ml_2026-09-28');
const R1001 = archivo('reporte_ml_2026-10-01');   // reporte real (anonimizado) de referencia

const cfgBase = () => {
    const cfg = parametros.armar();
    cfg.siesa.clave = 'x';
    return cfg;
};

describe('lectura del reporte', () => {
    test('reporte 2026-09-28', async () => {
        const ventas = await excelMl.leer(R0928);
        assert.equal(ventas.length, 13);
        const v = ventas[0];
        assert.equal(v.numero, '2000018670875084');
        const f = new Date(v.fecha);
        assert.deepEqual([f.getFullYear(), f.getMonth() + 1, f.getDate(), f.getHours(), f.getMinutes()], [2026, 9, 27, 16, 14]);
        assert.equal(v.comprador.tipoDoc, 'C');
        assert.equal(v.comprador.documento, '1000007919');
        assert.equal(v.items[0].sku, 'LM21119');
        assert.equal(v.items[0].precioIva, 28600);
        assert.equal(v.fleteIva, 15500);
        assert.deepEqual([v.comprador.ciudadFact, v.comprador.deptoFact], ['Jamundí', 'Valle Del Cauca']);
        const ce = ventas.find((x) => x.numero === '2000015221725717');
        assert.equal(ce.comprador.tipoDoc, 'E');
        assert.equal(ce.items[0].cantidad, 2);
        assert.equal(ce.items[0].precioIva, 52300);
        assert.ok(ventas.every((x) => !x.bloqueos.length));
    });

    test('el paquete de 2 productos se agrupa en una sola venta', async () => {
        const ventas = await excelMl.leer(R1001);
        assert.equal(ventas.length, 27);
        const paq = ventas.find((v) => v.numero === '2000015278341543');
        assert.deepEqual(paq.items.map((i) => i.sku), ['LM20561', 'LM23224']);
        assert.equal(paq.comprador.documento, '1000190056');
        assert.equal(paq.estado, 'En camino');
        assert.deepEqual(paq.bloqueos, []);
        assert.deepEqual(paq.alertas, []);
        assert.ok(!ventas.some((v) => v.numero === '2000018718162770'));
    });

    test('estados excluidos bloquean el envío', async () => {
        const ventas = await excelMl.leer(R0928, ['etiqueta lista']);
        assert.equal(ventas.filter((v) => v.bloqueos.length).length, 12);
    });

    test('archivo que no es el reporte', async () => {
        await assert.rejects(excelMl.leer(Buffer.from('no soy un excel')), /No se pudo abrir/);
    });
});

describe('documentos', () => {
    test('pedido 0430/0431 de una venta con flete', async () => {
        const v = (await excelMl.leer(R0928))[0];
        const lineas = documentos.pedidoLineas(v, cfgBase());
        assert.deepEqual(lineas.map((l) => l.slice(7, 11)), ['0000', '0430', '0431', '0431', '9999']);
        assert.deepEqual(documentos.verificarLargos(lineas), []);
        const enc = lineas[1];
        assert.equal(campo(L.L430, enc, 'f430_id_tercero_fact').trim(), '1000007919');
        assert.equal(campo(L.L430, enc, 'f430_num_docto_referencia'), '000018670875084');
        assert.equal(campo(L.L430, enc, 'f430_id_tercero_vendedor').trim(), 'VEN0600');
        assert.equal(campo(L.L430, enc, 'f430_id_fecha'), '20260927');
        assert.ok(enc.includes('Venta Mercado Libre #2000018670875084'));
        assert.equal(campo(L.L431, lineas[2], 'f431_referencia_item').trim(), 'LM21119');
        assert.equal(campo(L.L431, lineas[2], 'f431_precio_unitario'), '000000000024034.0000');
        assert.equal(campo(L.L431, lineas[2], 'f431_ind_backorder'), '5');
        assert.equal(campo(L.L431, lineas[3], 'f431_referencia_item').trim(), 'FLETE');
        assert.equal(campo(L.L431, lineas[3], 'f431_precio_unitario'), '000000000013026.0000');
        assert.equal(Number(lineas.at(-1).slice(0, 7)), lineas.length);
    });

    test('tercero 0200/0201/0046/0047', async () => {
        const v = (await excelMl.leer(R0928))[0];
        const cfg = cfgBase();
        const d = documentos.datosTercero(v, cfg);
        assert.deepEqual([d.nombres, d.apellido1, d.apellido2], ['Carlos Andres', 'Rodriguez', 'Hernandez']);
        assert.deepEqual([d.depto, d.ciudad], ['76', '364']);
        assert.equal(d.direccion, 'Calle 11, 1-21, Simón bolivar');
        const lineas = documentos.terceroLineas(v, cfg);
        assert.deepEqual(lineas.map((l) => l.slice(7, 11)), ['0000', '0200', '0201', '0046', '0046', '0047', '0047', '0047', '9999']);
        assert.deepEqual(documentos.verificarLargos(lineas), []);
        assert.equal(campo(L.L201, lineas[2], 'F201_ID_VENDEDOR'), '0600');
        assert.equal(campo(L.L201, lineas[2], 'f201_id_cobrador'), '0600');
        assert.equal(campo(L.L200, lineas[1], 'F200_ID_TIPO_IDENT'), 'C');
    });

    test('las 40 ventas de los dos reportes quedan listas', async () => {
        const cfg = cfgBase();
        for (const r of [R0928, R1001]) {
            for (const v of await excelMl.leer(r)) {
                const pv = proceso.vistaPrevia(v, cfg);
                assert.equal(pv.estado, 'lista', `${v.numero}: ${pv.bloqueos.join(' ')}`);
            }
        }
    });

    test('códigos DANE', () => {
        assert.deepEqual(dane.resolver('Suba', 'Bogotá D.C.'), ['11', '001']);
        assert.deepEqual(dane.resolver('Cartagena De Indias', 'Bolivar'), ['13', '001']);
        assert.deepEqual(dane.resolver('Girón', 'Santander'), ['68', '307']);
        assert.deepEqual(dane.resolver('Inventado', 'Antioquia'), ['', '']);
        assert.deepEqual(dane.resolver('Inventado', 'Antioquia', { '05': { inventado: '999' } }), ['05', '999']);
    });

    test('respuesta SOAP de consulta', () => {
        const xml = '<diffgr:diffgram><NewDataSet><Resultado><tercero_id>123</tercero_id><sucursal>001</sucursal>'
            + '<estado_activo>1</estado_activo></Resultado></NewDataSet></diffgr:diffgram>';
        assert.deepEqual(soapReal.filas(xml), [{ tercero_id: '123', sucursal: '001', estado_activo: '1' }]);
    });
});

// ── Envío con SIESA y repositorio simulados ───────────────────────
function entorno({ tercero = 'activo', pedido = '0', terceroImport = '0' } = {}) {
    const filas = {};
    const llamadas = [];
    const repo = {
        async obtener(ventas) { return Object.fromEntries(ventas.filter((v) => filas[v]).map((v) => [v, filas[v]])); },
        async reclamar(venta) {
            const f = filas[venta];
            if (f && !['rechazado', 'error'].includes(f.estado)) return false;
            filas[venta] = { ...(f || { intentos: 0 }), estado: 'enviando', intentos: (f?.intentos || 0) + 1 };
            return true;
        },
        async finalizar(venta, r) { Object.assign(filas[venta], r); },
    };
    const simulado = { tercero, pedido, terceroImport };
    const soap = {
        ErrorSiesa: soapReal.ErrorSiesa,
        documento: soapReal.documento,
        async consultarTercero(doc) { llamadas.push(['consulta', doc]); return { estado: simulado.tercero, mensaje: '', tercero: null }; },
        async importar(lineas) {
            const tipo = lineas[1].slice(7, 11);
            llamadas.push(['importar', tipo]);
            const cod = tipo === '0200' ? simulado.terceroImport : simulado.pedido;
            if (cod === 'red') throw new soapReal.ErrorSiesa('sin red');
            if (cod === 'timeout') throw new soapReal.ErrorSiesa('SIESA no respondió', { incierto: true });
            return { codigo: cod, exito: cod === '0', mensaje: 'x', respuesta: '' };
        },
    };
    const cfg = cfgBase();
    Object.assign(cfg.envio, { activo: true, validar_tercero: true, crear_tercero: true });
    return { filas, llamadas, deps: { repo, soap }, cfg, simulado };
}

describe('envío', async () => {
    const venta = (await excelMl.leer(R0928))[0];
    const ctx = { cargueId: 'c1', usuarioId: 'u1' };

    test('tercero activo: importa el pedido y no lo reenvía', async () => {
        const e = entorno();
        assert.equal((await proceso.enviar(venta, e.cfg, ctx, e.deps)).estado, 'enviada');
        assert.deepEqual(e.llamadas, [['consulta', '1000007919'], ['importar', '0430']]);
        const fila = e.filas[venta.numero];
        assert.equal(fila.estado, 'importado');
        assert.ok(fila.documentoPedido.includes('<Clave>********</Clave>'));
        const r2 = await proceso.enviar(venta, e.cfg, ctx, e.deps);
        assert.equal(r2.estado, 'enviada');
        assert.equal(e.llamadas.length, 2);
    });

    test('crea el tercero si no existe', async () => {
        const e = entorno({ tercero: 'no_existe' });
        assert.equal((await proceso.enviar(venta, e.cfg, ctx, e.deps)).estado, 'enviada');
        assert.deepEqual(e.llamadas.map((l) => l[1]), ['1000007919', '0200', '0430']);
        assert.equal(e.filas[venta.numero].terceroCreado, true);
    });

    test('no crea el tercero si está desactivado', async () => {
        const e = entorno({ tercero: 'no_existe' });
        e.cfg.envio.crear_tercero = false;
        assert.equal((await proceso.enviar(venta, e.cfg, ctx, e.deps)).estado, 'con_error');
        assert.equal(e.llamadas.length, 1);
    });

    test('un rechazo permite reintentar', async () => {
        const e = entorno({ pedido: '1' });
        assert.equal((await proceso.enviar(venta, e.cfg, ctx, e.deps)).estado, 'rechazada');
        e.simulado.pedido = '0';
        assert.equal((await proceso.enviar(venta, e.cfg, ctx, e.deps)).estado, 'enviada');
        assert.equal(e.filas[venta.numero].intentos, 2);
    });

    test('falla de red: error reintentable', async () => {
        const e = entorno({ pedido: 'red' });
        const r = await proceso.enviar(venta, e.cfg, ctx, e.deps);
        assert.equal(r.estado, 'con_error');
        assert.match(r.mensaje, /sin red/);
    });

    test('tiempo agotado: queda en proceso y no se puede reenviar', async () => {
        const e = entorno({ pedido: 'timeout' });
        const r = await proceso.enviar(venta, e.cfg, ctx, e.deps);
        assert.equal(r.estado, 'en_proceso');
        assert.match(r.mensaje, /verificar en SIESA/);
        e.simulado.pedido = '0';
        assert.equal((await proceso.enviar(venta, e.cfg, ctx, e.deps)).estado, 'en_proceso');
        assert.equal(e.llamadas.filter((l) => l[0] === 'importar').length, 1);
    });

    test('tercero inactivo bloquea el pedido', async () => {
        const e = entorno({ tercero: 'inactivo' });
        assert.equal((await proceso.enviar(venta, e.cfg, ctx, e.deps)).estado, 'con_error');
        assert.ok(!e.llamadas.some((l) => l[1] === '0430'));
    });
});
