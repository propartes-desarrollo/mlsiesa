// ================================================================
// DOCUMENTOS DEL CONECTOR a partir de una venta de Mercado Libre
//
//   pedidoLineas(venta)  -> 0000 / 0430 / 0431 x ítem (+FLETE) / [0432] / 9999
//   terceroLineas(venta) -> 0000 / 0200 / 0201 / [0207] / 0046 x2 / 0047 x3 / 9999
//
// Port de PSS_Order_Builder y PSS_Tercero_Builder (propartes-siesa-sync). Diferencias:
//  - Los precios del reporte de ML vienen CON IVA. Se envía el neto
//    (precio / (1 + IVA)) subido a peso entero: SIESA recalcula el impuesto
//    (F_LIQUIDA_IMPUESTO = 1) y rechaza precios con fracción de centavo.
//  - El # de venta de ML tiene 16 dígitos y f430_num_docto_referencia admite 15:
//    van los 15 últimos, y el número completo en las notas.
//  - El vendedor del pedido es el tercero MERCADO LIBRE (pedido.vendedor).
//  - La bodega depende de la logística: Full (bodega de ML) o Colecta (BP150).
//  - El centro de costo de cada línea es el del ítem en SIESA (ccostos, por SKU),
//    que se consulta al enviar. Con uno que no es del ítem, SIESA rechaza el pedido.
// ================================================================
const P = require('./plano');
const L = require('./layouts');
const dane = require('../dane');

const NATURAL = '1';
const JURIDICA = '2';

const neto = (precioIva, ivaPct) => P.ceilPesos(precioIva / (1 + ivaPct / 100));
const referenciaMl = (numero) => String(numero).slice(-15);

const aaaammdd = (f) => `${f.getFullYear()}${String(f.getMonth() + 1).padStart(2, '0')}${String(f.getDate()).padStart(2, '0')}`;
const fechaVenta = (venta) => (venta.fecha ? new Date(venta.fecha) : new Date());

const LOGISTICA = { full: 'Full', colecta: 'Colecta' };
// Texto de la forma de entrega en las notas, tal como lo nombra Mercado Libre.
const FORMA_ENTREGA = { full: 'Mercado Envíos Full', colecta: 'Colecta de Mercado Envíos' };

function bodega(venta, cfg) {
    if (venta.logistica === 'full') return cfg.pedido.bodega_full;
    if (venta.logistica === 'colecta') return cfg.pedido.bodega_colecta;
    return '';
}

// Las líneas del 0431, ya en neto. Sirve también para la vista previa.
// ccostos: { sku: centro de costo } consultado en SIESA; sin él va el de respaldo.
function lineasDetalle(venta, cfg, ccostos = {}) {
    const p = cfg.pedido;
    const out = venta.items.map((it) => ({
        referencia: it.sku, descripcion: it.titulo, cantidad: it.cantidad,
        precioIva: it.precioIva, precioNeto: neto(it.precioIva, p.iva_pct),
        ccosto: ccostos[it.sku] || p.ccosto, ccostoDeSiesa: Boolean(ccostos[it.sku]), esFlete: false,
    }));
    if (venta.fleteIva > 0 && p.ref_flete) {
        out.push({
            referencia: p.ref_flete, descripcion: 'Envío pagado por el comprador', cantidad: 1,
            precioIva: venta.fleteIva, precioNeto: neto(venta.fleteIva, p.iva_flete_pct), ccosto: p.ccosto_flete, ccostoDeSiesa: false, esFlete: true,
        });
    }
    return out;
}

// Lo pide el equipo en todos los pedidos: "ML - <# de venta> - <forma de entrega>".
function notas(venta) {
    return [`ML - ${venta.numero}`, FORMA_ENTREGA[venta.logistica]].filter(Boolean).join(' - ');
}

