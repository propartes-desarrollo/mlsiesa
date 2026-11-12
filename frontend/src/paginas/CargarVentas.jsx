// ================================================================
// PÁGINA: CARGAR VENTAS - subir el Excel de ML y ver los cargues recientes
// ================================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Title, Text, Paper, Group, Table, Badge, Anchor, Pagination, Select, Button } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { DatePickerInput } from '@mantine/dates';
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';
import { FileSpreadsheet, Upload, X, Calendar, User } from 'lucide-react';
import '@mantine/dropzone/styles.css';
import { ventasMl, mensajeError } from '../api/indice';
import { fechaHora } from '../utilidades/formato';

const XLSX = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
const POR_PAGINA = 10;

export default function CargarVentas() {
    const navegar = useNavigate();
    const [cargues, setCargues] = useState([]);
    const [total, setTotal] = useState(0);
    const [pagina, setPagina] = useState(1);
    const [subiendo, setSubiendo] = useState(false);
    const [fechas, setFechas] = useState([null, null]);
    const [cargadoPor, setCargadoPor] = useState(null);
    const [quienes, setQuienes] = useState([]);
    const dia = (f) => (f ? dayjs(f).format('YYYY-MM-DD') : undefined);
    const conFiltros = Boolean(fechas[0] || cargadoPor);

    // Con solo la fecha inicial elegida, se filtra ese día.
    const filtros = { desde: dia(fechas[0]), hasta: dia(fechas[1] || fechas[0]), cargadoPor: cargadoPor || undefined };
    useEffect(() => {
        ventasMl.listarCargues({ pagina, porPagina: POR_PAGINA, ...filtros })
            .then(({ data }) => { setCargues(data.cargues); setTotal(data.total); setQuienes(data.usuarios); })
            .catch(() => {});
    }, [pagina, fechas, cargadoPor]);   // eslint-disable-line react-hooks/exhaustive-deps
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const desde = (pagina - 1) * POR_PAGINA + 1;
    // Al cambiar un filtro, la lista vuelve a la primera página.
    const filtrar = (poner) => (valor) => { poner(valor); setPagina(1); };
    const limpiar = () => { setFechas([null, null]); setCargadoPor(null); setPagina(1); };

    async function subir(archivos) {
        if (!archivos.length) return;
        setSubiendo(true);
        try {
            const { data } = await ventasMl.cargar(archivos[0]);
            notifications.show({ color: 'green', message: `${data.ventas.length} ventas leídas de ${data.cargue.archivo}` });
            navegar(`/cargues/${data.cargue.id}`);
        } catch (err) {
            notifications.show({ color: 'red', title: 'No se pudo leer el archivo', message: mensajeError(err) });
        } finally { setSubiendo(false); }
    }

    return (
        <Stack>
            <div>
                <Title order={3}>Cargar ventas de Mercado Libre</Title>
                <Text c="dimmed" size="sm">
                    Suba el archivo de ventas que descarga de Mercado Libre. Antes de enviar, podrá revisar cada venta.
                </Text>
            </div>

            <Dropzone onDrop={subir} onReject={() => notifications.show({ color: 'red', message: 'Solo se acepta el archivo de Excel de ventas de Mercado Libre (máximo 10 MB).' })}
                maxSize={10 * 1024 * 1024} accept={XLSX} multiple={false} loading={subiendo}>
                <Group justify="center" gap="xl" mih={140} style={{ pointerEvents: 'none' }}>
                    <Dropzone.Accept><Upload size={44} color="var(--mantine-color-marca-6)" /></Dropzone.Accept>
                    <Dropzone.Reject><X size={44} color="var(--mantine-color-red-6)" /></Dropzone.Reject>
                    <Dropzone.Idle><FileSpreadsheet size={44} color="var(--mantine-color-dimmed)" /></Dropzone.Idle>
                    <div>
                        <Text size="lg" fw={600}>Arrastre aquí el Excel de ventas</Text>
                        <Text size="sm" c="dimmed">o haga clic para buscarlo en su equipo</Text>
                    </div>
                </Group>
            </Dropzone>

            <Paper withBorder radius="md" p="md">
                <Group justify="space-between" mb="sm">
                    <Text fw={700}>Archivos cargados</Text>
                    {total > 0 && <Text size="xs" c="dimmed">{desde}-{Math.min(desde + cargues.length - 1, total)} de {total}</Text>}
                </Group>
                <Group mb="sm" gap="sm">
                    <DatePickerInput type="range" placeholder="Fecha de carga" value={fechas} onChange={filtrar(setFechas)} clearable allowSingleDateInRange
                        valueFormat="DD MMM YYYY" maxDate={new Date()} leftSection={<Calendar size={16} />} w={260} />
                    <Select placeholder="Cargado por" clearable value={cargadoPor} onChange={filtrar(setCargadoPor)} w={240}
                        leftSection={<User size={16} />} data={quienes.map((u) => ({ value: u.id, label: u.nombre }))} />
                    {conFiltros && <Button variant="subtle" size="xs" onClick={limpiar}>Quitar filtros</Button>}
                </Group>
                {cargues.length === 0 ? (
                    <Text c="dimmed" size="sm">{conFiltros ? 'No hay archivos con estos filtros.' : 'Todavía no se ha cargado ningún archivo.'}</Text>
                ) : (
                    <Table.ScrollContainer minWidth={600}>
                        <Table highlightOnHover verticalSpacing="xs">
                            <Table.Thead><Table.Tr>
                                <Table.Th>Archivo</Table.Th><Table.Th>Cargado</Table.Th><Table.Th>Por</Table.Th>
                                <Table.Th ta="right">Ventas</Table.Th><Table.Th ta="right">Enviadas</Table.Th>
                            </Table.Tr></Table.Thead>
                            <Table.Tbody>
                                {cargues.map((c) => (
                                    <Table.Tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navegar(`/cargues/${c.id}`)}>
                                        <Table.Td><Anchor size="sm">{c.archivo}</Anchor></Table.Td>
                                        <Table.Td>{fechaHora(c.creado_en)}</Table.Td>
                                        <Table.Td>{c.cargado_por}</Table.Td>
                                        <Table.Td ta="right">{c.total_ventas}</Table.Td>
                                        <Table.Td ta="right">
                                            <Badge variant="light" color={c.importadas === c.total_ventas ? 'blue' : 'gray'}>{c.importadas} / {c.total_ventas}</Badge>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                )}
                {paginas > 1 && <Group justify="center" mt="md"><Pagination total={paginas} value={pagina} onChange={setPagina} size="sm" /></Group>}
            </Paper>
        </Stack>
    );
}
