import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        'bg-elevated': 'rgb(var(--color-bg-elevated) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        'card-hover': 'rgb(var(--color-card-hover) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        fg: 'rgb(var(--color-fg) / <alpha-value>)',
        dim: 'rgb(var(--color-dim) / <alpha-value>)',
        faint: 'rgb(var(--color-faint) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        accent2: 'rgb(var(--color-accent2) / <alpha-value>)',
        accent3: 'rgb(var(--color-accent3) / <alpha-value>)',
        warn: 'rgb(var(--color-warn) / <alpha-value>)',
      },
    },
  },
  plugins: [],
} satisfies Config;
