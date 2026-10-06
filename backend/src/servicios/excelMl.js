// ================================================================
// LECTOR DEL REPORTE "Ventas CO Mercado Libre y Mercado Shops" (.xlsx)
//
// Estructura observada (reportes 2026-09-28 y 2026-10-01):
//  - Filas 1-5: título, enlaces y secciones (Ventas, Publicaciones, Facturación...).
//  - Fila 6: encabezados. Hay nombres repetidos ("Estado", "Unidades",
//    "Forma de entrega"), así que se ubican por nombre + número de aparición,
//    nunca por letra de columna fija.
//  - Desde la fila 7: una fila por venta. Una compra de varios productos llega
//    como una fila "Paquete de N productos" (comprador y total) seguida de N
//    filas hijas (SKU, cantidad, precio) sin datos del comprador.
// ================================================================
const ExcelJS = require('exceljs');
const AppError = require('../utilidades/AppError');

const MESES = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
    septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

// clave interna -> [encabezado en el reporte, número de aparición]
const COLUMNAS = {
    venta: ['# de venta', 1],
    fecha: ['Fecha de venta', 1],
    estado: ['Estado', 1],
    estadoDesc: ['Descripción del estado', 1],
    unidades: ['Unidades', 1],
    ingresosProductos: ['Ingresos por productos (COP)', 1],
    ingresosEnvio: ['Ingresos por envío (COP)', 1],
    descuentos: ['Descuentos y bonificaciones', 1],
    anulaciones: ['Anulaciones y reembolsos (COP)', 1],
    sku: ['SKU', 1],
    publicacion: ['# de publicación', 1],
    titulo: ['Título de la publicación', 1],
    variante: ['Variante', 1],
    precioUnitario: ['Precio unitario de venta de la publicación (COP)', 1],
    factNombre: ['Datos personales o de empresa', 1],
    factDocumento: ['Tipo y número de documento', 1],
    factDireccion: ['Dirección', 1],
    factContribuyente: ['Tipo de contribuyente', 1],
    comprador: ['Comprador', 1],
    negocio: ['Negocio', 1],
    domicilio: ['Domicilio', 1],
    ciudad: ['Municipio o ciudad capital', 1],
    depto: ['Estado', 2],
    codPostal: ['Código postal', 1],
    transportista: ['Transportista', 1],
    seguimiento: ['Número de seguimiento', 1],
    formaEntrega: ['Forma de entrega', 1],
};
const OBLIGATORIAS = ['venta', 'fecha', 'estado', 'unidades', 'ingresosProductos', 'sku',
    'precioUnitario', 'factNombre', 'factDocumento'];

const TIPOS_DOC = { CC: 'C', CE: 'E', NIT: 'N', PP: 'P', PAS: 'P', PASAPORTE: 'P' };

// Logística de la venta, según "Forma de entrega" (viene en la fila del paquete, no en
// las hijas):
//   full    "Mercado Envíos Full": sale de la bodega que ML tiene con productos nuestros.
//   colecta "Colecta de Mercado Envíos": el carro de ML recoge en nuestra bodega principal.
function logistica(formaEntrega) {
    const f = sinTildes(formaEntrega).toLowerCase();
    if (/\bfull\b/.test(f)) return 'full';
    if (f.includes('colecta')) return 'colecta';
    return '';
}

const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');

// Valor plano de una celda de ExcelJS (texto enriquecido, fórmulas, hipervínculos).
function valorCelda(v) {
    if (v === null || v === undefined) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'object') {
        if (v.richText) return v.richText.map((t) => t.text).join('');
        if ('result' in v) return v.result;
        if ('text' in v) return v.text;
        return null;
    }
    return v;
}

const txt = (v) => (v === null || v === undefined ? '' : String(v).trim());

function num(v) {
    if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) return 0;
    if (typeof v === 'number') return v;
    let s = String(v).trim().replace(/[$\s]/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');   // "1.234.567,89"
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}

