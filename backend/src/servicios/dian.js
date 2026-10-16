// ================================================================
// CONSULTA DEL RUT EN LA DIAN - si una persona natural tiene RUT
//
// Usa la página pública "Consulta de Inconsistencias" de MUISCA, que pide NIT y dígito
// de verificación y no tiene captcha:
//   - con RUT: muestra la razón social (el nombre de la persona).
//   - sin RUT: "El NIT ... no es válido. Verifique que el NIT se encuentre registrado en el RUT."
// No es un servicio para sistemas: se lee la página como lo haría una persona. Si la DIAN
// la cambia o no responde, el resultado es 'desconocido' y quien llama decide.
//
//   consultarRut(documento) -> { estado: con_rut | sin_rut | desconocido, nombre, mensaje }
// ================================================================
const { digitoVerificacion } = require('./siesa/documentos');

const URL_DIAN = 'https://muisca.dian.gov.co/WebGestionmasiva/DefSelPublicacionesExterna.faces';
const FORM = 'vistaSelPublicacionesExterna:formSelPublicacionesExterna';

// La página viene en ISO-8859-1.
const texto = async (r) => new TextDecoder('latin1').decode(await r.arrayBuffer());

const decodificar = (s) => s
    .replace(/&([aeiou])acute;/gi, (m, v) => ({ a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' })[v.toLowerCase()])
    .replace(/&ntilde;/gi, 'ñ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// Interpreta la respuesta de la consulta.
function interpretar(html) {
    const razon = html.match(new RegExp(`id="${FORM}:razonSocial"[^>]*>([^<]*)<`));
    if (razon && decodificar(razon[1])) return { estado: 'con_rut', nombre: decodificar(razon[1]), mensaje: '' };
    if (/no es v(?:á|&aacute;)lido/i.test(html) && /registrado en el RUT/i.test(html)) {
        return { estado: 'sin_rut', nombre: '', mensaje: 'No está inscrito en el RUT.' };
    }
    return { estado: 'desconocido', nombre: '', mensaje: 'La respuesta de la DIAN no se pudo interpretar.' };
}

// Campos ocultos del formulario (estado de la vista JSF) para enviar la consulta.
function camposFormulario(html) {
    const inicio = html.indexOf(`<form id="${FORM}"`);
    if (inicio < 0) return null;
    const form = html.slice(inicio, html.indexOf('</form>', inicio));
    const action = form.match(/action="([^"]+)"/);
    if (!action) return null;
    const datos = new URLSearchParams();
    for (const [input] of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
        const nombre = input.match(/name="([^"]+)"/);
        if (nombre) datos.set(nombre[1], (input.match(/value="([^"]*)"/) || [])[1] || '');
    }
    return { action: new URL(action[1], URL_DIAN).href, datos };
}

async function consultarRut(documento, { timeoutMs = 20000 } = {}) {
    const nit = String(documento || '').replace(/\D/g, '');
    if (!nit) return { estado: 'desconocido', nombre: '', mensaje: 'Sin documento.' };
    try {
        const r1 = await fetch(URL_DIAN, { signal: AbortSignal.timeout(timeoutMs) });
        if (r1.status !== 200) return { estado: 'desconocido', nombre: '', mensaje: `La DIAN respondió HTTP ${r1.status}.` };
        const form = camposFormulario(await texto(r1));
        if (!form) return { estado: 'desconocido', nombre: '', mensaje: 'La página de la DIAN cambió o está en mantenimiento.' };
        const cookie = r1.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
        form.datos.set(`${FORM}:numNit`, nit);
        form.datos.set(`${FORM}:dv`, digitoVerificacion(nit));
        form.datos.set(`${FORM}:btnBuscar.x`, '10');
        form.datos.set(`${FORM}:btnBuscar.y`, '10');
        const r2 = await fetch(form.action, {
            method: 'POST', body: form.datos,
            headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (r2.status !== 200) return { estado: 'desconocido', nombre: '', mensaje: `La DIAN respondió HTTP ${r2.status}.` };
        return interpretar(await texto(r2));
    } catch (e) {
        const mensaje = e.name === 'TimeoutError' ? `La DIAN no respondió en ${timeoutMs / 1000} s.` : `No hubo conexión con la DIAN: ${e.cause?.message || e.message}`;
        return { estado: 'desconocido', nombre: '', mensaje };
    }
}

module.exports = { consultarRut, interpretar, camposFormulario };
