// ================================================================
// FORMATO - pesos, fechas y estados de envío
// ================================================================
// Dígito de verificación (módulo 11 de la DIAN, pesos primos).
export function digitoVerificacion(documento) {
    const s = String(documento || '').replace(/\D/g, '');
    if (!s) return '';
    const factores = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    const suma = [...s].reverse().reduce((acc, ch, i) => (i < factores.length ? acc + Number(ch) * factores[i] : acc), 0);
    const r = suma % 11;
    return String(r > 1 ? 11 - r : r);
}

// Documento con su dígito de verificación: 1000007919-3.
export const conDv = (documento) => (documento ? `${documento}-${digitoVerificacion(documento)}` : '');

export const pesos = (n) => `$ ${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;

export const fechaHora = (v) => (v
    ? new Date(v).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '');

// Estados que muestra la interfaz (vista previa + resultado del envío).
export const ESTADOS = {
    lista: { color: 'green', texto: 'Lista' },
    bloqueada: { color: 'red', texto: 'Bloqueada' },
    enviada: { color: 'blue', texto: 'Enviada' },
    rechazada: { color: 'red', texto: 'Rechazada' },
    con_error: { color: 'orange', texto: 'Con error' },
    en_proceso: { color: 'grape', texto: 'Verificar' },
    en_espera: { color: 'cyan', texto: 'Esperando DIAN' },
    enviando: { color: 'gray', texto: 'Enviando' },
};

// Estados guardados en la BD (historial).
export const ESTADOS_BD = {
    importado: ESTADOS.enviada,
    rechazado: ESTADOS.rechazada,
    error: ESTADOS.con_error,
    enviando: ESTADOS.en_proceso,
    espera_dian: ESTADOS.en_espera,
};

// Se puede (re)enviar: lista, un intento anterior que falló sin llegar a SIESA, o una
// venta esperando a la DIAN (enviarla de nuevo adelanta el reintento automático).
export const enviable = (estado) => ['lista', 'rechazada', 'con_error', 'en_espera'].includes(estado);

// Versión corta del detalle de un envío para la tabla del Historial (el número del pedido
// ya está en su columna). El texto completo se ve al pasar el mouse y en el detalle de la venta.
const DETALLES_CORTOS = [
    [/ya estaba en SIESA/i, 'Ya estaba en SIESA'],
    [/encontrado en SIESA al consultarlo/i, 'Encontrado al consultar'],
    [/creado en SIESA/i, 'Pedido creado'],
    [/ya no está en SIESA/i, 'Pedido borrado en SIESA'],
    [/Habilitada por un administrador/i, 'Habilitada para reenviar'],
    [/comprador está inactivo/i, 'Comprador inactivo'],
    [/comprador no está registrado/i, 'Comprador no registrado'],
    [/no aceptó el registro del comprador/i, 'SIESA rechazó el cliente'],
    [/no aceptó el pedido/i, 'SIESA rechazó el pedido'],
    [/producto .* no existe en SIESA/i, 'Producto no existe en SIESA'],
    [/información del producto/i, 'Sin datos del producto'],
    [/DIAN no respondió para validar/i, 'Esperando la DIAN'],
    [/no respondió a tiempo/i, 'Sin respuesta de SIESA'],
    [/No fue posible comunicarse/i, 'Sin conexión con SIESA'],
];

export function detalleCorto(detalle) {
    const texto = String(detalle || '');
    const corto = DETALLES_CORTOS.find(([re]) => re.test(texto))?.[1] || texto.split('. ')[0];
    return /no se pudo validar si el comprador tiene RUT/i.test(texto) ? `${corto} - revisar RUT` : corto;
}
