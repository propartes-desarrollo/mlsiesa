// ================================================================
// PÁGINA: CARGUE - revisar las ventas de un Excel y enviarlas a SIESA
// ================================================================
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import {
    Stack, Title, Text, Paper, Group, Table, Badge, Alert, Checkbox, Button, SegmentedControl,
    SimpleGrid, Modal, Code, ScrollArea, List, Loader, Center, Anchor, ActionIcon, Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AlertTriangle, ChevronDown, ChevronRight, Send, FileText, ArrowLeft, Ban } from 'lucide-react';
import { ventasMl, mensajeError } from '../api/indice';
import { useAuth } from '../contexto/ContextoAuth';
import { pesos, fechaHora, ESTADOS, enviable } from '../utilidades/formato';

function Resumen({ ventas }) {
    const cuenta = (...e) => ventas.filter((v) => e.includes(v.estado)).length;
    const conAvisos = ventas.filter((v) => v.estado === 'lista' && v.alertas.length).length;
    const datos = [
        ['Ventas en el archivo', ventas.length, 'dark'],
        [`Listas (${conAvisos} con avisos)`, cuenta('lista'), 'green'],
        ['Bloqueadas o rechazadas', cuenta('bloqueada', 'rechazada', 'con_error'), 'red'],
        ['Enviadas a SIESA', cuenta('enviada'), 'blue'],
    ];
    return (
        <SimpleGrid cols={{ base: 2, sm: 4 }}>
            {datos.map(([t, n, c]) => (
                <Paper key={t} withBorder radius="md" p="sm">
                    <Text fz={22} fw={700} c={c}>{n}</Text>
                    <Text size="xs" c="dimmed">{t}</Text>
                </Paper>
            ))}
        </SimpleGrid>
    );
}

const LOGISTICA = { full: 'Full', colecta: 'Colecta' };

function Detalle({ v, alVerDocumento }) {
    const t = v.tercero;
    return (
        <Stack gap="sm" p="xs">
            {v.bloqueos.length > 0 && <Alert color="red" icon={<Ban size={16} />} p="xs"><List size="sm">{v.bloqueos.map((b) => <List.Item key={b}>{b}</List.Item>)}</List></Alert>}
            {v.alertas.length > 0 && <Alert color="yellow" icon={<AlertTriangle size={16} />} p="xs"><List size="sm">{v.alertas.map((a) => <List.Item key={a}>{a}</List.Item>)}</List></Alert>}
            {v.resultado && <Alert color={ESTADOS[v.estado]?.color || 'gray'} p="xs"><Text size="sm">{v.resultado.mensaje}</Text>
                {v.resultado.pasos?.length > 0 && <Text size="xs" c="dimmed">{v.resultado.pasos.join(' · ')}</Text>}</Alert>}
            {!v.resultado && v.previo && <Text size="xs" c="dimmed">Último envío: {v.previo.detalle} · {fechaHora(v.previo.actualizado_en)} · {v.previo.intentos} intento(s)</Text>}

            <Table withTableBorder verticalSpacing={4} fz="sm">
                <Table.Thead><Table.Tr>
                    <Table.Th>Referencia</Table.Th><Table.Th>Descripción</Table.Th><Table.Th ta="right">Cant.</Table.Th>
                    <Table.Th ta="right">Precio ML (con IVA)</Table.Th><Table.Th ta="right">Precio a SIESA (neto)</Table.Th><Table.Th>C. costo</Table.Th>
                </Table.Tr></Table.Thead>
                <Table.Tbody>{v.lineas.map((l, i) => (
                    <Table.Tr key={i}>
                        <Table.Td ff="monospace">{l.referencia}</Table.Td><Table.Td>{l.descripcion}</Table.Td>
                        <Table.Td ta="right">{l.cantidad}</Table.Td><Table.Td ta="right">{pesos(l.precioIva)}</Table.Td>
                        <Table.Td ta="right">{pesos(l.precioNeto)}</Table.Td><Table.Td ff="monospace">{l.esFlete ? l.ccosto : <Text span size="sm" c="dimmed">del ítem en SIESA</Text>}</Table.Td>
                    </Table.Tr>))}
                </Table.Tbody>
            </Table>
            <Text size="xs" c="dimmed">
                Notas del pedido: <b>{v.notas}</b> · Bodega {v.bodega || '-'}
            </Text>
            <Text size="xs" c="dimmed">
                Cobrado en ML {pesos(v.totalMl)} · neto enviado {pesos(v.totalNeto)} · SIESA liquidará aprox. {pesos(v.totalSiesaAprox)} con IVA
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <div>
                    <Text size="sm" fw={700}>Facturar a (tercero)</Text>
                    {t ? (<>
                        <Text size="sm">{t.tipo === '2' ? 'Empresa' : 'Persona natural'} · {t.tipoIdent} {t.documento}</Text>
                        {t.tipo === '2'
                            ? <Text size="sm">{t.razonSocial}</Text>
                            : <Text size="sm">Nombres: <b>{t.nombres}</b> · Apellidos: <b>{t.apellido1} {t.apellido2}</b></Text>}
                        <Text size="xs" c="dimmed">{t.direccion} · {t.depto ? `código ${t.depto}-${t.ciudad}` : 'ciudad sin código'}</Text>
                    </>) : <Text size="sm" c="dimmed">Sin documento</Text>}
                </div>
                <div>
                    <Text size="sm" fw={700}>Envío</Text>
                    <Text size="sm">{v.comprador.direccionEnvio}</Text>
                    <Text size="xs" c="dimmed">{v.comprador.ciudad}, {v.comprador.depto} · Guía {v.seguimiento || '-'} · Estado ML: {v.estadoMl}</Text>
                </div>
            </SimpleGrid>

            {v.bloqueos.length === 0 && alVerDocumento && (
                <Group gap="xs">
                    <Button size="xs" variant="default" leftSection={<FileText size={14} />} onClick={() => alVerDocumento(v.venta, 'pedido')}>Ver documento del pedido</Button>
                    <Button size="xs" variant="default" leftSection={<FileText size={14} />} onClick={() => alVerDocumento(v.venta, 'tercero')}>Ver documento del tercero</Button>
                </Group>
            )}
        </Stack>
    );
}

