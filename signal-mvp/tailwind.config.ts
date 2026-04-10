import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        'bg-elevated': '#111111',
        card: '#181818',
        'card-hover': '#222222',
        line: '#2a2a2a',
        fg: '#f5f5f5',
        dim: '#999999',
        accent: '#f5f5f5',
        accent2: '#d0d0d0',
        accent3: '#b0b0b0',
        warn: '#d4a040',
      },
      borderRadius: { '4xl': '2rem' },
      fontSize: {
        'hero': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'hero-sm': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
