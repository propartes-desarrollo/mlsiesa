// ================================================================
// PARÁMETROS DEL DOCUMENTO SIESA - valores por defecto + lo que guarde el admin
//
// Los valores por defecto son los de la tienda B2C (propartes-siesa-sync).
// Mercado Libre comparte algunos y difiere en otros: los marcados con
// confirmar: true hay que validarlos con TI y cambiarlos desde la pantalla
// de Parámetros (se guardan en la tabla `parametros`).
// La conexión a SIESA (endpoint, usuario, clave) NO va aquí: va en backend/.env.
// ================================================================
const { consulta } = require('./db');

// [clave, valor por defecto, tipo (texto|numero|booleano|lista), descripción, confirmar]
const DEFINICIONES = [
    // Envío
    ['envio.activo', false, 'booleano', 'Interruptor maestro. Apagado = solo revisión: ImportarXML escribe de verdad en el ERP.'],
    ['envio.validar_tercero', true, 'booleano', 'Consultar el comprador en SIESA antes de enviar el pedido.'],
    ['envio.crear_tercero', false, 'booleano', 'Si el comprador no existe, enviar antes el documento 0200/0201 (nunca probado en SIESA).', true],

    // Pedido (registros 0430 / 0431)
    ['pedido.version', '04', 'texto', 'Versión de los registros 0430/0431.'],
    ['pedido.co', '021', 'texto', 'Centro de operación (f430_id_co).', true],
    ['pedido.tipo_docto', 'PTV', 'texto', 'Tipo de documento (f430_id_tipo_docto).', true],
    ['pedido.clase_docto', '502', 'texto', 'Clase de documento: 502 = pedido directo.'],
    ['pedido.ind_estado', '2', 'texto', 'Estado del pedido: 2 = aprobado.'],
    ['pedido.ind_backorder', '1', 'texto', 'Backorder del encabezado.'],
    ['pedido.ind_backorder_linea', '5', 'texto', 'Backorder de la línea. SIESA solo aceptó 5 en Pruebas.'],
    ['pedido.sucursal', '001', 'texto', 'Sucursal del cliente a facturar.'],
    ['pedido.tipo_cli', '6000', 'texto', 'Tipo de cliente (f430_id_tipo_cli_fact).', true],
    ['pedido.cond_pago', 'C08', 'texto', 'Condición de pago (f430_id_cond_pago).', true],
    ['pedido.punto_envio', 'T01', 'texto', 'Punto de envío (f430_id_punto_envio).', true],
    ['pedido.vendedor', 'VEN0600', 'texto', 'Tercero vendedor MERCADO LIBRE (f430_id_tercero_vendedor).'],
    ['pedido.moneda', 'COP', 'texto', 'Moneda del documento.'],
    ['pedido.moneda_conv', 'USD', 'texto', 'Moneda de conversión (tasa 1; igual que la tienda).'],
    ['pedido.bodega', 'BP150', 'texto', 'Bodega (f431_id_bodega).', true],
    ['pedido.concepto', '501', 'texto', 'Concepto: 501 = ventas.'],
    ['pedido.motivo', '01', 'texto', 'Motivo (f431_id_motivo).'],
    ['pedido.co_movto', '040', 'texto', 'CO del movimiento (f431_id_co_movto).', true],
    ['pedido.ccosto', '5059', 'texto', 'Centro de costo de la mercancía. En SIESA va por ítem: este es el respaldo.', true],
    ['pedido.ccosto_flete', '5059', 'texto', 'Centro de costo del flete.', true],
    ['pedido.ref_flete', 'FLETE', 'texto', 'Referencia del ítem flete (vacío = no se envía el flete).'],
    ['pedido.lista_precio', 'L04', 'texto', 'Lista de precios (f431_id_lista_precio).', true],
    ['pedido.unidad', 'UND', 'texto', 'Unidad de medida.'],
    ['pedido.dias_entrega', 4, 'numero', 'Días de entrega.'],
    ['pedido.canal', 'ML', 'texto', 'Valor de f430_referencia para reconocer el origen.'],
    ['pedido.iva_pct', 19, 'numero', 'IVA para pasar a neto los precios de ML (vienen con IVA incluido).'],
    ['pedido.iva_flete_pct', 19, 'numero', 'IVA incluido en el valor del envío.'],
    ['pedido.enviar_impuestos', false, 'booleano', 'Enviar el registro 0432 de impuestos.'],
    ['pedido.llave_impuesto', '', 'texto', 'Llave de impuesto del 0432 (la asigna SIESA).', true],

    // Tercero (registros 0200 / 0201 / 0046 / 0047)
    ['tercero.sucursal', '001', 'texto', 'Sucursal del cliente nuevo.'],
    ['tercero.vendedor', '0600', 'texto', 'Código de vendedor MERCADO LIBRE (también cobrador).'],
    ['tercero.cond_pago', 'C08', 'texto', 'Condición de pago del cliente nuevo.', true],
    ['tercero.pais', '169', 'texto', 'País (Colombia).'],
    ['tercero.actualiza', '1', 'texto', 'F_ACTUALIZA_REG de los registros de impuestos/criterios.'],
    ['tercero.email_respaldo', '', 'texto', 'El reporte de ML no trae email: email a usar en el tercero (facturación electrónica).', true],
    ['tercero.telefono_respaldo', '', 'texto', 'El reporte de ML no trae teléfono.'],
    ['tercero.plan_division', 'S01', 'texto', 'Plan del criterio de división.'],
    ['tercero.division', '', 'texto', 'Criterio de división fijo para clientes ML (vacío = no se envía).', true],
    ['tercero.iva_natural', '1', 'texto', 'Clase IVA (0046-1) persona natural.'],
    ['tercero.ica_natural', '0', 'texto', 'Clase ICA (0046-2) persona natural.'],
    ['tercero.iva_juridica', '1', 'texto', 'Clase IVA (0046-1) empresa.'],
    ['tercero.ica_juridica', '0', 'texto', 'Clase ICA (0046-2) empresa.'],
    ['tercero.bloqueado', '1', 'texto', 'F201_IND_BLOQUEADO (en clientes reales va en 1 aun activos).'],
    ['tercero.bloqueo_cupo', '1', 'texto', 'F201_IND_BLOQUEO_CUPO.'],
    ['tercero.bloqueo_mora', '1', 'texto', 'F201_IND_BLOQUEO_MORA.'],

    // Mercado Libre
    ['ml.estados_excluidos', ['cancelada', 'devuelta', 'devolucion', 'reembolso', 'no concretada'], 'lista',
        'Estados del reporte que no se envían (comparación por contenido, sin tildes).'],
];