export default function Cargue() {
    const { id } = useParams();
    const { usuario } = useAuth();
    const { estado: estadoSiesa } = useOutletContext() || {};
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [filtro, setFiltro] = useState('todas');
    const [seleccion, setSeleccion] = useState(new Set());
    const [abiertas, setAbiertas] = useState(new Set());
    const [enviando, setEnviando] = useState(false);
    const [confirmar, setConfirmar] = useState(false);
    const [documento, setDocumento] = useState(null);

    const puedeEnviar = ['admin', 'operador'].includes(usuario?.rol) && estadoSiesa?.envioActivo;

    useEffect(() => {
        ventasMl.obtenerCargue(id).then(({ data }) => setDatos(data)).catch((e) => setError(mensajeError(e)));
    }, [id]);

    const ventas = datos?.ventas || [];
    const visibles = useMemo(() => ventas.filter((v) => (
        filtro === 'todas' ? true
            : filtro === 'listas' ? v.estado === 'lista'
                : filtro === 'avisos' ? v.alertas.length > 0 || v.bloqueos.length > 0
                    : !['lista'].includes(v.estado)
    )), [ventas, filtro]);

    const actualizar = (venta, cambios) => setDatos((d) => ({ ...d, ventas: d.ventas.map((v) => (v.venta === venta ? { ...v, ...cambios } : v)) }));
    const alternar = (conjunto, setConjunto, venta) => {
        const nuevo = new Set(conjunto);
        if (nuevo.has(venta)) nuevo.delete(venta); else nuevo.add(venta);
        setConjunto(nuevo);
    };
    const enviables = visibles.filter((v) => enviable(v.estado));

    async function verDocumento(venta, tipo) {
        setDocumento({ titulo: `Documento del ${tipo} · venta ${venta} (clave oculta)`, texto: null });
        try {
            const { data } = await ventasMl.documento(id, venta, tipo);
            setDocumento({ titulo: `Documento del ${tipo} · venta ${venta} (clave oculta)`, texto: data.documento });
        } catch (e) { setDocumento({ titulo: 'Error', texto: mensajeError(e) }); }
    }

    async function enviar() {
        setConfirmar(false);
        setEnviando(true);
        const lista = ventas.filter((v) => seleccion.has(v.venta));
        let ok = 0;
        // Una a una y en orden: cada ImportarXML escribe en el ERP y así se ve el avance.
        for (const v of lista) {
            actualizar(v.venta, { estado: 'enviando' });
            try {
                const { data } = await ventasMl.enviar(id, v.venta);
                actualizar(v.venta, { estado: data.estado, resultado: { mensaje: data.mensaje, pasos: data.pasos } });
                if (data.estado === 'enviada') ok += 1;
            } catch (e) {
                actualizar(v.venta, { estado: 'con_error', resultado: { mensaje: mensajeError(e), pasos: [] } });
            }
            setSeleccion((s) => { const n = new Set(s); n.delete(v.venta); return n; });
        }
        setEnviando(false);
        notifications.show({ color: ok === lista.length ? 'green' : 'orange', message: `${ok} de ${lista.length} venta(s) enviadas a SIESA.` });
    }

    if (error) return <Alert color="red">{error}</Alert>;
    if (!datos) return <Center h={200}><Loader /></Center>;

    return (
        <Stack maw={1300} pb={puedeEnviar ? 80 : 0}>
            <div>
                <Anchor component={Link} to="/" size="sm"><Group gap={4}><ArrowLeft size={14} />Cargues</Group></Anchor>
                <Title order={3}>{datos.cargue.archivo}</Title>
                <Text c="dimmed" size="sm">Cargado {fechaHora(datos.cargue.creadoEn)} por {datos.cargue.cargadoPor}</Text>
            </div>

            {estadoSiesa && !estadoSiesa.envioActivo && (
                <Alert color="orange" icon={<AlertTriangle size={18} />}>
                    El envío a SIESA está desactivado: puede revisar las ventas y los documentos, pero no enviarlos. Un administrador lo activa en Parámetros SIESA.
                </Alert>
            )}
            {estadoSiesa && !estadoSiesa.emailRespaldo && (
                <Alert color="yellow" icon={<AlertTriangle size={18} />}>
                    El reporte de Mercado Libre no trae email ni teléfono del comprador y no hay un email de respaldo configurado (Parámetros SIESA → tercero.email_respaldo).
                </Alert>
            )}
            {datos.ciudadesSinCodigo.length > 0 && (
                <Alert color="yellow" icon={<AlertTriangle size={18} />}>
                    Ciudades sin código SIESA (el tercero se crearía sin ciudad): {datos.ciudadesSinCodigo.join(' · ')}. Se agregan en Parámetros SIESA → Municipios.
                </Alert>
            )}

            <Resumen ventas={ventas} />

            <Group justify="space-between">
                <SegmentedControl value={filtro} onChange={setFiltro} data={[
                    { value: 'todas', label: 'Todas' }, { value: 'listas', label: 'Listas' },
                    { value: 'avisos', label: 'Con avisos' }, { value: 'otras', label: 'Enviadas / con problemas' },
                ]} />
            </Group>

            <Paper withBorder radius="md">
                <Table.ScrollContainer minWidth={900}>
                    <Table verticalSpacing="xs" highlightOnHover>
                        <Table.Thead><Table.Tr>
                            <Table.Th w={40}>
                                {puedeEnviar && <Checkbox aria-label="Seleccionar todas"
                                    checked={enviables.length > 0 && enviables.every((v) => seleccion.has(v.venta))}
                                    indeterminate={enviables.some((v) => seleccion.has(v.venta)) && !enviables.every((v) => seleccion.has(v.venta))}
                                    onChange={(e) => setSeleccion(e.currentTarget.checked ? new Set(enviables.map((v) => v.venta)) : new Set())} />}
                            </Table.Th>
                            <Table.Th w={30} /><Table.Th># de venta</Table.Th><Table.Th>Fecha</Table.Th><Table.Th>Comprador</Table.Th>
                            <Table.Th>Productos</Table.Th><Table.Th ta="right">Total ML</Table.Th><Table.Th>Estado</Table.Th>
                        </Table.Tr></Table.Thead>
                        <Table.Tbody>
                            {visibles.map((v) => {
                                const abierta = abiertas.has(v.venta);
                                const est = ESTADOS[v.estado] || { color: 'gray', texto: v.estado };
                                return (
                                    <Fragment key={v.venta}>
                                        <Table.Tr style={{ cursor: 'pointer' }} onClick={() => alternar(abiertas, setAbiertas, v.venta)}>
                                            <Table.Td onClick={(e) => e.stopPropagation()}>
                                                {puedeEnviar && <Checkbox aria-label={`Seleccionar ${v.venta}`} disabled={!enviable(v.estado) || enviando}
                                                    checked={seleccion.has(v.venta)} onChange={() => alternar(seleccion, setSeleccion, v.venta)} />}
                                            </Table.Td>
                                            <Table.Td><ActionIcon variant="subtle" size="sm" aria-label="Detalle">{abierta ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</ActionIcon></Table.Td>
                                            <Table.Td ff="monospace" fz="sm">{v.venta}</Table.Td>
                                            <Table.Td fz="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{fechaHora(v.fecha)}</Table.Td>
                                            <Table.Td fz="sm">{v.comprador.nombre}<Text size="xs" c="dimmed" ff="monospace">{v.comprador.tipoDoc} {v.comprador.documento}</Text></Table.Td>
                                            <Table.Td fz="sm">
                                                {v.lineas.filter((l) => !l.esFlete).map((l) => `${l.referencia} x${l.cantidad}`).join(', ')}
                                                {v.lineas.some((l) => l.esFlete) && <Badge ml={6} size="xs" variant="light" color="gray">+ flete</Badge>}
                                                {v.logistica && <Badge ml={6} size="xs" variant="light" color={v.logistica === 'full' ? 'violet' : 'blue'}>{LOGISTICA[v.logistica]} · {v.bodega}</Badge>}
                                            </Table.Td>
                                            <Table.Td ta="right" fz="sm" style={{ whiteSpace: 'nowrap' }}>{pesos(v.totalMl)}</Table.Td>
                                            <Table.Td>
                                                <Group gap={4} wrap="nowrap">
                                                    <Tooltip label={v.resultado?.mensaje || v.previo?.detalle || est.texto} disabled={!v.resultado && !v.previo}>
                                                        <Badge variant="light" color={est.color} style={{ flexShrink: 0 }} leftSection={v.estado === 'enviando' ? <Loader size={10} /> : null}>{est.texto}</Badge>
                                                    </Tooltip>
                                                    {v.alertas.length > 0 && (
                                                        <Tooltip label={v.alertas.join(' / ')} multiline w={320}>
                                                            <Badge variant="outline" color="yellow">{v.alertas.length} aviso{v.alertas.length > 1 ? 's' : ''}</Badge>
                                                        </Tooltip>
                                                    )}
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                        {abierta && (
                                            <Table.Tr>
                                                <Table.Td colSpan={8} bg="var(--mantine-color-gray-0)">
                                                    <Detalle v={v} alVerDocumento={['admin', 'operador'].includes(usuario?.rol) ? verDocumento : null} />
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                            {visibles.length === 0 && <Table.Tr><Table.Td colSpan={8}><Text c="dimmed" size="sm" ta="center" py="md">No hay ventas con este filtro.</Text></Table.Td></Table.Tr>}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Paper>

            {puedeEnviar && (
                <Paper withBorder shadow="md" p="sm" pos="fixed" bottom={0} right={0} radius={0}
                    style={{ zIndex: 50, left: 'var(--app-shell-navbar-offset, 0rem)' }}>
                    <Group justify="flex-end" maw={1300} mx="auto">
                        <Text size="sm" c="dimmed" mr="auto">
                            {seleccion.size ? `${seleccion.size} venta(s) seleccionada(s)` : 'Seleccione las ventas que quiere enviar'}
                        </Text>
                        <Button leftSection={<Send size={16} />} disabled={!seleccion.size} loading={enviando} onClick={() => setConfirmar(true)}>
                            Enviar a SIESA
                        </Button>
                    </Group>
                </Paper>
            )}

            <Modal opened={confirmar} onClose={() => setConfirmar(false)} title="Confirmar envío a SIESA" centered>
                <Stack>
                    <Text size="sm">
                        Se van a registrar <b>{seleccion.size} pedido(s)</b> en SIESA (conexión <b>{estadoSiesa?.conexion}</b>).
                        {estadoSiesa?.crearTercero ? ' Los compradores que no existan se crearán como terceros.' : ''}
                    </Text>
                    <Alert color="orange" p="xs"><Text size="sm">Esto escribe en el ERP y no se puede deshacer desde aquí.</Text></Alert>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setConfirmar(false)}>Cancelar</Button>
                        <Button color="marca" onClick={enviar}>Sí, enviar</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={Boolean(documento)} onClose={() => setDocumento(null)} title={documento?.titulo} size="xl">
                {documento?.texto === null ? <Center h={100}><Loader /></Center> : (
                    <ScrollArea h={480} type="auto"><Code block fz="xs" style={{ whiteSpace: 'pre' }}>{documento?.texto}</Code></ScrollArea>
                )}
            </Modal>
        </Stack>
    );
}
