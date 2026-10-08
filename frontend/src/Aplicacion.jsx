// ================================================================
// APLICACIÓN - router + rutas protegidas por sesión y rol
// ================================================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { ProveedorAuth, useAuth } from './contexto/ContextoAuth';
import Plantilla from './componentes/Plantilla';
import InicioSesion from './paginas/InicioSesion';
import CargarVentas from './paginas/CargarVentas';
import Cargue from './paginas/Cargue';
import Historial from './paginas/Historial';
import Parametros from './paginas/Parametros';
import Usuarios from './paginas/Usuarios';

function RutaProtegida({ children, roles }) {
    const { usuario, cargando } = useAuth();
    if (cargando) return <Center h="100vh"><Loader /></Center>;
    if (!usuario) return <Navigate to="/inicio-sesion" replace />;
    if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />;
    return children;
}

export default function Aplicacion() {
    return (
        <ProveedorAuth>
            <BrowserRouter>
                <Routes>
                    <Route path="/inicio-sesion" element={<InicioSesion />} />
                    <Route path="/" element={<RutaProtegida><Plantilla /></RutaProtegida>}>
                        <Route index element={<CargarVentas />} />
                        <Route path="cargues/:id" element={<Cargue />} />
                        <Route path="historial" element={<Historial />} />
                        <Route path="parametros" element={<RutaProtegida roles={['admin']}><Parametros /></RutaProtegida>} />
                        <Route path="usuarios" element={<RutaProtegida roles={['admin']}><Usuarios /></RutaProtegida>} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </ProveedorAuth>
    );
}