// "27 de septiembre de 2026 16:14 hs." -> Date (hora local)
function parseFecha(v) {
    if (v instanceof Date) return v;
    const m = sinTildes(txt(v)).toLowerCase().match(/^\s*(\d{1,2}) de (\w+) de (\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (!m || !MESES[m[2]]) return null;
    return new Date(Number(m[3]), MESES[m[2]] - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0));
}

// "CC: 1112478558" -> { tipo: 'C', numero: '1112478558' }. Tipo vacío si no se reconoce.
function parseDocumento(v) {
    const s = txt(v);
    const m = s.match(/^\s*([A-Za-z.]+)\s*[:-]?\s*(.+)$/);
    if (!m) return { tipo: '', numero: s.replace(/[^0-9A-Za-z]/g, '') };
    const tipo = TIPOS_DOC[m[1].replace(/\./g, '').toUpperCase()] || '';
    let numero = m[2].replace(/[^0-9A-Za-z]/g, '');
    if (tipo === 'N') {
        // NIT con dígito de verificación ("900123456-7"): el código del tercero va sin DV.
        const partes = m[2].trim().split(/[-\s]/);
        if (partes.length === 2 && partes[1].length === 1) numero = partes[0].replace(/\D/g, '');
    }
    return { tipo, numero };
}

// La dirección de facturación de ML termina en ", Ciudad, Departamento".
function ciudadDeptoDeDireccion(direccion) {
    const partes = txt(direccion).split(',').map((p) => p.trim()).filter(Boolean);
    return partes.length >= 2 ? [partes.at(-2), partes.at(-1)] : ['', ''];
}

function ubicarColumnas(encabezados) {
    const vistos = {};
    const posiciones = {};
    encabezados.forEach((h, idx) => {
        const nombre = txt(h).replace(/[​\s]+/g, ' ').trim();
        if (!nombre) return;
        vistos[nombre] = (vistos[nombre] || 0) + 1;
        posiciones[`${nombre}|${vistos[nombre]}`] = idx;
    });
    const cols = {};
    for (const [clave, [nombre, ap]] of Object.entries(COLUMNAS)) {
        const pos = posiciones[`${nombre}|${ap}`];
        if (pos !== undefined) cols[clave] = pos;
    }
    const faltan = OBLIGATORIAS.filter((k) => cols[k] === undefined).map((k) => COLUMNAS[k][0]);
    if (faltan.length) {
        throw new AppError(`El archivo no tiene las columnas esperadas del reporte de ventas de Mercado Libre. Faltan: ${faltan.join(', ')}`, 422);
    }
    return cols;
}

async function leerFilas(origen) {
    const libro = new ExcelJS.Workbook();
    try {
        if (Buffer.isBuffer(origen)) await libro.xlsx.load(origen);
        else await libro.xlsx.readFile(origen);
    } catch (e) {
        throw new AppError('No se pudo abrir el archivo como Excel (.xlsx). Verifique que sea el reporte de ventas descargado de Mercado Libre.', 422);
    }
    const hoja = libro.worksheets[0];
    if (!hoja) throw new AppError('El archivo Excel no tiene hojas.', 422);
    const filas = [];
    hoja.eachRow({ includeEmpty: true }, (fila, nro) => {
        // ExcelJS indexa desde 1: se normaliza a arreglo desde 0.
        const valores = [];
        fila.eachCell({ includeEmpty: true }, (celda, col) => { valores[col - 1] = valorCelda(celda.value); });
        filas[nro - 1] = valores;
    });
    return filas;
}

// Lee el reporte y devuelve las ventas (paquetes ya agrupados) con alertas y bloqueos.
async function leer(origen, estadosExcluidos = []) {
    const filas = await leerFilas(origen);
    const filaEnc = filas.findIndex((f) => f && txt(f[0]) === '# de venta');
    if (filaEnc < 0) {
        throw new AppError('No se encontró la fila de encabezados ("# de venta"). ¿Es el reporte de Ventas de Mercado Libre?', 422);
    }
    const cols = ubicarColumnas(filas[filaEnc]);
    const g = (fila, clave) => (cols[clave] === undefined || !fila ? null : fila[cols[clave]] ?? null);
    const excluidos = estadosExcluidos.map((e) => sinTildes(e).toLowerCase());

    const ventas = [];
    const datos = filas.slice(filaEnc + 1);
    let i = 0;
    while (i < datos.length) {
        const fila = datos[i];
        const nroFila = filaEnc + 2 + i;
        i += 1;
        if (!fila || !txt(g(fila, 'venta'))) continue;

        let estado = txt(g(fila, 'estado'));
        const paquete = sinTildes(estado).toLowerCase().match(/paquete de (\d+) productos?/);
        const hijas = [];
        if (paquete) {
            // Las N filas siguientes son los productos del paquete.
            for (let k = 0; k < Number(paquete[1]); k += 1) {
                if (i < datos.length && datos[i] && txt(g(datos[i], 'sku'))) { hijas.push(datos[i]); i += 1; }
            }
            if (hijas.length) estado = txt(g(hijas[0], 'estado'));
        }

        const v = construirVenta(fila, nroFila, estado, hijas, g);
        if (paquete && hijas.length !== Number(paquete[1])) {
            v.bloqueos.push(`El paquete dice ${paquete[1]} productos pero se encontraron ${hijas.length}.`);
        }
        if (excluidos.some((e) => sinTildes(estado).toLowerCase().includes(e))) {
            v.bloqueos.push(`Estado "${estado}": no se envía.`);
        }
        ventas.push(v);
    }
    return ventas;
}

const pesos = (n) => Math.round(n).toLocaleString('es-CO');

function construirVenta(fila, nroFila, estado, hijas, g) {
    const alertas = [];
    const bloqueos = [];

    const items = (hijas.length ? hijas : [fila]).map((f) => {
        const cantidad = num(g(f, 'unidades'));
        let precio = num(g(f, 'precioUnitario'));
        const ingresos = num(g(f, 'ingresosProductos'));
        if (!hijas.length && cantidad > 0 && ingresos > 0) {
            // Lo que realmente pagó el comprador por unidad. Si difiere del precio de la
            // publicación hubo descuento o promoción: se avisa para revisar.
            const pagado = ingresos / cantidad;
            if (Math.abs(pagado - precio) > 1) {
                alertas.push(`${txt(g(f, 'sku'))}: el precio de la publicación (${pesos(precio)}) difiere de lo cobrado por unidad (${pesos(pagado)}); se usa lo cobrado.`);
            }
            precio = pagado;
        }
        return {
            sku: txt(g(f, 'sku')), titulo: txt(g(f, 'titulo')), variante: txt(g(f, 'variante')),
            cantidad, precioIva: precio, publicacion: txt(g(f, 'publicacion')),
        };
    });

    for (const it of items) {
        if (!it.sku) bloqueos.push(`Producto sin SKU: "${it.titulo}". No se puede relacionar con SIESA.`);
        if (it.cantidad <= 0) bloqueos.push(`${it.sku || it.titulo}: cantidad inválida.`);
        if (it.precioIva <= 0) bloqueos.push(`${it.sku || it.titulo}: precio en cero.`);
    }

    const ingresos = num(g(fila, 'ingresosProductos'));
    const suma = items.reduce((s, it) => s + it.cantidad * it.precioIva, 0);
    if (hijas.length && Math.abs(suma - ingresos) > 1) {
        alertas.push(`La suma de los productos (${pesos(suma)}) no cuadra con los ingresos del paquete (${pesos(ingresos)}).`);
    }
    if (num(g(fila, 'anulaciones')) !== 0) bloqueos.push('La venta tiene anulaciones o reembolsos.');
    if (num(g(fila, 'descuentos')) !== 0) alertas.push(`Tiene descuentos y bonificaciones (${pesos(num(g(fila, 'descuentos')))}).`);

    let { tipo: tipoDoc, numero: documento } = parseDocumento(g(fila, 'factDocumento'));
    const negocio = ['si', 'sí'].includes(sinTildes(txt(g(fila, 'negocio'))).toLowerCase());
    if (!documento) {
        bloqueos.push('El comprador no tiene documento de identidad en el reporte.');
    } else if (!tipoDoc) {
        alertas.push(`Tipo de documento no reconocido ("${txt(g(fila, 'factDocumento'))}"); se usa cédula.`);
        tipoDoc = 'C';
    }
    const [ciudadFact, deptoFact] = ciudadDeptoDeDireccion(g(fila, 'factDireccion'));

    const fecha = parseFecha(g(fila, 'fecha'));
    if (!fecha) bloqueos.push(`Fecha de venta no reconocida: "${txt(g(fila, 'fecha'))}".`);

    const formaEntrega = txt(g(fila, 'formaEntrega'));
    const tipoLogistica = logistica(formaEntrega);
    if (!tipoLogistica) {
        bloqueos.push(`Forma de entrega "${formaEntrega || 'vacía'}": no es Full ni Colecta, no se sabe de qué bodega sale.`);
    }

    return {
        numero: txt(g(fila, 'venta')),
        fila: nroFila,
        fecha: fecha ? fecha.toISOString() : null,
        fechaTexto: txt(g(fila, 'fecha')),
        estado,
        estadoDesc: txt(g(fila, 'estadoDesc')),
        items,
        fleteIva: num(g(fila, 'ingresosEnvio')),
        ingresosProductos: ingresos,
        comprador: {
            nombre: txt(g(fila, 'factNombre')) || txt(g(fila, 'comprador')),
            tipoDoc, documento,
            juridica: tipoDoc === 'N' || negocio,
            contribuyente: txt(g(fila, 'factContribuyente')),
            direccionFact: txt(g(fila, 'factDireccion')),
            ciudadFact, deptoFact,
            nombreEnvio: txt(g(fila, 'comprador')),
            direccionEnvio: txt(g(fila, 'domicilio')),
            ciudadEnvio: txt(g(fila, 'ciudad')),
            deptoEnvio: txt(g(fila, 'depto')),
            codPostal: txt(g(fila, 'codPostal')),
        },
        seguimiento: txt(g(fila, 'seguimiento')),
        formaEntrega,
        logistica: tipoLogistica,
        transportista: txt(g(fila, 'transportista')),
        alertas,
        bloqueos,
    };
}

const totalIva = (v) => v.items.reduce((s, it) => s + it.cantidad * it.precioIva, 0) + v.fleteIva;

module.exports = { leer, parseFecha, parseDocumento, ciudadDeptoDeDireccion, sinTildes, totalIva, logistica };
