// ================================================================
// CLIENTE SOAP del web service WSUNOEE de SIESA
//
//   importar(lineas)          -> ImportarXML. ESCRIBE en el ERP: no hay modo de validación.
//   consultarTercero(doc)     -> EjecutarConsultaXML con CONSULTA_TERCERO_ECOMMERCE.
//   consultarItem(sku)        -> EjecutarConsultaXML con CONSULTA_ITEM_ML (centro de costo).
//   consultarPedido(ref)      -> EjecutarConsultaXML con CONSULTA_PEDIDO_ML (número y líneas).
//
// El resultado de ImportarXML viene en <printTipoError>, con HTTP 200 aun cuando
// rechaza: 0 = importado, 1 = rechazado por contenido, 3 = usuario no habilitado.
// SIESA no dice qué campo falló ni devuelve el número del documento creado.
// ================================================================
const { envolver, escaparXml } = require('./plano');

const CODIGOS = {
    0: 'Importado',
    1: 'Rechazado por SIESA: algún valor del documento no es válido',
    3: 'El usuario no está habilitado para importar en SIESA',
};

// Sin veredicto de SIESA: red caída, SOAP Fault, HTTP distinto de 200.
// incierto = la petición salió pero no llegó respuesta (tiempo agotado): SIESA pudo
// haber importado igual, así que NO se debe reintentar sin verificar.
class ErrorSiesa extends Error {
    constructor(mensaje, { incierto = false } = {}) {
        super(mensaje);
        this.incierto = incierto;
    }
}

function documento(lineas, siesa, enmascarar = false) {
    return envolver(lineas, { ...siesa, clave: enmascarar ? '********' : siesa.clave });
}

async function post(siesa, accion, sobre) {
    let r;
    try {
        r = await fetch(siesa.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `http://tempuri.org/${accion}` },
            body: sobre,
            signal: AbortSignal.timeout(siesa.timeoutMs),
        });
    } catch (e) {
        if (e.name === 'TimeoutError') {
            throw new ErrorSiesa(`SIESA no respondió en ${siesa.timeoutMs / 1000} s.`, { incierto: true });
        }
        throw new ErrorSiesa(`No hubo conexión con SIESA: ${e.cause?.message || e.message}`);
    }
    const cuerpo = await r.text();
    if (/faultstring/i.test(cuerpo)) {
        const m = cuerpo.match(/<faultstring>([\s\S]*?)<\/faultstring>/);
        throw new ErrorSiesa(`SOAP Fault: ${m ? m[1].trim() : cuerpo.slice(0, 300)}`);
    }
    if (r.status !== 200) throw new ErrorSiesa(`SIESA respondió HTTP ${r.status}`);
    return cuerpo;
}

function exigirClave(siesa) {
    if (!siesa.clave) throw new ErrorSiesa('Falta la clave del conector (SIESA_CLAVE en backend/.env).');
}

async function importar(lineas, siesa) {
    exigirClave(siesa);
    const sobre = '<?xml version="1.0" encoding="utf-8"?>'
        + '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>'
        + '<ImportarXML xmlns="http://tempuri.org/">'
        + `<pvstrDatos><![CDATA[${documento(lineas, siesa)}]]></pvstrDatos>`
        + '<printTipoError>0</printTipoError>'
        + '</ImportarXML></soap:Body></soap:Envelope>';
    const cuerpo = await post(siesa, 'ImportarXML', sobre);
    const m = cuerpo.match(/<printTipoError>(\d+)<\/printTipoError>/);
    const codigo = m ? m[1] : '?';
    return {
        codigo,
        exito: codigo === '0',
        mensaje: CODIGOS[codigo] || `Código ${codigo}, sin documentar`,
        respuesta: cuerpo.slice(0, 4000),
    };
}

// Las filas <Resultado> (o <Table>) del DiffGram como objetos planos.
function filas(xml) {
    const limpio = xml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    const bloques = [...limpio.matchAll(/<Resultado[^>]*>([\s\S]*?)<\/Resultado>/g)];
    const usados = bloques.length ? bloques : [...limpio.matchAll(/<Table[^>]*>([\s\S]*?)<\/Table>/g)];
    return usados.map(([, interior]) => Object.fromEntries(
        [...interior.matchAll(/<(?:\w+:)?(\w+)[^>]*>([\s\S]*?)<\/(?:\w+:)?\1>/g)].map(([, k, v]) => [k, v.trim()])
    ));
}

async function consultar(nombreConsulta, parametros, siesa) {
    exigirClave(siesa);
    const p = Object.entries(parametros).map(([k, v]) => `<${k}>${escaparXml(v)}</${k}>`).join('');
    const sobre = '<?xml version="1.0" encoding="utf-8"?>'
        + '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>'
        + '<EjecutarConsultaXML xmlns="http://tempuri.org/"><pvstrxmlParametros><![CDATA['
        + `<Consulta><NombreConexion>${escaparXml(siesa.conexion)}</NombreConexion>`
        + `<IdCia>${escaparXml(siesa.cia)}</IdCia>`
        + `<IdProveedor>${escaparXml(siesa.proveedor)}</IdProveedor>`
        + `<IdConsulta>${escaparXml(nombreConsulta)}</IdConsulta>`
        + `<Usuario>${escaparXml(siesa.usuario)}</Usuario>`
        + `<Clave>${escaparXml(siesa.clave)}</Clave>`
        + `<Parametros>${p}</Parametros></Consulta>`
        + ']]></pvstrxmlParametros></EjecutarConsultaXML></soap:Body></soap:Envelope>';
    return filas(await post(siesa, 'EjecutarConsultaXML', sobre));
}

