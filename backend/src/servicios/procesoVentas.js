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
        alertas.push(`La ciudad "${c.ciudadFact || c.ciudadEnvio}, ${c.deptoFact || c.deptoEnvio}" no está registrada en la app: si el comprador es nuevo, quedaría en SIESA sin ciudad. Un administrador puede agregarla.`);
    }
    if (c.juridica) alertas.push('El comprador es una empresa: si no está registrada en SIESA, un administrador debe revisar sus datos tributarios antes de enviar.');
    const idBodega = documentos.bodega(venta, cfg);
    if (venta.logistica === undefined) {
        bloqueos.push('Este archivo se cargó con una versión anterior de la app: vuelva a subirlo.');
    } else if (venta.logistica && !idBodega) {
        bloqueos.push(`No hay bodega configurada para las ventas ${documentos.LOGISTICA[venta.logistica]}. Avise al administrador.`);
    }

    // Un registro con el largo equivocado no debería pasar nunca: el detalle queda en el log.
    if (!bloqueos.length && documentos.verificarLargos(documentos.pedidoLineas(venta, cfg)).length) {
        bloqueos.push('No se pudo preparar el pedido de esta venta. Avise al administrador.');
    }

    const detalle = documentos.lineasDetalle(venta, cfg);
    const totalNeto = detalle.reduce((s, d) => s + d.cantidad * d.precioNeto, 0);
    const totalSiesa = Math.round(totalNeto * (1 + cfg.pedido.iva_pct / 100));
    const totalMl = Math.round(totalIva(venta) * 100) / 100;
    if (Math.abs(totalSiesa - totalMl) > detalle.length * 2) {
        alertas.push(`El total con IVA en SIESA (aprox. $ ${totalSiesa.toLocaleString('es-CO')}) es distinto de lo cobrado en Mercado Libre ($ ${totalMl.toLocaleString('es-CO')}).`);
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
        logistica: venta.logistica || '',
        bodega: idBodega,
        notas: documentos.notas(venta),
        lineas: detalle,
        totalMl, totalNeto, totalSiesaAprox: totalSiesa,
        seguimiento: venta.seguimiento,
        alertas, bloqueos,
    };
}

// Centro de costo de cada SKU según SIESA. Devuelve { ccostos, error }: error cuando
// algún ítem no existe, o cuando no se pudo saber su centro de costo y no hay respaldo.
async function resolverCcostos(venta, cfg, soap, pasos) {
    const ccostos = {};
    for (const sku of [...new Set(venta.items.map((it) => it.sku))]) {
        const r = await soap.consultarItem(sku, cfg.siesa);
        if (r.estado === 'ok') {
            ccostos[sku] = r.ccosto;
            pasos.push(`Ítem ${sku}: centro de costo ${r.ccosto}`);
        } else if (r.estado === 'no_existe') {
            pasos.push(`Ítem ${sku}: ${r.mensaje}`);
            return { ccostos, error: `El producto ${sku} no existe en SIESA. Revise el SKU de la publicación en Mercado Libre.` };
        } else if (cfg.pedido.ccosto) {
            pasos.push(`Ítem ${sku}: ${r.mensaje} Se usa el centro de costo de respaldo ${cfg.pedido.ccosto}.`);
        } else {
            // Sin centro de costo, SIESA rechaza el pedido.
            pasos.push(`Ítem ${sku}: ${r.mensaje}`);
            return { ccostos, error: `No se pudo obtener la información del producto ${sku} en SIESA. Intente de nuevo en unos minutos.` };
        }
    }
    return { ccostos, error: '' };
}

