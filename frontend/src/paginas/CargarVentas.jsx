// ================================================================
// PÁGINA: CARGAR VENTAS - subir el Excel de ML y ver los cargues recientes
// ================================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Title, Text, Paper, Group, Table, Badge, Anchor } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
import '@mantine/dropzone/styles.css';
import { ventasMl, mensajeError } from '../api/indice';
import { fechaHora } from '../utilidades/formato';

const XLSX = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

export default function CargarVentas() {
    const navegar = useNavigate();
    const [cargues, setCargues] = useState([]);
    const [subiendo, setSubiendo] = useState(false);

    useEffect(() => {
        ventasMl.listarCargues().then(({ data }) => setCargues(data.cargues)).catch(() => {});
    }, []);

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
        <Stack maw={1100}>
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
                <Text fw={700} mb="sm">Archivos cargados</Text>
                {cargues.length === 0 ? <Text c="dimmed" size="sm">Todavía no se ha cargado ningún archivo.</Text> : (
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
            </Paper>
        </Stack>
    );
}
