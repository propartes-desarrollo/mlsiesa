// ================================================================
// PLANTILLA - layout protegido (AppShell) con navegación por rol
// ================================================================
import { useEffect, useState } from 'react';
import { Outlet, NavLink as EnlaceRuta, useLocation } from 'react-router-dom';
import { AppShell, Group, Text, Button, Avatar, NavLink, Burger, Badge, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { LogOut, Upload, History, SlidersHorizontal, Users } from 'lucide-react';
import { useAuth } from '../contexto/ContextoAuth';
import { parametros } from '../api/indice';

const MENU = [
    { ruta: '/', etiqueta: 'Cargar ventas', icono: Upload, roles: ['admin', 'usuario'] },
    { ruta: '/historial', etiqueta: 'Historial de envíos', icono: History, roles: ['admin', 'usuario'] },
    { ruta: '/parametros', etiqueta: 'Configuración', icono: SlidersHorizontal, roles: ['admin'] },
    { ruta: '/usuarios', etiqueta: 'Usuarios', icono: Users, roles: ['admin'] },
];

export function EstadoSiesa({ estado }) {
    if (!estado) return null;
    const pruebas = /prueba/i.test(estado.conexion);
    return (
        <Group gap={6}>
            {pruebas && (
                <Tooltip label="Los pedidos se crean en el ambiente de pruebas de SIESA, no en el real">
                    <Badge variant="light" color="yellow">SIESA de pruebas</Badge>
                </Tooltip>
            )}
            {estado.envioActivo
                ? <Badge variant="light" color="green">Envío activo</Badge>
                : <Tooltip label="Se pueden cargar y revisar ventas, pero no enviarlas. Un administrador activa el envío."><Badge variant="light" color="orange">Solo revisión</Badge></Tooltip>}
            {!estado.claveConfigurada && <Badge variant="light" color="red">Sin conexión con SIESA</Badge>}
        </Group>
    );
}

export default function Plantilla() {
    const { usuario, cerrarSesion } = useAuth();
    const [abierto, { toggle, close }] = useDisclosure();
    const [estado, setEstado] = useState(null);
    const ubicacion = useLocation();
    const inicial = usuario?.nombre?.charAt(0)?.toUpperCase() || '?';

    useEffect(() => {
        parametros.estado().then(({ data }) => setEstado(data.estado)).catch(() => {});
    }, [ubicacion.pathname]);

    return (
        <AppShell header={{ height: 60 }} navbar={{ width: 230, breakpoint: 'sm', collapsed: { mobile: !abierto } }} padding="md">
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                        <Burger opened={abierto} onClick={toggle} hiddenFrom="sm" size="sm" />
                        <Text fw={800}>Mercado Libre → SIESA</Text>
                    </Group>
                    <Group gap="sm" wrap="nowrap">
                        <Group visibleFrom="md"><EstadoSiesa estado={estado} /></Group>
                        <Avatar color="marca" radius="xl" size={32}>{inicial}</Avatar>
                        <Text size="sm" fw={600} visibleFrom="xs">{usuario?.nombre}</Text>
                        <Button variant="subtle" color="red" size="compact-sm" leftSection={<LogOut size={16} />} onClick={cerrarSesion}>
                            Salir
                        </Button>
                    </Group>
                </Group>
            </AppShell.Header>
            <AppShell.Navbar p="xs">
                {MENU.filter((m) => m.roles.includes(usuario?.rol)).map((m) => (
                    <NavLink
                        key={m.ruta}
                        component={EnlaceRuta}
                        to={m.ruta}
                        end={m.ruta === '/'}
                        label={m.etiqueta}
                        leftSection={<m.icono size={18} />}
                        onClick={close}
                        active={m.ruta === '/' ? ubicacion.pathname === '/' || ubicacion.pathname.startsWith('/cargues') : ubicacion.pathname.startsWith(m.ruta)}
                    />
                ))}
                <Group hiddenFrom="md" mt="md" px="xs"><EstadoSiesa estado={estado} /></Group>
            </AppShell.Navbar>
            <AppShell.Main>
                <Outlet context={{ estado, recargarEstado: () => parametros.estado().then(({ data }) => setEstado(data.estado)) }} />
            </AppShell.Main>
        </AppShell>
    );
}
