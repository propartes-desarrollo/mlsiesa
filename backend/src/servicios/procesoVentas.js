// ================================================================
// PROCESO DE UNA VENTA - vista previa y envío (tercero si hace falta -> pedido)
// Las dependencias (repositorio de envíos y cliente SOAP) se inyectan para
// poder probar el flujo completo sin tocar la BD ni SIESA.
// ================================================================
const documentos = require('./siesa/documentos');
const { totalIva } = require('./excelMl');

const ESTADO_UI = { importado: 'enviada', rechazado: 'rechazada', error: 'con_error', enviando: 'en_proceso' };

function vistaPrevia(venta, cfg, previo = null, municipios = {}) {
    const alertas = [...venta.alertas];
    const bloqueos = [...venta.bloqueos];
    const c = venta.comprador;
    const tercero = c.documento ? documentos.datosTercero(venta, cfg, municipios) : null;

    if (tercero && !tercero.depto) {
        alertas.push(`Ciudad "${c.ciudadFact || c.ciudadEnvio}, ${c.deptoFact || c.deptoEnvio}" sin código SIESA: el tercero se crearía sin ciudad.`);
    }
    if (c.juridica) alertas.push('Comprador empresa: revisar razón social y retenciones antes de crear el tercero.');

    if (!bloqueos.length) bloqueos.push(...documentos.verificarLargos(documentos.pedidoLineas(venta, cfg)));

    const detalle = documentos.lineasDetalle(venta, cfg);
    const totalNeto = detalle.reduce((s, d) => s + d.cantidad * d.precioNeto, 0);
    const totalSiesa = Math.round(totalNeto * (1 + cfg.pedido.iva_pct / 100));
    const totalMl = Math.round(totalIva(venta) * 100) / 100;
    if (Math.abs(totalSiesa - totalMl) > detalle.length * 2) {
        alertas.push(`El total que liquidará SIESA (~${totalSiesa.toLocaleString('es-CO')}) difiere de lo cobrado en ML (${totalMl.toLocaleString('es-CO')}).`);
    }

    return {
        venta: venta.numero,
        fila: venta.fila,
        fecha: venta.fecha,
        estadoMl: venta.estado,
        estado: previo ? ESTADO_UI[previo.estado] : (bloqueos.length ? 'bloqueada' : 'lista'),
        previo,
        comprador: {
            nombre: c.nombre, tipoDoc: c.tipoDoc, documento: c.documento, juridica: c.juridica,
            ciudad: c.ciudadEnvio, depto: c.deptoEnvio, direccionEnvio: c.direccionEnvio,
        },
        tercero,
        lineas: detalle,
        totalMl, totalNeto, totalSiesaAprox: totalSiesa,
        seguimiento: venta.seguimiento,
        alertas, bloqueos,
    };
}

// Envía una venta. Nunca lanza por errores de SIESA: devuelve { estado, mensaje, pasos }.
async function enviar(venta, cfg, ctx, { repo, soap }, municipios = {}) {
    const pv = vistaPrevia(venta, cfg, null, municipios);
    if (pv.bloqueos.length) return { estado: 'bloqueada', mensaje: pv.bloqueos.join(' '), pasos: [] };

    if (!(await repo.reclamar(venta.numero, ctx))) {
        const previo = (await repo.obtener([venta.numero]))[venta.numero];
        return previo?.estado === 'importado'
            ? { estado: 'enviada', mensaje: 'Ya se había importado en SIESA; no se reenvía.', pasos: [] }
            : { estado: 'en_proceso', mensaje: 'Otra persona está enviando esta venta en este momento.', pasos: [] };
    }

    const pasos = [];
    const lineasPedido = documentos.pedidoLineas(venta, cfg);
    const registro = {
        documentoPedido: soap.documento(lineasPedido, cfg.siesa, true),
        documentoTercero: '',
        terceroCreado: false,
        resumen: {
            comprador: venta.comprador.nombre, documento: venta.comprador.documento,
            totalMl: pv.totalMl, items: venta.items.length,
        },
    };
    const terminar = async (estado, detalle, respuesta = '') => {
        await repo.finalizar(venta.numero, { ...registro, estado, detalle, respuesta });
        return { estado: ESTADO_UI[estado], mensaje: detalle, pasos };
    };

    try {
        if (cfg.envio.validar_tercero) {
            const t = await soap.consultarTercero(venta.comprador.documento, cfg.siesa);
            pasos.push(`Tercero ${venta.comprador.documento}: ${t.estado}${t.mensaje ? ` (${t.mensaje})` : ''}`);
            if (t.estado === 'inactivo') return terminar('error', 'El comprador está inactivo en SIESA. Revisar con cartera o TI.');
            if (t.estado === 'no_existe') {
                if (!cfg.envio.crear_tercero) {
                    return terminar('error', 'El comprador no existe en SIESA y la creación de terceros está desactivada. Crearlo en SIESA y volver a enviar.');
                }
                const lineasTercero = documentos.terceroLineas(venta, cfg, t.tercero, municipios);
                registro.documentoTercero = soap.documento(lineasTercero, cfg.siesa, true);
                const r = await soap.importar(lineasTercero, cfg.siesa);
                pasos.push(`Crear tercero: ${r.mensaje}`);
                if (!r.exito) return terminar(r.codigo === '1' ? 'rechazado' : 'error', `No se pudo crear el tercero: ${r.mensaje}`, r.respuesta);
                registro.terceroCreado = true;
            }
        }

        const r = await soap.importar(lineasPedido, cfg.siesa);
        pasos.push(`Pedido: ${r.mensaje}`);
        if (!r.exito) return terminar(r.codigo === '1' ? 'rechazado' : 'error', `Pedido: ${r.mensaje}`, r.respuesta);
        return terminar('importado', 'Pedido importado en SIESA.', r.respuesta);
    } catch (e) {
        if (!(e instanceof soap.ErrorSiesa)) {
            // Error inesperado: no se sabe si SIESA alcanzó a importar. Queda 'enviando'
            // para que un admin lo verifique antes de liberarlo.
            throw e;
        }
        pasos.push(e.message);
        if (e.incierto) {
            // Queda 'enviando' (bloqueada): un admin verifica en SIESA y la libera si no entró.
            return terminar('enviando', `${e.message} No se sabe si SIESA registró el documento: verificar en SIESA antes de reintentar.`);
        }
        return terminar('error', e.message);
    }
}

module.exports = { vistaPrevia, enviar, ESTADO_UI };