// estado: activo | inactivo | no_existe | desconocido
async function consultarTercero(documentoTercero, siesa) {
    let resultado;
    try {
        resultado = await consultar(siesa.consultaTerceros, { documento: documentoTercero }, siesa);
    } catch (e) {
        if (!(e instanceof ErrorSiesa)) throw e;
        return { estado: 'desconocido', mensaje: e.message, tercero: null };
    }
    if (!resultado.length) return { estado: 'no_existe', mensaje: 'El comprador no existe como tercero en SIESA.', tercero: null };
    const t = resultado[0];
    const tieneCliente = Boolean(String(t.sucursal || '').trim());
    if (tieneCliente && String(t.estado_activo) === '1') return { estado: 'activo', mensaje: '', tercero: t };
    if (tieneCliente) return { estado: 'inactivo', mensaje: 'El tercero existe en SIESA pero está inactivo.', tercero: t };
    return { estado: 'no_existe', mensaje: 'El tercero existe pero no es cliente (sin sucursal 001).', tercero: t };
}

// Centro de costo de venta del ítem. SIESA rechaza el pedido si la línea lleva uno que no
// es el del ítem. estado: ok | no_existe | sin_ccosto | desconocido
async function consultarItem(referencia, siesa) {
    let resultado;
    try {
        resultado = await consultar(siesa.consultaItems, { referencia }, siesa);
    } catch (e) {
        if (!(e instanceof ErrorSiesa)) throw e;
        return { estado: 'desconocido', mensaje: e.message, ccosto: '' };
    }
    if (!resultado.length) return { estado: 'no_existe', mensaje: `El SKU ${referencia} no existe como ítem en SIESA.`, ccosto: '' };
    const ccosto = String(resultado[0].ccosto_venta || '').trim();
    if (!ccosto) return { estado: 'sin_ccosto', mensaje: `El ítem ${referencia} no tiene centro de costo de venta en SIESA.`, ccosto: '' };
    return { estado: 'ok', mensaje: '', ccosto };
}

const ESTADOS_PEDIDO = { 0: 'En elaboración', 1: 'Retenido', 2: 'Aprobado', 3: 'Comprometido', 4: 'Cumplido', 9: 'Anulado' };
const numero = (v) => (v === undefined || v === '' ? 0 : Number(v));

// Las filas de CONSULTA_PEDIDO_ML (una por línea) agrupadas en pedidos, del más reciente
// al más antiguo. Normalmente hay uno solo por venta.
function agruparPedidos(resultado) {
    const pedidos = new Map();
    for (const f of resultado) {
        const clave = `${f.co}-${f.tipo_docto}-${f.consec}`;
        if (!pedidos.has(clave)) {
            pedidos.set(clave, {
                co: f.co, tipoDocto: f.tipo_docto, consec: String(f.consec), numero: `${f.tipo_docto}-${f.consec}`,
                fecha: f.fecha, estado: String(f.estado), estadoTexto: ESTADOS_PEDIDO[f.estado] || `Estado ${f.estado}`,
                tercero: f.tercero, terceroNombre: f.tercero_nombre, notas: f.notas, lineas: [],
            });
        }
        if (f.item || f.linea_rowid) {
            pedidos.get(clave).lineas.push({
                item: f.item, descripcion: f.descripcion, bodega: f.bodega, cantidad: numero(f.cantidad),
                precioUnitario: numero(f.precio_unitario), vlrBruto: numero(f.vlr_bruto),
                vlrImp: numero(f.vlr_imp), vlrNeto: numero(f.vlr_neto),
            });
        }
    }
    const lista = [...pedidos.values()].sort((a, b) => Number(b.consec) - Number(a.consec));
    for (const p of lista) {
        p.totalBruto = p.lineas.reduce((s, l) => s + l.vlrBruto, 0);
        p.totalImp = p.lineas.reduce((s, l) => s + l.vlrImp, 0);
        p.totalNeto = p.lineas.reduce((s, l) => s + l.vlrNeto, 0);
    }
    return lista;
}

// El pedido que quedó en SIESA para una venta, por su documento de referencia.
// estado: encontrado | no_existe | desconocido. Si hay más de uno (no debería) van todos.
async function consultarPedido(referencia, siesa) {
    let resultado;
    try {
        resultado = await consultar(siesa.consultaPedidos, { referencia }, siesa);
    } catch (e) {
        if (!(e instanceof ErrorSiesa)) throw e;
        return { estado: 'desconocido', mensaje: e.message, pedidos: [] };
    }
    const pedidos = agruparPedidos(resultado);
    if (!pedidos.length) return { estado: 'no_existe', mensaje: 'No hay pedido en SIESA con esa referencia.', pedidos };
    return { estado: 'encontrado', mensaje: '', pedidos };
}

module.exports = {
    importar, consultar, consultarTercero, consultarItem, consultarPedido, agruparPedidos,
    documento, filas, ErrorSiesa, CODIGOS,
};
