// ================================================================
// PÁGINA: HISTORIAL - todo lo enviado a SIESA, con documentos y respuesta
// ================================================================
import { useEffect, useState } from 'react';
import {
    Stack, Title, Text, Paper, Group, Table, Badge, TextInput, Select, Modal, Code, ScrollArea,
    Button, Alert, Tabs, Loader, Center,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Search, AlertTriangle, RefreshCw } from 'lucide-react';
import { envios, mensajeError } from '../api/indice';
import { useAuth } from '../contexto/ContextoAuth';
import { pesos, fechaHora, ESTADOS_BD } from '../utilidades/formato';

// El pedido tal como quedó en SIESA (CONSULTA_PEDIDO_ML).
function PedidoSiesa({ pedido, consultadoEn }) {
    if (!pedido) {
        return <Text size="sm" c="dimmed">Aún no se ha consultado el pedido en SIESA. Use "Consultar en SIESA".</Text>;
    }
    return (
        <Stack gap="xs">
            <Group gap="lg">
                <div><Text size="xs" c="dimmed">Pedido</Text><Text fw={700} ff="monospace">{pedido.numero}</Text></div>
                <div><Text size="xs" c="dimmed">C.O.</Text><Text ff="monospace">{pedido.co}</Text></div>
                <div><Text size="xs" c="dimmed">Fecha</Text><Text>{pedido.fecha}</Text></div>
                <div><Text size="xs" c="dimmed">Estado en SIESA</Text><Badge variant="light">{pedido.estadoTexto}</Badge></div>
                <div><Text size="xs" c="dimmed">Cliente</Text><Text size="sm">{pedido.terceroNombre} <Text span ff="monospace" c="dimmed">{pedido.tercero}</Text></Text></div>
            </Group>
            <Text size="xs" c="dimmed">Notas: {pedido.notas}</Text>
            <Table.ScrollContainer minWidth={700}>
                <Table withTableBorder verticalSpacing={4} fz="sm">
                    <Table.Thead><Table.Tr>
                        <Table.Th>Ítem</Table.Th><Table.Th>Descripción</Table.Th><Table.Th>Bodega</Table.Th>
                        <Table.Th ta="right">Cant.</Table.Th><Table.Th ta="right">Precio unit.</Table.Th>
                        <Table.Th ta="right">IVA</Table.Th><Table.Th ta="right">Total</Table.Th>
                    </Table.Tr></Table.Thead>
                    <Table.Tbody>
                        {pedido.lineas.map((l, i) => (
                            <Table.Tr key={i}>
                                <Table.Td ff="monospace">{l.item}</Table.Td><Table.Td>{l.descripcion}</Table.Td>
                                <Table.Td ff="monospace">{l.bodega}</Table.Td><Table.Td ta="right">{l.cantidad}</Table.Td>
                                <Table.Td ta="right">{pesos(l.precioUnitario)}</Table.Td><Table.Td ta="right">{pesos(l.vlrImp)}</Table.Td>
                                <Table.Td ta="right">{pesos(l.vlrNeto)}</Table.Td>
                            </Table.Tr>
                        ))}
                        <Table.Tr fw={700}>
                            <Table.Td colSpan={5} ta="right">Total del pedido</Table.Td>
                            <Table.Td ta="right">{pesos(pedido.totalImp)}</Table.Td><Table.Td ta="right">{pesos(pedido.totalNeto)}</Table.Td>
                        </Table.Tr>
                    </Table.Tbody>
                </Table>
            </Table.ScrollContainer>
            {consultadoEn && <Text size="xs" c="dimmed">Consultado en SIESA: {fechaHora(consultadoEn)}</Text>}
        </Stack>
    );
}

