// ================================================================
// PÁGINA: PARÁMETROS SIESA - valores del documento y municipios adicionales
// El admin edita; el operador solo consulta.
// ================================================================
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    Stack, Title, Text, Paper, Table, Badge, TextInput, Switch, Button, Group, Alert, Tooltip,
    ActionIcon, Select, Tabs, NumberInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { RotateCcw, Save, AlertTriangle } from 'lucide-react';
import { parametros, mensajeError } from '../api/indice';
import { useAuth } from '../contexto/ContextoAuth';

const GRUPOS = { envio: 'Envío', pedido: 'Pedido (0430 / 0431)', tercero: 'Tercero (0200 / 0201)', ml: 'Mercado Libre' };

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
            <Table.Td ff="monospace" fz="xs">{p.clave.split('.')[1]}</Table.Td>
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
                {p.confirmar && <Badge ml={6} size="xs" variant="light" color="yellow">confirmar con TI</Badge>}
                {p.modificado && <Text size="xs" c="dimmed">Por defecto: {String(p.tipo === 'lista' ? p.defecto.join(', ') : p.defecto) || '(vacío)'}</Text>}
            </Table.Td>
            <Table.Td w={40}>
                {editable && p.modificado && (
                    <Tooltip label="Volver al valor por defecto">
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
                La app trae los códigos DANE de las capitales y de los municipios más frecuentes. Si una venta llega de una ciudad
                sin código, agréguela aquí (código DIVIPOLA de 3 dígitos del municipio).
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
            notifications.show({ color: 'green', message: `${clave} actualizado.` });
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
                <Title order={3}>Parámetros SIESA</Title>
                <Text c="dimmed" size="sm">
                    Valores con los que se arma el pedido y el tercero en SIESA. Los marcados "confirmar con TI" se tomaron de la tienda B2C y pueden ser distintos para Mercado Libre.
                </Text>
            </div>
            {!esAdmin && <Alert color="gray">Solo un administrador puede cambiar estos valores.</Alert>}
            <Alert color="orange" icon={<AlertTriangle size={18} />}>
                La conexión, el usuario y la clave de SIESA se configuran en el servidor (archivo backend/.env), no aquí.
            </Alert>
            <Tabs defaultValue="envio">
                <Tabs.List>
                    {Object.entries(GRUPOS).map(([k, t]) => <Tabs.Tab key={k} value={k}>{t}</Tabs.Tab>)}
                    <Tabs.Tab value="municipios">Municipios</Tabs.Tab>
                </Tabs.List>
                {Object.keys(GRUPOS).map((g) => (
                    <Tabs.Panel key={g} value={g} pt="md">
                        <Paper withBorder radius="md">
                            <Table.ScrollContainer minWidth={800}>
                                <Table verticalSpacing="xs">
                                    <Table.Thead><Table.Tr><Table.Th>Parámetro</Table.Th><Table.Th>Valor</Table.Th><Table.Th>Descripción</Table.Th><Table.Th /></Table.Tr></Table.Thead>
                                    <Table.Tbody>
                                        {lista.filter((p) => p.clave.startsWith(`${g}.`)).map((p) => (
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
