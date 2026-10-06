// ================================================================
// PUNTO DE ENTRADA - React + MantineProvider
// ================================================================
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import Aplicacion from './Aplicacion';
import { tema } from './tema';

createRoot(document.getElementById('raiz')).render(
    <StrictMode>
        <MantineProvider theme={tema} defaultColorScheme="light">
            <Notifications position="top-right" />
            <Aplicacion />
        </MantineProvider>
    </StrictMode>
);
