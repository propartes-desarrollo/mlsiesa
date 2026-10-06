// ================================================================
// API - capa única de acceso al backend (axios + interceptores)
// Todas las llamadas al backend pasan por aquí.
// ================================================================
import axios from 'axios';

// Vacío => llamadas relativas a /api (Nginx/Vite hacen el proxy).
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const api = axios.create({
    baseURL: `${baseURL}/api`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

// Inyecta el JWT en cada petición
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token_mlsiesa');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Ante 401, limpia la sesión y manda al login
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token_mlsiesa');
            localStorage.removeItem('usuario_mlsiesa');
            if (window.location.pathname !== '/inicio-sesion') window.location.href = '/inicio-sesion';
        }
        return Promise.reject(error);
    }
);

// Mensaje legible de un error de axios.
export const mensajeError = (err, porDefecto = 'Ocurrió un error') => err.response?.data?.mensaje || err.message || porDefecto;

export const autenticacion = {
    inicioSesion: (datos) => api.post('/auth/inicio-sesion', datos),
    obtenerPerfil: () => api.get('/auth/perfil'),
};

export const ventasMl = {
    cargar: (archivo) => {
        const datos = new FormData();
        datos.append('archivo', archivo);
        return api.post('/ventas-ml/cargues', datos, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
    },
    listarCargues: () => api.get('/ventas-ml/cargues'),
    obtenerCargue: (id) => api.get(`/ventas-ml/cargues/${id}`),
    documento: (id, venta, tipo) => api.get(`/ventas-ml/cargues/${id}/ventas/${venta}/documento`, { params: { tipo } }),
    // SIESA puede tardar (crear tercero + pedido): hasta 2 x 180 s.
    enviar: (id, venta) => api.post(`/ventas-ml/cargues/${id}/ventas/${venta}/enviar`, {}, { timeout: 400000 }),
};

export const envios = {
    listar: (filtros) => api.get('/envios', { params: filtros }),
    detalle: (venta) => api.get(`/envios/${venta}`),
    liberar: (venta) => api.post(`/envios/${venta}/liberar`, {}),
    consultarSiesa: (venta) => api.post(`/envios/${venta}/consultar-siesa`, {}, { timeout: 200000 }),
};

export const parametros = {
    estado: () => api.get('/parametros/estado'),
    listar: () => api.get('/parametros'),
    guardar: (clave, valor) => api.put(`/parametros/${encodeURIComponent(clave)}`, { valor }),
    restaurar: (clave) => api.delete(`/parametros/${encodeURIComponent(clave)}`),
    municipios: () => api.get('/parametros/municipios'),
    guardarMunicipio: (datos) => api.post('/parametros/municipios', datos),
};

export const usuarios = {
    listar: () => api.get('/usuarios'),
    crear: (datos) => api.post('/usuarios', datos),
    actualizar: (id, datos) => api.put(`/usuarios/${id}`, datos),
};

export default api;
