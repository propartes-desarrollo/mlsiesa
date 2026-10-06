// El generador debe reproducir carácter a carácter el ejemplo de TI que SÍ importa en SIESA.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const P = require('../src/servicios/siesa/plano');
const L = require('../src/servicios/siesa/layouts');

const TI = fs.readFileSync(path.join(__dirname, 'fixtures', 'ejemplo_ti_lineas.txt'), 'utf8').trim().split('\n');

test('largos de los layouts', () => {
    for (const [k, lay] of [['0430', L.L430], ['0431', L.L431], ['0432', L.L432], ['0200', L.L200],
        ['0201', L.L201], ['0207', L.L207], ['0046', L.L046]]) {
        assert.equal(P.largo(lay), L.LARGOS[k], k);
    }
});

test('registros de control del ejemplo de TI', () => {
    assert.equal(P.control(1, 0, 1), TI[0]);
    assert.equal(P.control(6, 9999, 1), TI[5]);
});

test('encabezado 0430 del ejemplo de TI', () => {
    const linea = P.registro(L.L430, {
        'F_NUMERO-REG': 2, 'F_TIPO-REG': 430, F_SUBTIPO_REG: 0, 'F_VERSION-REG': 4, F_CIA: 1,
        F_LIQUIDA_IMPUESTO: 1, F_CONSEC_AUTO_REG: 1, F_IND_CONTACTO: 1,
        f430_id_co: '021', f430_id_tipo_docto: 'VPV', f430_consec_docto: 0,
        f430_id_fecha: '20250321', f430_id_clase_docto: 502, f430_ind_estado: 2,
        f430_ind_backorder: 0, f430_id_tercero_fact: '16845644', f430_id_sucursal_fact: '001',
        f430_id_tercero_rem: '16845644', f430_id_sucursal_rem: '001', f430_id_co_fact: '021',
        f430_fecha_entrega: '20250421', f430_num_dias_entrega: 0,
        f430_num_docto_referencia: '1234567890', f430_referencia: '1118135b2b',
        f430_id_moneda_docto: 'COP', f430_id_moneda_conv: 'USD', f430_tasa_conv: 1,
        f430_id_moneda_local: 'COP', f430_tasa_local: 1, f430_id_cond_pago: 'C09',
        f430_id_punto_envio: '000', f430_id_tercero_vendedor: '8603501708',
    });
    assert.equal(linea, TI[1]);
});

test('detalle 0431 del ejemplo de TI (ítem y flete)', () => {
    const base = {
        'F_TIPO-REG': 431, 'F_SUBTIPO-REG': 0, 'F_VERSION-REG': 4, F_CIA: 1,
        f431_id_co: '021', f431_id_tipo_docto: 'VPV', f431_id_bodega: 'BP150',
        f431_id_concepto: 501, f431_id_motivo: '01', f431_id_co_movto: '040',
        f431_fecha_entrega: '20250321', f431_num_dias_entrega: 2,
        f431_id_lista_precio: 'L04', f431_id_unidad_medida: 'UND',
        f431_ind_backorder: 5, f431_ind_precio: 2,
    };
    assert.equal(P.registro(L.L431, {
        ...base, 'F_NUMERO-REG': 3, f431_nro_registro: 1, f431_referencia_item: 'P750',
        f431_id_ccosto_movto: '5051', f431_cant_pedida_base: 11, f431_precio_unitario: 68200,
    }), TI[2]);
    assert.equal(P.registro(L.L431, {
        ...base, 'F_NUMERO-REG': 4, f431_nro_registro: 2, f431_referencia_item: 'FLETE',
        f431_id_ccosto_movto: '5059', f431_cant_pedida_base: 1, f431_precio_unitario: 60000,
    }), TI[3]);
});

test('primitivas de campo', () => {
    assert.equal(P.d(11, 20), '000000000000011.0000');
    assert.equal(P.d(1, 13), '00000001.0000');
    assert.equal(P.d(19.33, 8), '019.3300');
    assert.equal(P.n('VEN0600', 4), '0600');
    assert.equal(P.a('Andrés Gómez', 14), 'Andres Gomez  ');
    assert.equal(P.a('línea\ncon salto', 16), 'linea con salto ');
    assert.equal(P.a('Peña 😀', 8), 'Pena    ');
    assert.equal(P.ceilPesos(28600 / 1.19), 24034);
    assert.equal(P.ceilPesos(119000 / 1.19), 100000);   // sin falsos redondeos por coma flotante
});
