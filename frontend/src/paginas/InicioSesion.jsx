// ================================================================
// PÁGINA: INICIO DE SESIÓN
// ================================================================
import { useNavigate } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { Center, Paper, Stack, Title, TextInput, PasswordInput, Button } from '@mantine/core';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexto/ContextoAuth';

export default function InicioSesion() {
    const { iniciarSesion } = useAuth();
    const navegar = useNavigate();

    const form = useForm({
        initialValues: { correo: '', contrasena: '' },
        validate: {
            correo: (v) => (/^\S+@\S+$/.test(v) ? null : 'Correo inválido'),
            contrasena: (v) => (v ? null : 'La contraseña es requerida'),
        },
    });

    async function enviar(valores) {
        try {
            await iniciarSesion(valores.correo.trim(), valores.contrasena);
            navegar('/');
        } catch (err) {
            notifications.show({ color: 'red', title: 'No se pudo iniciar sesión', message: err.response?.data?.mensaje || 'Error' });
        }
    }

    return (
        <Center mih="100vh" p="md" bg="var(--mantine-color-gray-0)">
            <Paper withBorder shadow="md" radius="lg" p="xl" w="100%" maw={420}>
                <Stack>
                    <Title order={2} ta="center">Iniciar sesión</Title>
                    <form onSubmit={form.onSubmit(enviar)}>
                        <TextInput label="Correo" leftSection={<Mail size={16} />} {...form.getInputProps('correo')} />
                        <PasswordInput mt="md" label="Contraseña" leftSection={<Lock size={16} />} {...form.getInputProps('contrasena')} />
                        <Button type="submit" fullWidth mt="lg" loading={form.submitting}>Entrar</Button>
                    </form>
                </Stack>
            </Paper>
        </Center>
    );
}
