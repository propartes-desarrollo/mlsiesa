// ================================================================
// PÁGINA: CONFIGURACIÓN (solo admin) - valores con que se crean pedidos y clientes
// en SIESA, y municipios adicionales. Los técnicos van en la pestaña Avanzado.
// ================================================================
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    Stack, Title, Text, Paper, Table, TextInput, Switch, Button, Group, Alert, Tooltip,
    ActionIcon, Select, Tabs, NumberInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { RotateCcw, Save, AlertTriangle } from 'lucide-react';
import { parametros, mensajeError } from '../api/indice';
import { useAuth } from '../contexto/ContextoAuth';

// Pestañas: [id, título, filtro]
const GRUPOS = [
    ['envio', 'Envío a SIESA', (p) => p.clave.startsWith('envio.')],
    ['pedido', 'Pedido', (p) => p.clave.startsWith('pedido.') && !p.avanzado],
    ['tercero', 'Cliente nuevo', (p) => p.clave.startsWith('tercero.') && !p.avanzado],
    ['ml', 'Mercado Libre', (p) => p.clave.startsWith('ml.')],
    ['avanzado', 'Avanzado', (p) => p.avanzado],
];

const mostrar = (p, v) => {
    if (p.tipo === 'booleano') return v ? 'Encendido' : 'Apagado';
    if (p.tipo === 'lista') return v.join(', ');
    return String(v) || '(vacío)';
};

function FilaParametro({ p, editable, alGuardar, alRestaurar }) {
    const [valor, setValor] = useState(p.tipo === 'lista' ? p.valor.join(', ') : p.valor);
    useEffect(() => { setValor(p.tipo === 'lista' ? p.valor.join(', ') : p.valor); }, [p.valor, p.tipo]);
    const original = p.tipo === 'lista' ? p.valor.join(', ') : p.valor;
    const cambiado = String(valor) !== String(original);

    let control;
    if (p.tipo === 'booleano') {
        control = <Switch checked={Boolean(valor)} disabled={!editable} onChange={(e) => alGuardar(p.clave, e.currentTarget.checked)}
            color={p.clave === 'envio.activo' ? 'green' : 'marca'} />;
    } else if (p.tipo === 'numero') {
        control = <NumberInput size="xs" w={120} value={valor} disabled={!editable} onChange={setValor} />;
    } else {
        control = <TextInput size="xs" w={p.tipo === 'lista' ? 420 : 180} value={valor} disabled={!editable} onChange={(e) => setValor(e.currentTarget.value)} />;
    }

    return (
        <Table.Tr>
            <Table.Td fz="sm" fw={600} w={240}>{p.nombre}</Table.Td>
            <Table.Td>
                <Group gap="xs" wrap="nowrap">
                    {control}
                    {editable && p.tipo !== 'booleano' && cambiado && (
                        <ActionIcon variant="filled" size="sm" aria-label="Guardar" onClick={() => alGuardar(p.clave, valor)}><Save size={14} /></ActionIcon>
                    )}
                </Group>
            </Table.Td>
            <Table.Td fz="sm">
                {p.descripcion}
                {p.modificado && <Text size="xs" c="dimmed">Valor original: {mostrar(p, p.defecto)}</Text>}
            </Table.Td>
            <Table.Td w={40}>
                {editable && p.modificado && (
                    <Tooltip label="Volver al valor original">
                        <ActionIcon variant="subtle" color="gray" aria-label="Restaurar" onClick={() => alRestaurar(p.clave)}><RotateCcw size={14} /></ActionIcon>
                    </Tooltip>
                )}
            </Table.Td>
        </Table.Tr>
    );
}

