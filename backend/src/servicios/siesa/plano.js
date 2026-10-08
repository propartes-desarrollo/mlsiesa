// ================================================================
// PLANO DE ANCHO FIJO - primitivas del Conector de SIESA (UnoEE)
// Port de PSS_Plano (propartes-siesa-sync). Cada registro es una cadena
// donde cada campo ocupa una posición y un tamaño exactos: un carácter de
// desplazamiento corrompe el documento entero y SIESA no dice dónde.
// Se prueba en pruebas/plano.test.js contra el ejemplo de TI que sí importa.
// ================================================================

const TRANSLITERACION = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U', 'Ñ': 'N',
    'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u', 'ç': 'c', 'Ç': 'C',
    'â': 'a', 'ê': 'e', 'î': 'i', 'ô': 'o', 'û': 'u', 'ã': 'a', 'õ': 'o',
    'º': '.', 'ª': '.', '°': '.', '–': '-', '—': '-', '“': '"', '”': '"', '‘': "'", '’': "'",
};

// Un carácter = un byte: así no importa si SIESA cuenta bytes o caracteres.
function ascii(v) {
    return [...String(v)].map((c) => TRANSLITERACION[c] ?? c).join('').replace(/[^\x20-\x7E]/g, ' ');
}

// Numérico: ceros a la izquierda, recortado por la izquierda si se pasa.
function n(v, tam) {
    const s = String(v).replace(/\D/g, '') || '0';
    return s.padStart(tam, '0').slice(-tam);
}

// Alfanumérico: transliterado, en MAYÚSCULAS (política de uso del ERP: todo lo que entra
// a SIESA va en mayúsculas), espacios a la derecha, recortado al tamaño.
// Excepción: los correos van en minúsculas.
const ES_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function a(v, tam) {
    const texto = ascii(String(v).replace(/[\r\n\t]/g, ' '));
    const caso = ES_CORREO.test(texto.trim()) ? texto.toLowerCase() : texto.toUpperCase();
    return caso.slice(0, tam).padEnd(tam, ' ');
}

// Decimal: (tam - decimales - 1) enteros, punto y decimales. d(11, 20) -> 000000000000011.0000
function d(v, tam, decimales = 4) {
    const enteros = tam - decimales - 1;
    const num = Number(v) || 0;
    const neg = num < 0;
    // toFixed sobre el valor ya redondeado a 6 decimales evita arrastres de coma flotante.
    const [ent, dec] = Math.abs(Number(num.toFixed(6))).toFixed(decimales).split('.');
    let parte = ent.slice(-enteros).padStart(enteros, '0');
    if (neg) parte = '-' + parte.slice(1);
    return `${parte}.${dec}`;
}

// Arma un registro a partir de su layout [[campo, tamaño, tipo A|N|D|P], ...].
// P = porcentaje con 2 decimales (0100.00), D = decimal con 4.
function registro(layout, valores) {
    return layout.map(([nombre, tam, tipo]) => {
        const v = valores[nombre];
        if (v === undefined || v === null) {
            return tipo === 'A' ? ' '.repeat(tam) : tipo === 'D' ? d(0, tam) : tipo === 'P' ? d(0, tam, 2) : n(0, tam);
        }
        return tipo === 'A' ? a(v, tam) : tipo === 'D' ? d(v, tam) : tipo === 'P' ? d(v, tam, 2) : n(v, tam);
    }).join('');
}

// Registro de control (0000 inicio / 9999 cierre): 18 caracteres.
function control(consecutivo, tipo, cia) {
    return n(consecutivo, 7) + n(tipo, 4) + n(0, 2) + n(1, 2) + n(cia, 3);
}

function escaparXml(v) {
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// El XML <Importar>. El orden de los elementos es fijo: SIESA valida contra un esquema.
function envolver(lineas, { conexion, cia, usuario, clave }) {
    return [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<Importar>',
        `  <NombreConexion>${escaparXml(conexion)}</NombreConexion>`,
        `  <IdCia>${escaparXml(cia)}</IdCia>`,
        `  <Usuario>${escaparXml(usuario)}</Usuario>`,
        `  <Clave>${escaparXml(clave)}</Clave>`,
        '  <Datos>',
        ...lineas.map((l) => `    <Linea>${escaparXml(l)}</Linea>`),
        '  </Datos>',
        '</Importar>',
        '',
    ].join('\n');
}

const largo = (layout) => layout.reduce((s, [, t]) => s + t, 0);

// SIESA rechaza precios con fracción de centavo: se sube a peso entero.
const ceilPesos = (v) => Math.ceil(Number(Number(v).toFixed(6)));

// Extrae el valor crudo de un campo (pruebas y diagnóstico).
function campo(layout, linea, nombre) {
    let pos = 0;
    for (const [c, tam] of layout) {
        if (c === nombre) return linea.slice(pos, pos + tam);
        pos += tam;
    }
    throw new Error(`Campo inexistente: ${nombre}`);
}

module.exports = { ascii, n, a, d, registro, control, envolver, escaparXml, largo, ceilPesos, campo };
