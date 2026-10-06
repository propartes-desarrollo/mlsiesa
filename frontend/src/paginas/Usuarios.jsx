// ================================================================
// PÁGINA: USUARIOS (solo admin) - alta, rol y activación
// ================================================================
import { useEffect, useState } from 'react';
import { Stack, Title, Text, Paper, Table, Badge, Button, Group, Modal, TextInput, PasswordInput, Select, Switch } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { UserPlus } from 'lucide-react';
import { usuarios, mensajeError } from '../api/indice';
import { useAuth } from '../contexto/ContextoAuth';

const ROLES = [
    { value: 'operador', label: 'Operador (carga y envía)' },
    { value: 'consulta', label: 'Consulta (solo ve)' },
    { value: 'admin', label: 'Administrador' },
];
const COLOR_ROL = { admin: 'grape', operador: 'blue', consulta: 'gray' };

export default function Usuarios() {
    const { usuario: yo } = useAuth();
    const [lista, setLista] = useState([]);
    const [abierto, setAbierto] = useState(false);
    const form = useForm({
        initialValues: { nombre: '', correo: '', contrasena: '', rol: 'operador' },
        validate: {
            nombre: (v) => (v.trim().length >= 2 ? null : 'Nombre requerido'),
            correo: (v) => (/^\S+@\S+$/.test(v) ? null : 'Correo inválido'),
            contrasena: (v) => (v.length >= 8 ? null : 'Mínimo 8 caracteres'),
        },
    });

    const cargar = () => usuarios.listar().then(({ data }) => setLista(data.usuarios)).catch(() => {});
    useEffect(() => { cargar(); }, []);

    async function crear(valores) {
        try {
            await usuarios.crear(valores);
            notifications.show({ color: 'green', message: 'Usuario creado.' });
            setAbierto(false);
            form.reset();
            cargar();
        } catch (e) { notifications.show({ color: 'red', message: mensajeError(e) }); }
    }

    async function actualizar(id, cambios) {
        try {
            await usuarios.actualizar(id, cambios);
            cargar();
        } catch (e) { notifications.show({ color: 'red', message: mensajeError(e) }); }
    }

    return (
        <Stack maw={1000}>
            <Group justify="space-between">
                <div>
                    <Title order={3}>Usuarios</Title>
                    <Text c="dimmed" size="sm">Quién puede entrar y qué puede hacer. No hay registro público: los usuarios se crean aquí.</Text>
                </div>
                <Button leftSection={<UserPlus size={16} />} onClick={() => setAbierto(true)}>Nuevo usuario</Button>
            </Group>
            <Paper withBorder radius="md">
                <Table.ScrollContainer minWidth={700}>
                    <Table verticalSpacing="xs">
                        <Table.Thead><Table.Tr><Table.Th>Nombre</Table.Th><Table.Th>Correo</Table.Th><Table.Th>Rol</Table.Th><Table.Th>Activo</Table.Th></Table.Tr></Table.Thead>
                        <Table.Tbody>
                            {lista.map((u) => (
                                <Table.Tr key={u.id}>
                                    <Table.Td>{u.nombre}</Table.Td>
                                    <Table.Td fz="sm">{u.correo}</Table.Td>
                                    <Table.Td>
                                        {u.id === yo?.id
                                            ? <Badge variant="light" color={COLOR_ROL[u.rol]}>{u.rol}</Badge>
                                            : <Select size="xs" w={220} data={ROLES} value={u.rol} allowDeselect={false} onChange={(rol) => actualizar(u.id, { rol })} />}
                                    </Table.Td>
                                    <Table.Td><Switch checked={u.activo} disabled={u.id === yo?.id} onChange={(e) => actualizar(u.id, { activo: e.currentTarget.checked })} /></Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Paper>

            <Modal opened={abierto} onClose={() => setAbierto(false)} title="Nuevo usuario" centered>
                <form onSubmit={form.onSubmit(crear)}>
                    <Stack>
                        <TextInput label="Nombre" {...form.getInputProps('nombre')} />
                        <TextInput label="Correo" {...form.getInputProps('correo')} />
                        <PasswordInput label="Contraseña inicial" {...form.getInputProps('contrasena')} />
                        <Select label="Rol" data={ROLES} allowDeselect={false} {...form.getInputProps('rol')} />
                        <Group justify="flex-end"><Button type="submit">Crear</Button></Group>
                    </Stack>
                </form>
            </Modal>
        </Stack>
    );
}