function Municipios({ editable }) {
    const [datos, setDatos] = useState({ municipios: [], departamentos: {} });
    const [nuevo, setNuevo] = useState({ departamento: null, nombre: '', codCiudad: '' });
    const cargar = () => parametros.municipios().then(({ data }) => setDatos(data)).catch(() => {});
    useEffect(() => { cargar(); }, []);

    async function guardar() {
        try {
            await parametros.guardarMunicipio(nuevo);
            setNuevo({ departamento: nuevo.departamento, nombre: '', codCiudad: '' });
            notifications.show({ color: 'green', message: 'Municipio guardado.' });
            cargar();
        } catch (e) { notifications.show({ color: 'red', message: mensajeError(e) }); }
    }
    const deptos = Object.entries(datos.departamentos).map(([nombre, cod]) => ({ value: cod, label: `${cod} - ${nombre}` }))
        .sort((a, b) => a.value.localeCompare(b.value));

    return (
        <Stack>
            <Text size="sm" c="dimmed">
                La app reconoce las capitales y los municipios más frecuentes. Si una venta llega de una ciudad que no reconoce,
                agréguela aquí con el código de 3 dígitos del municipio (código DANE).
            </Text>
            {editable && (
                <Group align="end">
                    <Select label="Departamento" data={deptos} value={nuevo.departamento} onChange={(v) => setNuevo({ ...nuevo, departamento: v })} searchable w={260} />
                    <TextInput label="Municipio" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.currentTarget.value })} w={220} />
                    <TextInput label="Código (3 dígitos)" value={nuevo.codCiudad} onChange={(e) => setNuevo({ ...nuevo, codCiudad: e.currentTarget.value })} w={140} />
                    <Button onClick={guardar} disabled={!nuevo.departamento || !nuevo.nombre || !/^\d{3}$/.test(nuevo.codCiudad)}>Agregar</Button>
                </Group>
            )}
            <Table withTableBorder fz="sm">
                <Table.Thead><Table.Tr><Table.Th>Depto</Table.Th><Table.Th>Municipio</Table.Th><Table.Th>Código</Table.Th></Table.Tr></Table.Thead>
                <Table.Tbody>
                    {datos.municipios.length === 0 && <Table.Tr><Table.Td colSpan={3}><Text size="sm" c="dimmed">Sin municipios adicionales.</Text></Table.Td></Table.Tr>}
                    {datos.municipios.map((m) => (
                        <Table.Tr key={`${m.cod_depto}-${m.nombre}`}><Table.Td>{m.cod_depto}</Table.Td><Table.Td>{m.nombre}</Table.Td><Table.Td>{m.cod_ciudad}</Table.Td></Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Stack>
    );
}

export default function Parametros() {
    const { esAdmin } = useAuth();
    const { recargarEstado } = useOutletContext() || {};
    const [lista, setLista] = useState([]);

    useEffect(() => { parametros.listar().then(({ data }) => setLista(data.parametros)).catch(() => {}); }, []);

    async function guardar(clave, valor) {
        try {
            const { data } = await parametros.guardar(clave, valor);
            setLista(data.parametros);
            recargarEstado?.();
            notifications.show({ color: 'green', message: `${lista.find((p) => p.clave === clave)?.nombre || 'Valor'} actualizado.` });
        } catch (e) { notifications.show({ color: 'red', message: mensajeError(e) }); }
    }
    async function restaurar(clave) {
        try {
            const { data } = await parametros.restaurar(clave);
            setLista(data.parametros);
            recargarEstado?.();
        } catch (e) { notifications.show({ color: 'red', message: mensajeError(e) }); }
    }

    return (
        <Stack maw={1200}>
            <div>
                <Title order={3}>Configuración</Title>
                <Text c="dimmed" size="sm">
                    Valores con los que se crean en SIESA los pedidos de Mercado Libre y los clientes nuevos.
                </Text>
            </div>
            <Alert color="gray" icon={<AlertTriangle size={18} />}>
                La conexión con SIESA (usuario y clave) la configura el equipo de sistemas en el servidor.
            </Alert>
            <Tabs defaultValue="envio">
                <Tabs.List>
                    {GRUPOS.map(([k, t]) => <Tabs.Tab key={k} value={k}>{t}</Tabs.Tab>)}
                    <Tabs.Tab value="municipios">Municipios</Tabs.Tab>
                </Tabs.List>
                {GRUPOS.map(([g, , filtro]) => (
                    <Tabs.Panel key={g} value={g} pt="md">
                        {g === 'avanzado' && (
                            <Alert color="orange" mb="md" icon={<AlertTriangle size={18} />}>
                                Valores técnicos que exige SIESA. Cámbielos solo con indicación del equipo de sistemas: un valor equivocado hace que SIESA rechace los pedidos.
                            </Alert>
                        )}
                        <Paper withBorder radius="md">
                            <Table.ScrollContainer minWidth={800}>
                                <Table verticalSpacing="xs">
                                    <Table.Thead><Table.Tr><Table.Th>Nombre</Table.Th><Table.Th>Valor</Table.Th><Table.Th>Descripción</Table.Th><Table.Th /></Table.Tr></Table.Thead>
                                    <Table.Tbody>
                                        {lista.filter(filtro).map((p) => (
                                            <FilaParametro key={p.clave} p={p} editable={esAdmin} alGuardar={guardar} alRestaurar={restaurar} />
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </Table.ScrollContainer>
                        </Paper>
                    </Tabs.Panel>
                ))}
                <Tabs.Panel value="municipios" pt="md"><Municipios editable={esAdmin} /></Tabs.Panel>
            </Tabs>
        </Stack>
    );
}
