import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

export default {
    content: ['./index.html', './src/**/*.tsx'],
    theme: {
        colors: {
            white: '#ffffff',
            orange: '#ff7e73',
            brown: '#776464',
            milky: '#efebe5',
            dark: '#221f1f',
            black: '#000000',
        },
        fontFamily: {
            body: ['Poppins', ...fontFamily.sans],
            logo: ['Eczar', ...fontFamily.serif],
        },
        extend: {},
    },
    plugins: [],
} satisfies Config