function pedidoLineas(venta, cfg, ccostos = {}) {
    const p = cfg.pedido;
    const cia = cfg.siesa.cia;
    const fecha = fechaVenta(venta);
    const fDocto = aaaammdd(fecha);
    const dias = Number(p.dias_entrega);
    const entrega = new Date(fecha);
    entrega.setDate(entrega.getDate() + dias);
    const c = venta.comprador;

    const lineas = [P.control(1, 0, cia)];
    let consec = 2;
    lineas.push(P.registro(L.L430, {
        'F_NUMERO-REG': consec++, 'F_TIPO-REG': 430, 'F_SUBTIPO_REG': 0,
        'F_VERSION-REG': p.version, F_CIA: cia,
        F_LIQUIDA_IMPUESTO: 1, F_CONSEC_AUTO_REG: 1, F_IND_CONTACTO: 1,
        f430_id_co: p.co, f430_id_tipo_docto: p.tipo_docto, f430_consec_docto: 0,
        f430_id_fecha: fDocto, f430_id_clase_docto: p.clase_docto,
        f430_ind_estado: p.ind_estado, f430_ind_backorder: p.ind_backorder,
        f430_id_tercero_fact: c.documento, f430_id_sucursal_fact: p.sucursal,
        f430_id_tercero_rem: c.documento, f430_id_sucursal_rem: p.sucursal,
        f430_id_tipo_cli_fact: p.tipo_cli, f430_id_co_fact: p.co,
        f430_fecha_entrega: aaaammdd(entrega), f430_num_dias_entrega: dias,
        f430_num_docto_referencia: referenciaMl(venta.numero),
        f430_referencia: p.canal,
        f430_id_moneda_docto: p.moneda, f430_id_moneda_conv: p.moneda_conv,
        f430_tasa_conv: 1, f430_id_moneda_local: p.moneda, f430_tasa_local: 1,
        f430_id_cond_pago: p.cond_pago, f430_notas: notas(venta),
        f430_id_punto_envio: p.punto_envio, f430_id_tercero_vendedor: p.vendedor,
        f419_contacto: c.nombreEnvio || c.nombre,
        f419_direccion1: c.direccionEnvio.slice(0, 40),
        f419_direccion2: c.direccionEnvio.slice(40, 80),
        f419_telefono: cfg.tercero.telefono_respaldo,
        f419_email: cfg.tercero.email_respaldo,
    }));

    const impuestos = [];
    const idBodega = bodega(venta, cfg);
    lineasDetalle(venta, cfg, ccostos).forEach((ln, idx) => {
        const nro = idx + 1;
        lineas.push(P.registro(L.L431, {
            'F_NUMERO-REG': consec++, 'F_TIPO-REG': 431, 'F_SUBTIPO-REG': 0,
            'F_VERSION-REG': p.version, F_CIA: cia,
            f431_id_co: p.co, f431_id_tipo_docto: p.tipo_docto, f431_consec_docto: 0,
            f431_nro_registro: nro, f431_referencia_item: ln.referencia,
            f431_id_bodega: idBodega, f431_id_concepto: p.concepto, f431_id_motivo: p.motivo,
            f431_id_co_movto: p.co_movto, f431_id_ccosto_movto: ln.ccosto,
            f431_fecha_entrega: fDocto, f431_num_dias_entrega: dias,
            f431_id_lista_precio: p.lista_precio, f431_id_unidad_medida: p.unidad,
            f431_cant_pedida_base: ln.cantidad, f431_cant2_pedida: 0,
            f431_precio_unitario: ln.precioNeto,
            f431_ind_backorder: p.ind_backorder_linea, f431_ind_precio: 2,
        }));
        const ivaUnit = ln.precioIva - ln.precioNeto;
        if (ivaUnit > 0) impuestos.push([nro, Math.round((ivaUnit / ln.precioNeto) * 10000) / 100, ivaUnit]);
    });

    if (p.enviar_impuestos && String(p.llave_impuesto).trim()) {
        for (const [nro, tasa, vlr] of impuestos) {
            lineas.push(P.registro(L.L432, {
                'F_NUMERO-REG': consec++, 'F_TIPO-REG': 432, 'F_SUBTIPO-REG': 0, 'F_VERSION-REG': 1,
                F_CIA: cia, F430_ID_CO: p.co, F430_ID_TIPO_DOCTO: p.tipo_docto,
                F430_CONSEC_DOCTO: 0, F431_NRO_REGISTRO: nro,
                F433_ID_LLAVE_IMPUESTO: p.llave_impuesto, F433_PORCENTAJE_BASE: 100,
                F433_TASA: tasa, F433_VLR_UNI: vlr, F433_IND_CALCULO: 1,
            }));
        }
    }

    lineas.push(P.control(consec, 9999, cia));
    return lineas;
}