function convertir(valor, tipo) {
    if (tipo === 'booleano') return valor === true || valor === 'true' || valor === '1';
    if (tipo === 'numero') return Number(valor);
    if (tipo === 'lista') return Array.isArray(valor) ? valor : String(valor).split(',').map((s) => s.trim()).filter(Boolean);
    return valor === null || valor === undefined ? '' : String(valor);
}

// { envio: {...}, pedido: {...}, tercero: {...}, ml: {...}, siesa: {...} }
function armar(guardados = {}) {
    const cfg = {};
    for (const [clave, defecto, tipo] of DEFINICIONES) {
        const [grupo, nombre] = clave.split('.');
        cfg[grupo] = cfg[grupo] || {};
        cfg[grupo][nombre] = convertir(clave in guardados ? guardados[clave] : defecto, tipo);
    }
    cfg.siesa = {
        endpoint: process.env.SIESA_ENDPOINT || 'http://200.119.85.58:8080/WSUNOEE/WSUNOEE.asmx',
        conexion: process.env.SIESA_CONEXION || 'Pruebas',
        cia: process.env.SIESA_CIA || '1',
        usuario: process.env.SIESA_USUARIO || 'ia',
        clave: process.env.SIESA_CLAVE || '',
        proveedor: process.env.SIESA_PROVEEDOR || 'PROPARTES',
        consultaTerceros: process.env.SIESA_CONSULTA_TERCEROS || 'CONSULTA_TERCERO_ECOMMERCE',
        timeoutMs: Number(process.env.SIESA_TIMEOUT_MS || 180000),
    };
    return cfg;
}

async function cargar() {
    const { rows } = await consulta('SELECT clave, valor FROM parametros');
    return armar(Object.fromEntries(rows.map((r) => [r.clave, r.valor])));
}

// Para la pantalla de administración.
async function listar() {
    const { rows } = await consulta('SELECT clave, valor, actualizado_en FROM parametros');
    const guardados = Object.fromEntries(rows.map((r) => [r.clave, r]));
    return DEFINICIONES.map(([clave, defecto, tipo, descripcion, confirmar]) => ({
        clave, tipo, descripcion, confirmar: Boolean(confirmar),
        defecto: convertir(defecto, tipo),
        valor: convertir(guardados[clave] ? guardados[clave].valor : defecto, tipo),
        modificado: Boolean(guardados[clave]),
        actualizadoEn: guardados[clave]?.actualizado_en || null,
    }));
}

const definicion = (clave) => DEFINICIONES.find(([c]) => c === clave);

module.exports = { DEFINICIONES, armar, cargar, listar, definicion, convertir };
