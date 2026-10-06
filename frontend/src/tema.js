// ================================================================
// TEMA DE MANTINE - color de marca y fuente
// ================================================================
import { createTheme } from '@mantine/core';

export const tema = createTheme({
    primaryColor: 'marca',
    primaryShade: 6,
    defaultRadius: 'md',
    fontFamily: "'Inter', sans-serif",
    headings: { fontFamily: "'Inter', sans-serif", fontWeight: '700' },
    colors: {
        marca: [
            '#e7f0ff', '#cfe0ff', '#9dc0ff', '#679dff', '#3d80fe',
            '#246ffe', '#2563eb', '#1a56d6', '#1147b8', '#0a3a9c',
        ],
    },
});