// ─── Tercero ─────────────────────────────────────────────────────

// Dígito de verificación, módulo 11 de la DIAN.
function digitoVerificacion(nit) {
    const s = String(nit).replace(/\D/g, '');
    if (!s) return '';
    const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    const suma = [...s].reverse().reduce((acc, ch, i) => (i < pesos.length ? acc + Number(ch) * pesos[i] : acc), 0);
    const r = suma % 11;
    return String(r > 1 ? 11 - r : r);
}

// ML entrega el nombre completo en un solo campo, casi siempre "Nombres Apellidos".
// Con 4+ palabras se toman 2 nombres. Se muestra en la vista previa para revisar.
function partirNombre(nombre) {
    const w = String(nombre).split(/\s+/).filter(Boolean);
    if (w.length <= 1) return [nombre, '', ''];
    if (w.length === 2) return [w[0], w[1], ''];
    if (w.length === 3) return [w[0], w[1], w[2]];
    return [w.slice(0, 2).join(' '), w[2], w.slice(3).join(' ')];
}

function datosTercero(venta, cfg, municipiosAdicionales = {}) {
    const c = venta.comprador;
    const t = cfg.tercero;
    const juridica = c.juridica;
    const [nombres, apellido1, apellido2] = juridica ? ['', '', ''] : partirNombre(c.nombre);
    let [depto, ciudad] = dane.resolver(c.ciudadFact, c.deptoFact, municipiosAdicionales);
    if (!depto) [depto, ciudad] = dane.resolver(c.ciudadEnvio, c.deptoEnvio, municipiosAdicionales);
    // Sin ", Ciudad, Departamento" al final: eso va en los códigos.
    const partes = c.direccionFact.split(',').map((x) => x.trim());
    const direccion = partes.length > 2 ? partes.slice(0, -2).join(', ') : c.direccionFact;
    return {
        documento: c.documento, dv: digitoVerificacion(c.documento),
        tipo: juridica ? JURIDICA : NATURAL,
        tipoIdent: juridica ? 'N' : (c.tipoDoc || 'C'),
        razonSocial: juridica ? c.nombre : '',
        nombres, apellido1, apellido2,
        nombreCompleto: c.nombre,
        direccion,
        pais: depto ? t.pais : '', depto, ciudad,
        telefono: t.telefono_respaldo, email: t.email_respaldo,
        fecha: aaaammdd(fechaVenta(venta)),
    };
}

