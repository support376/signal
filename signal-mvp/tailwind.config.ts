import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d12',
        card: '#141821',
        line: '#2a3142',
        fg: '#e8ecf3',
        dim: '#aab2c0',
        accent: '#7aa2ff',
        accent2: '#b07aff',
        accent3: '#5be3c7',
      },
    },
  },
  plugins: [],
} satisfies Config;
