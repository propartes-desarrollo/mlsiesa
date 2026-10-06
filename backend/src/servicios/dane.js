// ================================================================
// CÓDIGOS DANE (DIVIPOLA) - homologa ciudad/departamento de Mercado Libre
// a F015_ID_DEPTO (2) y F015_ID_CIUDAD (3) de SIESA. El ejemplo de U2 usa
// 11/001 para Bogotá, que es el código DANE. Pendiente: confirmar con TI que el
// maestro de ciudades de SIESA usa DIVIPOLA para todos los municipios.
//
// La tabla no es exhaustiva: capitales y municipios vistos en los reportes.
// Los que falten se agregan en la tabla municipios de la BD (ver rutas/catalogos.js).
// Si una ciudad no se resuelve, el tercero se envía sin depto/ciudad (son
// opcionales) y la venta queda con una alerta.
// ================================================================
const { sinTildes } = require('./excelMl');

const DEPTOS = {
    'amazonas': '91',
    'antioquia': '05',
    'arauca': '81',
    'atlantico': '08',
    'bogota': '11',
    'bolivar': '13',
    'boyaca': '15',
    'caldas': '17',
    'caqueta': '18',
    'casanare': '85',
    'cauca': '19',
    'cesar': '20',
    'choco': '27',
    'cordoba': '23',
    'cundinamarca': '25',
    'guainia': '94',
    'guaviare': '95',
    'huila': '41',
    'la guajira': '44',
    'magdalena': '47',
    'meta': '50',
    'narino': '52',
    'norte de santander': '54',
    'putumayo': '86',
    'quindio': '63',
    'risaralda': '66',
    'san andres': '88',
    'santander': '68',
    'sucre': '70',
    'tolima': '73',
    'valle del cauca': '76',
    'vaupes': '97',
    'vichada': '99'
};

const MUNICIPIOS = {
    '05': {
        'medellin': '001',
        'envigado': '266',
        'copacabana': '212',
        'bello': '088',
        'itagui': '360',
        'sabaneta': '631',
        'rionegro': '615',
        'la estrella': '380',
        'caldas': '129'
    },
    '08': {
        'barranquilla': '001',
        'soledad': '758',
        'malambo': '433',
        'puerto colombia': '573'
    },
    '11': {
        'bogota': '001'
    },
    '13': {
        'cartagena': '001',
        'cartagena de indias': '001'
    },
    '15': {
        'tunja': '001',
        'duitama': '238',
        'sogamoso': '759',
        'chiquinquira': '176',
        'paipa': '516'
    },
    '17': {
        'manizales': '001',
        'villamaria': '873'
    },
    '18': {
        'florencia': '001'
    },
    '19': {
        'popayan': '001'
    },
    '20': {
        'valledupar': '001'
    },
    '23': {
        'monteria': '001'
    },
    '25': {
        'soacha': '754',
        'mosquera': '473',
        'cota': '214',
        'zipaquira': '899',
        'guaduas': '320',
        'chia': '175',
        'funza': '286',
        'madrid': '430',
        'facatativa': '269',
        'fusagasuga': '290',
        'girardot': '307',
        'cajica': '126',
        'tocancipa': '817',
        'la calera': '377',
        'sopo': '758'
    },
    '27': {
        'quibdo': '001'
    },
    '41': {
        'neiva': '001',
        'pitalito': '551'
    },
    '44': {
        'riohacha': '001'
    },
    '47': {
        'santa marta': '001'
    },
    '50': {
        'villavicencio': '001'
    },
    '52': {
        'pasto': '001'
    },
    '54': {
        'cucuta': '001'
    },
    '63': {
        'armenia': '001',
        'calarca': '130'
    },
    '66': {
        'pereira': '001',
        'dosquebradas': '170'
    },
    '68': {
        'bucaramanga': '001',
        'giron': '307',
        'floridablanca': '276',
        'piedecuesta': '547',
        'barrancabermeja': '081'
    },
    '70': {
        'sincelejo': '001'
    },
    '73': {
        'ibague': '001'
    },
    '76': {
        'cali': '001',
        'santiago de cali': '001',
        'jamundi': '364',
        'palmira': '520',
        'yumbo': '892',
        'tulua': '834',
        'buenaventura': '109',
        'cartago': '147'
    },
    '81': {
        'arauca': '001'
    },
    '85': {
        'yopal': '001'
    },
    '86': {
        'mocoa': '001'
    },
    '88': {
        'san andres': '001'
    },
    '91': {
        'leticia': '001'
    },
    '94': {
        'inirida': '001'
    },
    '95': {
        'san jose del guaviare': '001'
    },
    '97': {
        'mitu': '001'
    },
    '99': {
        'puerto carreno': '001'
    }
};

function normalizar(s) {
    return sinTildes(s).toLowerCase()
        .replace(/\bd\.?\s*c\.?$/, '')          // "Bogotá D.C."
        .replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// adicionales: { '<depto>': { '<municipio normalizado>': '<código>' } } desde la BD.
function resolver(ciudad, depto, adicionales = {}) {
    const cd = DEPTOS[normalizar(depto)];
    if (!cd) return ['', ''];
    if (cd === '11') return ['11', '001'];   // en Bogotá ML pone la localidad (Suba, Kennedy...)
    const nc = normalizar(ciudad);
    const cc = adicionales[cd]?.[nc] || MUNICIPIOS[cd]?.[nc];
    return cc ? [cd, cc] : ['', ''];
}

module.exports = { resolver, normalizar, DEPTOS };
