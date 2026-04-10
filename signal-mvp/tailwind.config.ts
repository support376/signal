import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        'bg-elevated': '#080808',
        card: '#111111',
        'card-hover': '#1a1a1a',
        line: '#222222',
        fg: '#ffffff',
        dim: '#888888',
        accent: '#ffffff',
        accent2: '#cccccc',
        accent3: '#aaaaaa',
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