// roles: los que el tercero ya tiene en SIESA (es_proveedor, es_empleado...), para no
// borrárselos al crearlo. Para un tercero nuevo van en 0.
function terceroLineas(venta, cfg, roles = null, municipiosAdicionales = {}) {
    const t = cfg.tercero;
    const p = cfg.pedido;
    const cia = cfg.siesa.cia;
    const d = datosTercero(venta, cfg, municipiosAdicionales);
    const rol = (k) => (roles && String(roles[k]) === '1' ? 1 : 0);

    const lineas = [P.control(1, 0, cia)];
    let consec = 2;
    lineas.push(P.registro(L.L200, {
        F_NUMERO_REG: consec++, F_TIPO_REG: 200, F_SUBTIPO_REG: 0, F_VERSION_REG: 8,
        F_CIA: cia, F_ACTUALIZA_REG: 0,
        F200_ID: d.documento, F200_NIT: d.documento, F200_DV_NIT: d.dv,
        F200_ID_TIPO_IDENT: d.tipoIdent, F200_IND_TIPO_TERCERO: d.tipo,
        F200_RAZON_SOCIAL: d.razonSocial, F200_APELLIDO1: d.apellido1,
        F200_APELLIDO2: d.apellido2, F200_NOMBRES: d.nombres,
        F200_NOMBRE_EST: d.nombreCompleto, F200_IND_CLIENTE: 1,
        F200_IND_PROVEEDOR: rol('es_proveedor'), F200_IND_EMPLEADO: rol('es_empleado'),
        F200_IND_ACCIONISTA: rol('es_accionista'), F200_IND_OTROS: rol('es_otros'),
        F200_IND_INTERNO: rol('es_interno'),
        F015_CONTACTO: d.nombreCompleto, F015_DIRECCION1: d.direccion,
        F015_ID_PAIS: d.pais, F015_ID_DEPTO: d.depto, F015_ID_CIUDAD: d.ciudad,
        F015_TELEFONO: d.telefono, F015_EMAIL: d.email, F015_CELULAR: d.telefono,
        F200_FECHA_NACIMIENTO: d.fecha, F200_IND_NO_DOMICILIADO: 0, F200_IND_ESTADO: 1,
    }));
    lineas.push(P.registro(L.L201, {
        F_NUMERO_REG: consec++, F_TIPO_REG: 201, F_SUBTIPO_REG: 0, F_VERSION_REG: 10,
        F_CIA: cia, F_ACTUALIZA_REG: 0,
        F201_ID_TERCERO: d.documento, F201_ID_SUCURSAL: t.sucursal,
        F201_IND_ESTADO_ACTIVO: 1, F201_DESCRIPCION_SUCURSAL: d.nombreCompleto,
        F201_ID_MONEDA: p.moneda, F201_ID_VENDEDOR: t.vendedor,
        F201_ID_COND_PAGO: t.cond_pago, F201_ID_TIPO_CLI: p.tipo_cli,
        F201_ID_LISTA_PRECIO: p.lista_precio, F201_IND_PEDIDO_BACKORDER: 0,
        F201_IND_BLOQUEADO: t.bloqueado, F201_IND_BLOQUEO_CUPO: t.bloqueo_cupo,
        F201_IND_BLOQUEO_MORA: t.bloqueo_mora, F201_IND_FACTURA_UNIFICADA: 0,
        F015_CONTACTO: d.nombreCompleto, F015_DIRECCION1: d.direccion,
        F015_ID_PAIS: d.pais, F015_ID_DEPTO: d.depto, F015_ID_CIUDAD: d.ciudad,
        F015_TELEFONO: d.telefono, F015_EMAIL: d.email, f015_celular: d.telefono,
        F201_FECHA_INGRESO: d.fecha, f201_id_cobrador: t.vendedor,
    }));

    if (String(t.division).trim()) {
        lineas.push(P.registro(L.L207, {
            F_NUMERO_REG: consec++, F_TIPO_REG: 207, F_SUBTIPO_REG: 0, F_VERSION_REG: 1,
            F_CIA: cia, F_ACTUALIZA_REG: t.actualiza, F207_ID_TERCERO: d.documento,
            F207_ID_SUCURSAL: t.sucursal, F207_ID_PLAN_CRITERIOS: t.plan_division,
            F207_ID_CRITERIO_MAYOR: t.division,
        }));
    }

    const sufijo = d.tipo === JURIDICA ? 'juridica' : 'natural';
    // Retenciones: una persona natural no retiene; para empresas ML no informa si son
    // agentes retenedores, así que van en 0 hasta que contabilidad defina la regla.
    const clases = [[46, 1, t[`iva_${sufijo}`]], [46, 2, t[`ica_${sufijo}`]], [47, 1, '0'], [47, 2, '0'], [47, 3, '0']];
    for (const [tipoReg, clase, valor] of clases) {
        lineas.push(P.registro(L.L046, {
            F_NUMERO_REG: consec++, F_TIPO_REG: tipoReg, F_SUBTIPO_REG: 0, F_VERSION_REG: 1,
            F_CIA: cia, F_ACTUALIZA_REG: t.actualiza, F_ID_TERCERO: d.documento,
            F_ID_SUCURSAL: t.sucursal, F_ID_CLASE: clase, F_ID_VALOR_TERCERO: valor,
        }));
    }

    lineas.push(P.control(consec, 9999, cia));
    return lineas;
}

// Cada registro debe medir exactamente lo que dice su layout: un desfase invalida todo.
function verificarLargos(lineas) {
    return lineas.flatMap((ln) => {
        const tipo = ln.slice(7, 11);
        const esperado = L.LARGOS[tipo];
        return esperado && ln.length !== esperado ? [`Registro ${tipo} mide ${ln.length} en vez de ${esperado}.`] : [];
    });
}

module.exports = {
    pedidoLineas, terceroLineas, lineasDetalle, datosTercero, verificarLargos,
    neto, referenciaMl, digitoVerificacion, partirNombre, notas, bodega, LOGISTICA,
};
