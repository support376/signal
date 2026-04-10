import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Midjourney-inspired ultra-dark palette
        bg: '#000000',
        'bg-elevated': '#0a0a0a',
        card: '#111111',
        'card-hover': '#1a1a1a',
        line: '#1f1f1f',
        fg: '#e0e0e0',
        dim: '#707070',
        accent: '#6e8eff',
        accent2: '#a87eff',
        accent3: '#4cd9b0',
        warn: '#f0a040',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      fontSize: {
        'hero': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'hero-sm': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
      },
    },
  },
  plugins: [],
} satisfies Config;
