// ================================================================
// FORMATO - pesos, fechas y estados de envío
// ================================================================
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
