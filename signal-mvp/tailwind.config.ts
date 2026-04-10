import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cyber / Matrix-inspired palette
        bg: '#000000',
        'bg-elevated': '#050808',
        card: '#0a0f0f',
        'card-hover': '#0f1a1a',
        line: '#0f2020',
        fg: '#d0e8e8',
        dim: '#4a6a6a',
        // Neon accents
        accent: '#00d4ff',      // cyan
        accent2: '#a855f7',     // electric purple
        accent3: '#00ff88',     // neon green (matrix)
        warn: '#ff8800',
        // Subtle variations
        'accent-dim': '#006680',
        'accent3-dim': '#00803a',
      },
      borderRadius: {
        '4xl': '2rem',
      },
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
