// ================================================================
// PUNTO DE ENTRADA - React + MantineProvider
// ================================================================
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { DatesProvider } from '@mantine/dates';
import 'dayjs/locale/es';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';

import Aplicacion from './Aplicacion';
import { tema } from './tema';

createRoot(document.getElementById('raiz')).render(
    <StrictMode>
        <MantineProvider theme={tema} defaultColorScheme="light">
            <DatesProvider settings={{ locale: 'es', firstDayOfWeek: 1 }}>
                <Notifications position="top-right" />
                <Aplicacion />
            </DatesProvider>
        </MantineProvider>
    </StrictMode>
);
