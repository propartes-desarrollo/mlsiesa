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
import { Search, AlertTriangle } from 'lucide-react';
import { envios, mensajeError } from '../api/indice';
import { useAuth } from '../contexto/ContextoAuth';
import { pesos, fechaHora, ESTADOS_BD } from '../utilidades/formato';

export default function Historial() {
    const { esAdmin } = useAuth();
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
                            <Table.Th># de venta</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Detalle</Table.Th>
                            <Table.Th>Comprador</Table.Th><Table.Th ta="right">Total ML</Table.Th><Table.Th>Enviado por</Table.Th>
                            <Table.Th ta="right">Intentos</Table.Th><Table.Th>Fecha</Table.Th>
                        </Table.Tr></Table.Thead>
                        <Table.Tbody>
                            {cargando && <Table.Tr><Table.Td colSpan={8}><Center py="md"><Loader size="sm" /></Center></Table.Td></Table.Tr>}
                            {!cargando && filas.length === 0 && <Table.Tr><Table.Td colSpan={8}><Text c="dimmed" size="sm" ta="center" py="md">No hay envíos que coincidan.</Text></Table.Td></Table.Tr>}
                            {!cargando && filas.map((f) => {
                                const est = ESTADOS_BD[f.estado] || { color: 'gray', texto: f.estado };
                                return (
                                    <Table.Tr key={f.venta} style={{ cursor: 'pointer' }} onClick={() => abrir(f.venta)}>
                                        <Table.Td ff="monospace" fz="sm">{f.venta}</Table.Td>
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
                        <Group><Badge variant="light" color={ESTADOS_BD[detalle.estado]?.color}>{ESTADOS_BD[detalle.estado]?.texto}</Badge>
                            <Text size="sm">{detalle.detalle}</Text></Group>
                        {detalle.estado === 'enviando' && (
                            <Alert color="grape" icon={<AlertTriangle size={18} />}>
                                <Text size="sm">No se sabe si SIESA registró este pedido (no respondió o el envío se interrumpió). Busque en SIESA el pedido con referencia
                                    <b> {detalle.venta.slice(-15)}</b> o la nota "ML - {detalle.venta}".</Text>
                                {esAdmin && <Button mt="sm" size="xs" color="grape" onClick={() => liberar(detalle.venta)}>Verifiqué que NO está en SIESA: liberar para reenviar</Button>}
                            </Alert>
                        )}
                        <Tabs defaultValue="pedido">
                            <Tabs.List>
                                <Tabs.Tab value="pedido">Documento del pedido</Tabs.Tab>
                                {detalle.documento_tercero && <Tabs.Tab value="tercero">Documento del tercero</Tabs.Tab>}
                                <Tabs.Tab value="respuesta">Respuesta de SIESA</Tabs.Tab>
                            </Tabs.List>
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