export default function Historial() {
    const { esAdmin, usuario } = useAuth();
    const puedeConsultar = ['admin', 'operador'].includes(usuario?.rol);
    const [consultando, setConsultando] = useState(false);
    const [filas, setFilas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [estado, setEstado] = useState(null);
    const [buscar, setBuscar] = useState('');
    const [buscarDiferido] = useDebouncedValue(buscar, 300);
    const [detalle, setDetalle] = useState(null);

    async function cargar() {
        setCargando(true);
        try {
            const { data } = await envios.listar({ estado: estado || undefined, buscar: buscarDiferido || undefined });
            setFilas(data.envios);
        } catch (e) {
            notifications.show({ color: 'red', message: mensajeError(e) });
        } finally { setCargando(false); }
    }
    useEffect(() => { cargar(); }, [estado, buscarDiferido]);   // eslint-disable-line react-hooks/exhaustive-deps

    async function abrir(venta) {
        setDetalle({ venta, cargando: true });
        try {
            const { data } = await envios.detalle(venta);
            setDetalle(data.envio);
        } catch (e) { setDetalle(null); notifications.show({ color: 'red', message: mensajeError(e) }); }
    }

    async function consultarSiesa(venta) {
        setConsultando(true);
        try {
            const { data } = await envios.consultarSiesa(venta);
            notifications.show({ color: data.encontrado ? (data.duplicados ? 'orange' : 'green') : 'yellow', message: data.mensaje });
            if (data.encontrado) { await abrir(venta); cargar(); }
        } catch (e) {
            notifications.show({ color: 'red', message: mensajeError(e) });
        } finally { setConsultando(false); }
    }

    async function liberar(venta) {
        try {
            await envios.liberar(venta);
            notifications.show({ color: 'green', message: 'Venta liberada: ya se puede volver a enviar.' });
            setDetalle(null);
            cargar();
        } catch (e) { notifications.show({ color: 'red', message: mensajeError(e) }); }
    }

    return (
        <Stack maw={1300}>
            <div>
                <Title order={3}>Historial de envíos</Title>
                <Text c="dimmed" size="sm">Cada venta de Mercado Libre enviada a SIESA, con el documento enviado y la respuesta del ERP.</Text>
            </div>
            <Group>
                <TextInput leftSection={<Search size={16} />} placeholder="# de venta, comprador o documento" value={buscar}
                    onChange={(e) => setBuscar(e.currentTarget.value)} w={320} />
                <Select placeholder="Todos los estados" clearable value={estado} onChange={setEstado} w={220}
                    data={Object.entries(ESTADOS_BD).map(([value, { texto }]) => ({ value, label: texto }))} />
            </Group>

            <Paper withBorder radius="md">
                <Table.ScrollContainer minWidth={900}>
                    <Table highlightOnHover verticalSpacing="xs">
                        <Table.Thead><Table.Tr>
                            <Table.Th># de venta</Table.Th><Table.Th>Pedido SIESA</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Detalle</Table.Th>
                            <Table.Th>Comprador</Table.Th><Table.Th ta="right">Total ML</Table.Th><Table.Th>Enviado por</Table.Th>
                            <Table.Th ta="right">Intentos</Table.Th><Table.Th>Fecha</Table.Th>
                        </Table.Tr></Table.Thead>
                        <Table.Tbody>
                            {cargando && <Table.Tr><Table.Td colSpan={9}><Center py="md"><Loader size="sm" /></Center></Table.Td></Table.Tr>}
                            {!cargando && filas.length === 0 && <Table.Tr><Table.Td colSpan={9}><Text c="dimmed" size="sm" ta="center" py="md">No hay envíos que coincidan.</Text></Table.Td></Table.Tr>}
                            {!cargando && filas.map((f) => {
                                const est = ESTADOS_BD[f.estado] || { color: 'gray', texto: f.estado };
                                return (
                                    <Table.Tr key={f.venta} style={{ cursor: 'pointer' }} onClick={() => abrir(f.venta)}>
                                        <Table.Td ff="monospace" fz="sm">{f.venta}</Table.Td>
                                        <Table.Td ff="monospace" fz="sm" fw={700} style={{ whiteSpace: 'nowrap' }}>{f.pedido_numero || <Text span c="dimmed" size="sm">-</Text>}</Table.Td>
                                        <Table.Td><Badge variant="light" color={est.color}>{est.texto}</Badge>
                                            {f.tercero_creado && <Badge ml={4} variant="outline" size="xs">tercero creado</Badge>}</Table.Td>
                                        <Table.Td fz="sm" maw={340}>{f.detalle}</Table.Td>
                                        <Table.Td fz="sm">{f.resumen?.comprador}<Text size="xs" c="dimmed" ff="monospace">{f.resumen?.documento}</Text></Table.Td>
                                        <Table.Td ta="right" fz="sm" style={{ whiteSpace: 'nowrap' }}>{f.resumen?.totalMl ? pesos(f.resumen.totalMl) : ''}</Table.Td>
                                        <Table.Td fz="sm">{f.enviado_por}</Table.Td>
                                        <Table.Td ta="right" fz="sm">{f.intentos}</Table.Td>
                                        <Table.Td fz="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{fechaHora(f.actualizado_en)}</Table.Td>
                                    </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Paper>

            <Modal opened={Boolean(detalle)} onClose={() => setDetalle(null)} title={`Venta ${detalle?.venta || ''}`} size="xl">
                {detalle?.cargando ? <Center h={120}><Loader /></Center> : detalle && (
                    <Stack>
                        <Group justify="space-between">
                            <Group><Badge variant="light" color={ESTADOS_BD[detalle.estado]?.color}>{ESTADOS_BD[detalle.estado]?.texto}</Badge>
                                <Text size="sm">{detalle.detalle}</Text></Group>
                            {puedeConsultar && (
                                <Button size="xs" variant="light" leftSection={<RefreshCw size={14} />} loading={consultando}
                                    onClick={() => consultarSiesa(detalle.venta)}>Consultar en SIESA</Button>
                            )}
                        </Group>
                        {detalle.estado === 'enviando' && (
                            <Alert color="grape" icon={<AlertTriangle size={18} />}>
                                <Text size="sm">No se sabe si SIESA registró este pedido (no respondió o el envío se interrumpió). Use "Consultar en SIESA":
                                    si el pedido aparece, la venta queda como enviada. Si no aparece, se puede liberar para reenviar.</Text>
                                {esAdmin && <Button mt="sm" size="xs" color="grape" onClick={() => liberar(detalle.venta)}>Verifiqué que NO está en SIESA: liberar para reenviar</Button>}
                            </Alert>
                        )}
                        <Tabs defaultValue="siesa">
                            <Tabs.List>
                                <Tabs.Tab value="siesa">Pedido en SIESA</Tabs.Tab>
                                <Tabs.Tab value="pedido">Documento del pedido</Tabs.Tab>
                                {detalle.documento_tercero && <Tabs.Tab value="tercero">Documento del tercero</Tabs.Tab>}
                                <Tabs.Tab value="respuesta">Respuesta de SIESA</Tabs.Tab>
                            </Tabs.List>
                            <Tabs.Panel value="siesa" pt="sm"><PedidoSiesa pedido={detalle.pedido_siesa} consultadoEn={detalle.pedido_consultado_en} /></Tabs.Panel>
                            {[['pedido', detalle.documento_pedido], ['tercero', detalle.documento_tercero], ['respuesta', detalle.respuesta]].map(([k, txt]) => (
                                <Tabs.Panel key={k} value={k} pt="sm">
                                    <ScrollArea h={400} type="auto"><Code block fz="xs" style={{ whiteSpace: 'pre' }}>{txt || 'Sin contenido.'}</Code></ScrollArea>
                                </Tabs.Panel>
                            ))}
                        </Tabs>
                    </Stack>
                )}
            </Modal>
        </Stack>
    );
}