// Envía una venta. Nunca lanza por errores de SIESA: devuelve { estado, mensaje, pasos }.
async function enviar(venta, cfg, ctx, { repo, soap }, municipios = {}) {
    const pv = vistaPrevia(venta, cfg, null, municipios);
    if (pv.bloqueos.length) return { estado: 'bloqueada', mensaje: pv.bloqueos.join(' '), pasos: [] };

    if (!(await repo.reclamar(venta.numero, ctx))) {
        const previo = (await repo.obtener([venta.numero]))[venta.numero];
        return previo?.estado === 'importado'
            ? { estado: 'enviada', mensaje: 'Esta venta ya se había enviado a SIESA; no se vuelve a enviar.', pasos: [] }
            : { estado: 'en_proceso', mensaje: 'Otra persona está enviando esta venta en este momento.', pasos: [] };
    }

    const pasos = [];
    let lineasPedido = documentos.pedidoLineas(venta, cfg);
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
        // Si el pedido ya está en SIESA (enviado antes por otra vía, o un envío anterior
        // sin respuesta), no se vuelve a importar. Si la consulta no responde, se sigue.
        const previo = await soap.consultarPedido(documentos.referenciaMl(venta.numero), cfg.siesa);
        if (previo.estado === 'encontrado') {
            registro.pedidoSiesa = previo.pedidos[0];
            pasos.push(`Pedido ya existente en SIESA: ${previo.pedidos[0].numero}`);
            return terminar('importado', `Esta venta ya estaba en SIESA como pedido ${previo.pedidos[0].numero}; no se vuelve a enviar.`);
        }

        const { ccostos, error } = await resolverCcostos(venta, cfg, soap, pasos);
        if (error) return terminar('error', error);
        lineasPedido = documentos.pedidoLineas(venta, cfg, ccostos);
        registro.documentoPedido = soap.documento(lineasPedido, cfg.siesa, true);

        if (cfg.envio.validar_tercero) {
            const t = await soap.consultarTercero(venta.comprador.documento, cfg.siesa);
            pasos.push(`Tercero ${venta.comprador.documento}: ${t.estado}${t.mensaje ? ` (${t.mensaje})` : ''}`);
            if (t.estado === 'inactivo') return terminar('error', 'El comprador está inactivo en SIESA. Pida a cartera que lo active y vuelva a enviar.');
            if (t.estado === 'no_existe') {
                if (!cfg.envio.crear_tercero) {
                    return terminar('error', 'El comprador no está registrado en SIESA. Regístrelo en SIESA (o pida a un administrador que active el registro de compradores nuevos) y vuelva a enviar.');
                }
                const lineasTercero = documentos.terceroLineas(venta, cfg, t.tercero, municipios);
                registro.documentoTercero = soap.documento(lineasTercero, cfg.siesa, true);
                const r = await soap.importar(lineasTercero, cfg.siesa);
                pasos.push(`Crear tercero: ${r.mensaje}`);
                if (!r.exito) return terminar(r.codigo === '1' ? 'rechazado' : 'error', 'SIESA no aceptó el registro del comprador como cliente. Avise al administrador.', r.respuesta);
                registro.terceroCreado = true;
            }
        }

        const r = await soap.importar(lineasPedido, cfg.siesa);
        pasos.push(`Pedido: ${r.mensaje}`);
        if (!r.exito) return terminar(r.codigo === '1' ? 'rechazado' : 'error', 'SIESA no aceptó el pedido. Avise al administrador para revisar los datos.', r.respuesta);

        // ImportarXML no devuelve el número del pedido: se busca por la referencia.
        const p = await soap.consultarPedido(documentos.referenciaMl(venta.numero), cfg.siesa);
        if (p.estado === 'encontrado') {
            registro.pedidoSiesa = p.pedidos[0];
            pasos.push(`Pedido en SIESA: ${p.pedidos[0].numero}`);
            return terminar('importado', `Pedido ${p.pedidos[0].numero} creado en SIESA.`, r.respuesta);
        }
        pasos.push(`No se pudo leer el número del pedido: ${p.mensaje}`);
        return terminar('importado', 'Pedido creado en SIESA. El número se puede consultar en el Historial.', r.respuesta);
    } catch (e) {
        if (!(e instanceof soap.ErrorSiesa)) {
            // Error inesperado: no se sabe si SIESA alcanzó a importar. Queda 'enviando'
            // para que un admin lo verifique antes de liberarlo.
            throw e;
        }
        pasos.push(e.message);
        if (e.incierto) {
            // Queda 'enviando' (bloqueada): un admin verifica en SIESA y la libera si no entró.
            return terminar('enviando', 'SIESA no respondió a tiempo y no se sabe si el pedido quedó creado. Consulte la venta en el Historial antes de volver a enviarla.');
        }
        return terminar('error', 'No fue posible comunicarse con SIESA. Intente de nuevo en unos minutos.');
    }
}

module.exports = { vistaPrevia, enviar, ESTADO_UI };
