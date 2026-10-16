// ================================================================
// PARÁMETROS DEL DOCUMENTO SIESA - valores por defecto + lo que guarde el admin
//
// Valores por defecto: los de Mercado Libre confirmados por el equipo (2026-10-06)
// y, para el resto, los de la tienda B2C (propartes-siesa-sync), que ya importa
// en SIESA. Todos se cambian desde la pantalla de Parámetros (tabla `parametros`).
// La conexión a SIESA (endpoint, usuario, clave) NO va aquí: va en backend/.env.
// ================================================================
const { consulta } = require('./db');

// [clave, valor por defecto, tipo (texto|numero|booleano|lista), nombre, descripción, avanzado]
// Nombre y descripción se muestran en la pantalla de Parámetros: van en lenguaje de
// negocio. El detalle técnico (campo de SIESA, por qué ese valor) va en el comentario.
// avanzado = se muestra aparte, en la pestaña "Avanzado".
const DEFINICIONES = [
    // Envío
    ['envio.activo', false, 'booleano', 'Envío a SIESA',
        'Con el envío apagado, el equipo puede cargar y revisar las ventas, pero no enviarlas. Al enviar, el pedido queda creado en SIESA.'],
    ['envio.validar_tercero', true, 'booleano', 'Revisar el comprador antes de enviar',
        'Antes de crear el pedido, verifica en SIESA si el comprador ya está registrado como cliente.'],
    ['envio.crear_tercero', false, 'booleano', 'Registrar compradores nuevos',
        'Si el comprador no está registrado en SIESA, lo crea como cliente antes de crear el pedido.'],
    // Persona natural con cédula: antes de crearla se consulta en la DIAN si tiene RUT.
    ['envio.validar_rut', true, 'booleano', 'Validar el RUT en la DIAN',
        'Antes de registrar a un comprador persona natural con cédula, consulta en la DIAN si tiene RUT. Si lo tiene, se registra con NIT (tipo N).'],
    ['envio.rut_reintento_min', 10, 'numero', 'DIAN: minutos entre reintentos',
        'Si la DIAN no responde, la venta queda en espera y se vuelve a enviar sola cada tantos minutos.'],
    ['envio.rut_espera_max_min', 60, 'numero', 'DIAN: espera máxima (minutos)',
        'Si la DIAN sigue sin responder pasado este tiempo, el comprador se registra con cédula y queda un aviso para revisarlo.'],

    // Pedido. Campos de los registros 0430 (encabezado) y 0431 (líneas).
    ['pedido.co', '021', 'texto', 'Centro de operación', 'Centro de operación al que pertenecen los pedidos.'],
    ['pedido.tipo_docto', 'PML', 'texto', 'Tipo de documento', 'Tipo de documento de los pedidos de Mercado Libre.'],
    ['pedido.vendedor', 'VEN0600', 'texto', 'Vendedor', 'Vendedor asignado a los pedidos (MERCADO LIBRE).'],
    ['pedido.lista_precio', 'L04', 'texto', 'Lista de precios', 'Lista de precios de los pedidos.'],
    ['pedido.cond_pago', 'C08', 'texto', 'Condición de pago', 'Condición de pago de los pedidos.'],
    ['pedido.tipo_cli', '6000', 'texto', 'Tipo de cliente', 'Tipo de cliente de los pedidos y de los clientes nuevos (Clientes Ventas Virtuales).'],
    ['pedido.bodega_full', 'BC207', 'texto', 'Bodega para ventas Full', 'Bodega de Mercado Libre donde están nuestros productos.'],
    ['pedido.bodega_colecta', 'BP150', 'texto', 'Bodega para ventas Colecta', 'Nuestra bodega principal, donde Mercado Libre recoge los pedidos.'],
    ['pedido.ref_flete', 'FLETE', 'texto', 'Referencia del flete', 'Producto con el que se registra el envío pagado por el comprador. Vacío = el envío no se registra.'],
    // f430_num_dias_entrega y f431_num_dias_entrega (cada producto).
    ['pedido.dias_entrega', 1, 'numero', 'Días de entrega', 'Días de entrega del pedido y de cada producto. La fecha de entrega es la de la venta más estos días.'],
    ['pedido.iva_pct', 19, 'numero', 'IVA de los productos (%)', 'Los precios de Mercado Libre incluyen IVA; con este porcentaje se calcula el precio sin IVA.'],
    ['pedido.iva_flete_pct', 19, 'numero', 'IVA del envío (%)', 'IVA incluido en el valor del envío pagado por el comprador.'],

    // Pedido, valores técnicos del conector.
    ['pedido.version', '04', 'texto', 'Versión del documento', 'Versión del formato del pedido.', true],      // F_VERSION-REG 0430/0431
    ['pedido.clase_docto', '502', 'texto', 'Clase de documento', 'Clase del documento (502 = pedido directo).', true],
    ['pedido.ind_estado', '2', 'texto', 'Estado inicial del pedido', 'Estado con que se crea el pedido (2 = aprobado).', true],
    ['pedido.ind_backorder', '1', 'texto', 'Pendientes del pedido', 'Manejo de pendientes del pedido.', true],                      // f430_ind_backorder
    ['pedido.ind_backorder_linea', '5', 'texto', 'Pendientes por producto', 'Manejo de pendientes por producto.', true],          // f431_ind_backorder: SIESA solo acepta 5
    ['pedido.sucursal', '001', 'texto', 'Sucursal del cliente', 'Sucursal del cliente a la que se factura.', true],
    // f430_id_punto_envio valida contra los puntos de envío del cliente: 000 es el que acepta
    // SIESA (T01 lo rechaza). La dirección viaja explícita en los campos f419_*.
    ['pedido.punto_envio', '000', 'texto', 'Punto de envío', 'Punto de envío del cliente.', true],
    ['pedido.moneda', 'COP', 'texto', 'Moneda', 'Moneda de los pedidos.', true],
    ['pedido.moneda_conv', 'USD', 'texto', 'Moneda de conversión', 'Moneda de conversión del pedido.', true],
    ['pedido.concepto', '501', 'texto', 'Concepto', 'Concepto de los productos (501 = ventas).', true],
    ['pedido.motivo', '01', 'texto', 'Motivo', 'Motivo de los productos.', true],
    ['pedido.co_movto', '040', 'texto', 'Centro de operación del movimiento', 'Centro de operación de cada producto del pedido.', true],
    // f431_id_ccosto_movto: cada ítem lleva el suyo y se consulta en SIESA al enviar
    // (CONSULTA_ITEM_ML); SIESA rechaza el pedido con uno que no es del ítem.
    ['pedido.ccosto', '', 'texto', 'Centro de costo de respaldo',
        'Se usa solo si SIESA no responde con el centro de costo del producto. Vacío = en ese caso la venta no se envía.', true],
    ['pedido.ccosto_flete', '5059', 'texto', 'Centro de costo del flete', 'Centro de costo con que se registra el envío.', true],
    ['pedido.unidad', 'UND', 'texto', 'Unidad de medida', 'Unidad de medida de los productos.', true],
    ['pedido.enviar_impuestos', false, 'booleano', 'Enviar el detalle de impuestos', 'Envía el IVA de cada producto. Apagado = SIESA lo calcula.', true],   // registro 0432
    ['pedido.llave_impuesto', '', 'texto', 'Llave de impuesto', 'Código de impuesto que asigna SIESA (solo si se envía el detalle de impuestos).', true],

    // Cliente nuevo. Registros 0200 / 0201 / 0753 / 0046 / 0047.
    ['tercero.email_respaldo', 'tienda.virtual@propartes.com', 'texto', 'Correo de los clientes nuevos',
        'Mercado Libre no entrega el correo del comprador: se registra este correo, también para la factura electrónica.'],
    ['tercero.telefono_respaldo', '', 'texto', 'Teléfono de los clientes nuevos', 'Mercado Libre no entrega el teléfono del comprador. Vacío = sin teléfono.'],
    ['tercero.vendedor', '0600', 'texto', 'Vendedor y cobrador', 'Vendedor y cobrador asignados al cliente nuevo (MERCADO LIBRE).'],
    ['tercero.cond_pago', 'C08', 'texto', 'Condición de pago', 'Condición de pago del cliente nuevo.'],
    // F201_PORC_MAX_MARGEN: entre el margen mínimo (0) y 9999. El ejemplo de TI trae 100.
    ['tercero.co_movto', '040', 'texto', 'Centro de operación de ventas', 'Centro de operación por defecto del movimiento de ventas del cliente nuevo.'],   // F201_ID_CO_MOVTO_FACTURA
    ['tercero.notas', 'Creado en Mercadolibre', 'texto', 'Nota del cliente nuevo', 'Observación que queda en el cliente creado desde la app.'],   // F201_NOTAS
    ['tercero.porc_max_margen', 100, 'numero', 'Margen máximo (%)', 'Porcentaje de margen máximo del cliente nuevo.'],
    ['tercero.fe_regimen_natural', '49', 'texto', 'Factura electrónica: régimen', 'Código de régimen de la persona natural (49 = No responsable de IVA).'],
    ['tercero.fe_obligacion_natural', 'R-99-PN', 'texto', 'Factura electrónica: obligación', 'Código de obligación de la persona natural (R-99-PN = No aplica - Otros).'],
    ['tercero.fe_detalle1_natural', 'ZZ', 'texto', 'Factura electrónica: detalle tributario 1', 'Detalle tributario 1 de la persona natural (ZZ = No aplica).'],
    ['tercero.fe_detalle2_natural', '', 'texto', 'Factura electrónica: detalle tributario 2', 'Detalle tributario 2 de la persona natural. Vacío = no se envía.'],
    ['tercero.fe_regimen_juridica', '48', 'texto', 'Factura electrónica empresa: régimen', 'Código de régimen de la empresa (48 = Responsable de IVA).'],
    ['tercero.fe_obligacion_juridica', 'R-99-PN', 'texto', 'Factura electrónica empresa: obligación', 'Código de obligación de la empresa (R-99-PN = No aplica - Otros).'],
    ['tercero.fe_detalle1_juridica', '01', 'texto', 'Factura electrónica empresa: detalle tributario 1', 'Detalle tributario 1 de la empresa (01 = IVA).'],
    ['tercero.fe_detalle2_juridica', '', 'texto', 'Factura electrónica empresa: detalle tributario 2', 'Detalle tributario 2 de la empresa. Vacío = no se envía.'],

    // Cliente nuevo, valores técnicos.
    ['tercero.sucursal', '001', 'texto', 'Sucursal', 'Sucursal con que se crea el cliente.', true],
    // F201_IND_CALIFICACION es obligatorio: vacío, SIESA rechaza el cliente.
    ['tercero.calificacion', 'A', 'texto', 'Calificación', 'Calificación del cliente nuevo (A, B o C).', true],
    ['tercero.pais', '169', 'texto', 'País', 'País del cliente (169 = Colombia).', true],
    ['tercero.actualiza', '1', 'texto', 'Actualizar datos tributarios', 'Si el dato ya existe, se actualiza (1) o no (0).', true],    // F_ACTUALIZA_REG
    // Registro 0207: un criterio por plan de clasificación, como "plan:criterio".
    ['tercero.criterios', ['CCO:NO', 'CLM:01', 'CMV:N', 'COM:NO', 'D01:50', 'D02:52', 'NIC:NO', 'PCO:05', 'PRO:NO', 'RED:01', 'ZON:0207'], 'lista', 'Clasificación del cliente',
        'Criterios de clasificación del cliente nuevo, uno por plan, como plan:criterio. D01 (división) y D02 (segmento) se reemplazan según los productos de la compra; los de aquí se usan si no se puede saber.', true],
    // Segmento del producto (plan S01 del ítem) -> división (D01) y segmento (D02) del cliente.
    ['tercero.division_por_segmento', ['AU01:50:52', 'CO01:50:52', 'MO01:70:71', 'NA01:70:71', 'BI01:80:80'], 'lista', 'División según los productos',
        'Segmento del producto en SIESA, división y segmento del cliente, como producto:división:segmento. AU01 Automóviles y CO01 Comercial diésel = Automotriz (50/52); MO01 Motos y NA01 Marine = Motos (70/71); BI01 Bicicletas = Bicicletas (80/80). Gana el grupo con más valor en la compra.', true],
    // Registros 0046 / 0047: "clase:valor" o "clase:valor:llave", clase de 3 dígitos y valor de 2.
    // Impuestos: 001 = IVA, 002 = ICA, 003 = INC. Retenciones: 001 = RENTA, 002 = RIVA, 003 = R.ICA,
    // 004 = R.ICA.T, 021 = RHON, 022 = RCIM, 023 = RSER, 024 = RCOM, 025 = AUTRENTA,
    // 030 = RETNEDOR (verificado en Pruebas). Valor 00 = no aplica / no retiene, 01 = le aplica / retenedor.
    ['tercero.impuestos_natural', ['001:01', '002:01', '003:01'], 'lista', 'Impuestos persona natural',
        'Impuestos de la persona natural, como clase:valor (01 = le aplica, 00 = no le aplica). 001 = IVA, 002 = ICA, 003 = Impoconsumo.', true],
    ['tercero.retenciones_natural', ['001:00', '002:00', '003:00', '004:00', '021:00', '022:00', '023:00', '024:00', '025:01', '030:00'], 'lista', 'Retenciones persona natural',
        'Retenciones de la persona natural, como clase:valor (01 = retenedor, 00 = no retiene). 001 = Renta, 002 = IVA, 003 = ICA, 004 = ICA T, 021 = Honorarios, 022 = CIM, 023 = Servicios, 024 = Compras, 025 = Autorretención renta, 030 = Retenedor.', true],
    ['tercero.impuestos_juridica', ['001:01', '002:01', '003:01'], 'lista', 'Impuestos empresa',
        'Impuestos de la empresa, como clase:valor (01 = le aplica, 00 = no le aplica). 001 = IVA, 002 = ICA, 003 = Impoconsumo.', true],
    ['tercero.retenciones_juridica', ['001:00', '002:00', '003:00', '004:00', '021:00', '022:00', '023:00', '024:00', '025:01', '030:01'], 'lista', 'Retenciones empresa',
        'Retenciones de la empresa, como clase:valor (01 = retenedor, 00 = no retiene). 001 = Renta, 002 = IVA, 003 = ICA, 004 = ICA T, 021 = Honorarios, 022 = CIM, 023 = Servicios, 024 = Compras, 025 = Autorretención renta, 030 = Retenedor.', true],
    // F201_IND_BLOQUEADO / CUPO / MORA: en los clientes reales van en 1 aunque estén activos.
    ['tercero.bloqueado', '1', 'texto', 'Validar bloqueo', 'Aplica al cliente las validaciones de bloqueo.', true],
    ['tercero.bloqueo_cupo', '1', 'texto', 'Validar cupo', 'Aplica al cliente las validaciones de cupo.', true],
    ['tercero.bloqueo_mora', '1', 'texto', 'Validar mora', 'Aplica al cliente las validaciones de mora.', true],

    // Mercado Libre
    ['ml.estados_excluidos', ['cancelada', 'devuelta', 'devolucion', 'reembolso', 'no concretada'], 'lista', 'Estados que no se envían',
        'Ventas cuyo estado en Mercado Libre contiene alguna de estas palabras (separadas por coma). No se pueden enviar a SIESA.'],
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
        consultaItems: process.env.SIESA_CONSULTA_ITEMS || 'CONSULTA_ITEM_ML',
        consultaPedidos: process.env.SIESA_CONSULTA_PEDIDOS || 'CONSULTA_PEDIDO_ML',
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
    return DEFINICIONES.map(([clave, defecto, tipo, nombre, descripcion, avanzado]) => ({
        clave, tipo, nombre, descripcion, avanzado: Boolean(avanzado),
        defecto: convertir(defecto, tipo),
        valor: convertir(guardados[clave] ? guardados[clave].valor : defecto, tipo),
        modificado: Boolean(guardados[clave]),
        actualizadoEn: guardados[clave]?.actualizado_en || null,
    }));
}

const definicion = (clave) => DEFINICIONES.find(([c]) => c === clave);

module.exports = { DEFINICIONES, armar, cargar, listar, definicion, convertir };
