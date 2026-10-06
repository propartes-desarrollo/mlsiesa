// ================================================================
// CONTEXTO DE AUTENTICACIÓN
// ================================================================
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { autenticacion } from '../api/indice';

const ContextoAuth = createContext(null);

export function ProveedorAuth({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const u = localStorage.getItem('usuario_mlsiesa');
        if (u) { try { setUsuario(JSON.parse(u)); } catch { localStorage.clear(); } }
        setCargando(false);
    }, []);

    const iniciarSesion = useCallback(async (correo, contrasena) => {
        const { data } = await autenticacion.inicioSesion({ correo, contrasena });
        localStorage.setItem('token_mlsiesa', data.token);
        localStorage.setItem('usuario_mlsiesa', JSON.stringify(data.usuario));
        setUsuario(data.usuario);
        return data;
    }, []);

    const cerrarSesion = useCallback(() => {
        localStorage.removeItem('token_mlsiesa');
        localStorage.removeItem('usuario_mlsiesa');
        setUsuario(null);
    }, []);

    const esAdmin = usuario?.rol === 'admin';

    return (
        <ContextoAuth.Provider value={{ usuario, cargando, iniciarSesion, cerrarSesion, esAdmin }}>
            {children}
        </ContextoAuth.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(ContextoAuth);
    if (!ctx) throw new Error('useAuth debe usarse dentro de ProveedorAuth');
    return ctx;
}
