// ================================================================
// PÁGINA: HISTORIAL - todo lo enviado a SIESA, con documentos y respuesta
// ================================================================
import { useEffect, useState } from 'react';
import {
    Stack, Title, Text, Paper, Group, Table, Badge, TextInput, Select, Modal, Code, ScrollArea, Tooltip,
    Button, Alert, Tabs, Loader, Center, Grid, Accordion,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';
import { Search, AlertTriangle, RefreshCw, Calendar } from 'lucide-react';
import { envios, mensajeError } from '../api/indice';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexto/ContextoAuth';
import { pesos, fechaHora, ESTADOS_BD, detalleCorto, conDv } from '../utilidades/formato';

const SIN_CORTE = { whiteSpace: 'nowrap' };

// Dato del resumen: etiqueta pequeña arriba, valor abajo. Separados por una línea vertical.
function Dato({ etiqueta, span, primero, children }) {
    return (
        <Grid.Col span={span} px="md" py={4}
            style={primero ? undefined : { borderLeft: '1px solid var(--mantine-color-gray-3)' }}>
            <Text size="xs" c="dimmed" mb={4}>{etiqueta}</Text>
            {children}
        </Grid.Col>
    );
}

// Productos del pedido tal como quedó en SIESA (CONSULTA_PEDIDO_ML).
function LineasPedido({ pedido }) {
    return (
        <Paper withBorder radius="md">
            <Table.ScrollContainer minWidth={640}>
                <Table verticalSpacing="xs" fz="sm">
                    <Table.Thead><Table.Tr>
                        <Table.Th>Producto</Table.Th><Table.Th>Bodega</Table.Th><Table.Th ta="right">Cant.</Table.Th>
                        <Table.Th ta="right">Precio unit.</Table.Th><Table.Th ta="right">IVA</Table.Th><Table.Th ta="right">Total</Table.Th>
                    </Table.Tr></Table.Thead>
                    <Table.Tbody>
                        {pedido.lineas.map((l, i) => (
                            <Table.Tr key={i}>
                                <Table.Td><Text size="sm" fw={500}>{l.item}</Text><Text size="xs" c="dimmed">{l.descripcion}</Text></Table.Td>
                                <Table.Td>{l.bodega}</Table.Td><Table.Td ta="right">{l.cantidad}</Table.Td>
                                <Table.Td ta="right" style={SIN_CORTE}>{pesos(l.precioUnitario)}</Table.Td>
                                <Table.Td ta="right" style={SIN_CORTE}>{pesos(l.vlrImp)}</Table.Td>
                                <Table.Td ta="right" style={SIN_CORTE}>{pesos(l.vlrNeto)}</Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                    <Table.Tfoot><Table.Tr>
                        <Table.Th colSpan={4} ta="right">Total del pedido</Table.Th>
                        <Table.Th ta="right" style={SIN_CORTE}>{pesos(pedido.totalImp)}</Table.Th>
                        <Table.Th ta="right" style={SIN_CORTE}>{pesos(pedido.totalNeto)}</Table.Th>
                    </Table.Tr></Table.Tfoot>
                </Table>
            </Table.ScrollContainer>
        </Paper>
    );
}

// Detalle de un envío: resultado, resumen, productos y, si aplica, información técnica.
function DetalleEnvio({ d, fila, tecnico, esAdmin, consultando, alConsultar, alLiberar }) {
    const est = ESTADOS_BD[d.estado] || { color: 'gray', texto: d.estado };
    const pedido = d.pedido_siesa;
    const r = d.resumen || {};
    return (
        <Stack gap="md">
            <Group justify="space-between" align="flex-start">
                <Group gap="xs">
                    <Badge size="lg" variant="light" color={est.color}>{est.texto}</Badge>
                    {d.tercero_creado && <Badge size="lg" variant="outline" color="teal">{r.conRut ? 'Cliente nuevo - NIT (tiene RUT)' : 'Cliente nuevo'}</Badge>}
                </Group>
                <Button size="xs" variant="light" leftSection={<RefreshCw size={14} />} loading={consultando} onClick={alConsultar}>Consultar en SIESA</Button>
            </Group>

            {d.detalle && <Alert color={est.color} variant="light" p="sm"><Text size="sm">{d.detalle}</Text></Alert>}
            {d.estado === 'enviando' && (
                <Alert color="grape" icon={<AlertTriangle size={18} />}>
                    <Text size="sm">SIESA no respondió a tiempo y no se sabe si el pedido quedó creado. Use "Consultar en SIESA":
                        si el pedido aparece, la venta queda como enviada. Si no aparece, un administrador puede habilitarla para volver a enviarla.</Text>
                    {esAdmin && <Button mt="sm" size="xs" color="grape" onClick={alLiberar}>Confirmo que no está en SIESA: habilitar para volver a enviar</Button>}
                </Alert>
            )}

            <Paper withBorder radius="md" py="sm">
                <Grid gutter={0}>
                <Dato etiqueta="Pedido SIESA" span={{ base: 6, sm: 2.5 }} primero><Text fw={700} size="lg">{pedido?.numero || '-'}</Text>{pedido?.fecha && <Text size="xs" c="dimmed">{pedido.fecha}</Text>}</Dato>
                <Dato etiqueta="Estado en SIESA" span={{ base: 6, sm: 2.5 }}>{pedido ? <Badge variant="light">{pedido.estadoTexto}</Badge> : <Text size="sm" c="dimmed">Sin consultar</Text>}</Dato>
                <Dato etiqueta="Comprador" span={{ base: 6, sm: 4.5 }}><Text size="sm" fw={500} lineClamp={2}>{pedido?.terceroNombre || r.comprador}</Text><Text size="xs" c="dimmed">{conDv(r.documento || pedido?.tercero)}</Text></Dato>
                <Dato etiqueta="Total" span={{ base: 6, sm: 2.5 }}><Text fw={700} size="lg">{pedido ? pesos(pedido.totalNeto) : (r.totalMl ? pesos(r.totalMl) : '-')}</Text>{pedido && <Text size="xs" c="dimmed">IVA {pesos(pedido.totalImp)}</Text>}</Dato>
                </Grid>
            </Paper>
            <Text size="xs" c="dimmed">
                Enviado por {fila?.enviado_por || '-'} - {fechaHora(d.actualizado_en)} - {d.intentos} intento{d.intentos === 1 ? '' : 's'}
                {d.pedido_consultado_en ? ` - Consultado en SIESA: ${fechaHora(d.pedido_consultado_en)}` : ''}
            </Text>

            {pedido ? <LineasPedido pedido={pedido} /> : <Text size="sm" c="dimmed">Todavía no se tiene el detalle del pedido. Use "Consultar en SIESA".</Text>}
            {pedido?.notas && <Paper bg="gray.0" radius="md" p="sm"><Text size="xs" c="dimmed">Notas del pedido</Text><Text size="sm">{pedido.notas}</Text></Paper>}

            {tecnico && (
                <Accordion variant="separated" radius="md">
                    <Accordion.Item value="tecnico">
                        <Accordion.Control><Text size="sm" fw={500}>Información técnica</Text></Accordion.Control>
                        <Accordion.Panel>
                            <Tabs defaultValue="pedido">
                                <Tabs.List>
                                    <Tabs.Tab value="pedido">Archivo del pedido</Tabs.Tab>
                                    {d.documento_tercero && <Tabs.Tab value="tercero">Archivo del cliente</Tabs.Tab>}
                                    <Tabs.Tab value="respuesta">Respuesta de SIESA</Tabs.Tab>
                                </Tabs.List>
                                {[['pedido', d.documento_pedido], ['tercero', d.documento_tercero], ['respuesta', d.respuesta]].map(([k, txt]) => (
                                    <Tabs.Panel key={k} value={k} pt="sm">
                                        <ScrollArea h={360} type="auto"><Code block fz="xs" style={{ whiteSpace: 'pre' }}>{txt || 'Sin contenido.'}</Code></ScrollArea>
                                    </Tabs.Panel>
                                ))}
                            </Tabs>
                        </Accordion.Panel>
                    </Accordion.Item>
                </Accordion>
            )}
        </Stack>
    );
}

export default function Historial() {
    const { esAdmin } = useAuth();
    const { estado: estadoSiesa } = useOutletContext() || {};
    // Archivos técnicos: solo administradores, y se pueden ocultar en Configuración.
    const tecnico = esAdmin && estadoSiesa?.verTecnico !== false;
    const [consultando, setConsultando] = useState(false);
    const [filas, setFilas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [estado, setEstado] = useState(null);
    const [buscar, setBuscar] = useState('');
    const [buscarDiferido] = useDebouncedValue(buscar, 300);
    const [fechas, setFechas] = useState([null, null]);
    const dia = (f) => (f ? dayjs(f).format('YYYY-MM-DD') : undefined);
    const [detalle, setDetalle] = useState(null);

    async function cargar() {
        setCargando(true);
        try {
            const { data } = await envios.listar({
                estado: estado || undefined, buscar: buscarDiferido || undefined,
                // Con solo la fecha inicial elegida, se filtra ese día.
                desde: dia(fechas[0]), hasta: dia(fechas[1] || fechas[0]),
            });
            setFilas(data.envios);
        } catch (e) {
            notifications.show({ color: 'red', message: mensajeError(e) });
        } finally { setCargando(false); }
    }
    useEffect(() => { cargar(); }, [estado, buscarDiferido, fechas]);   // eslint-disable-line react-hooks/exhaustive-deps

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
            notifications.show({ color: data.encontrado ? (data.duplicados ? 'orange' : 'green') : 'yellow', message: data.mensaje, autoClose: 8000 });
            if (data.encontrado || data.habilitada) { await abrir(venta); cargar(); }
        } catch (e) {
            notifications.show({ color: 'red', message: mensajeError(e) });
        } finally { setConsultando(false); }
    }

    async function liberar(venta) {
        try {
            await envios.liberar(venta);
            notifications.show({ color: 'green', message: 'Venta habilitada: ya se puede volver a enviar.' });
            setDetalle(null);
            cargar();
        } catch (e) { notifications.show({ color: 'red', message: mensajeError(e) }); }
    }

    return (
        <Stack>
            <div>
                <Title order={3}>Historial de envíos</Title>
                <Text c="dimmed" size="sm">Ventas enviadas a SIESA y el pedido que se creó para cada una.</Text>
            </div>
            <Group>
                <TextInput leftSection={<Search size={16} />} placeholder="# de venta, pedido, comprador o documento" value={buscar}
                    onChange={(e) => setBuscar(e.currentTarget.value)} w={320} />
                <Select placeholder="Todos los estados" clearable value={estado} onChange={setEstado} w={220}
                    data={Object.entries(ESTADOS_BD).map(([value, { texto }]) => ({ value, label: texto }))} />
                <DatePickerInput type="range" placeholder="Fecha de envío" value={fechas} onChange={setFechas} clearable allowSingleDateInRange
                    valueFormat="DD MMM YYYY" maxDate={new Date()} leftSection={<Calendar size={16} />} w={260} />
            </Group>

            <Paper withBorder radius="md">
                <Table.ScrollContainer minWidth={900}>
                    <Table highlightOnHover verticalSpacing="xs">
                        <Table.Thead><Table.Tr>
                            <Table.Th># de venta</Table.Th><Table.Th>Pedido SIESA</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Detalle</Table.Th>
                            <Table.Th>Comprador</Table.Th><Table.Th ta="right">Total</Table.Th><Table.Th>Enviado por</Table.Th>
                            <Table.Th ta="right">Intentos</Table.Th><Table.Th>Fecha</Table.Th>
                        </Table.Tr></Table.Thead>
                        <Table.Tbody>
                            {cargando && <Table.Tr><Table.Td colSpan={9}><Center py="md"><Loader size="sm" /></Center></Table.Td></Table.Tr>}
                            {!cargando && filas.length === 0 && <Table.Tr><Table.Td colSpan={9}><Text c="dimmed" size="sm" ta="center" py="md">No hay envíos que coincidan.</Text></Table.Td></Table.Tr>}
                            {!cargando && filas.map((f) => {
                                const est = ESTADOS_BD[f.estado] || { color: 'gray', texto: f.estado };
                                return (
                                    <Table.Tr key={f.venta} style={{ cursor: 'pointer' }} onClick={() => abrir(f.venta)}>
                                        <Table.Td fz="sm">{f.venta}</Table.Td>
                                        <Table.Td fz="sm" fw={700} style={{ whiteSpace: 'nowrap' }}>{f.pedido_numero || <Text span c="dimmed" size="sm">-</Text>}</Table.Td>
                                        <Table.Td><Badge variant="light" color={est.color}>{est.texto}</Badge></Table.Td>
                                        <Table.Td fz="sm" style={{ whiteSpace: 'nowrap' }}>
                                            <Tooltip label={f.detalle} multiline w={360} disabled={!f.detalle}><span>{detalleCorto(f.detalle)}</span></Tooltip></Table.Td>
                                        <Table.Td fz="sm">{f.resumen?.comprador}
                                            <Text size="xs" c="dimmed">{conDv(f.resumen?.documento)}</Text>
                                            {f.tercero_creado && <Badge mt={2} variant="outline" color="teal" size="xs">{f.resumen?.conRut ? 'cliente nuevo - NIT' : 'cliente nuevo'}</Badge>}</Table.Td>
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

            <Modal opened={Boolean(detalle)} onClose={() => setDetalle(null)} size={900}
                title={<Text fw={700}>Venta {detalle?.venta || ''}</Text>}>
                {detalle?.cargando ? <Center h={120}><Loader /></Center> : detalle && (
                    <DetalleEnvio d={detalle} fila={filas.find((f) => f.venta === detalle.venta)} tecnico={tecnico} esAdmin={esAdmin}
                        consultando={consultando} alConsultar={() => consultarSiesa(detalle.venta)} alLiberar={() => liberar(detalle.venta)} />
                )}
            </Modal>
        </Stack>
    );
}
