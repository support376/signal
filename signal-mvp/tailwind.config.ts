import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 톤온톤 — 시안-틸 단일 가족
        bg: '#000000',
        'bg-elevated': '#040a0a',
        card: '#081010',
        'card-hover': '#0c1818',
        line: '#0e1e1e',
        fg: '#d4eded',
        dim: '#4a7070',
        // 메인 accent: 시안 (모든 강조)
        accent: '#00c8d4',
        // 밝은 변형 (CTA, 하이라이트)
        accent2: '#00e0d0',
        // 어두운 변형 (서브, 배경 글로우)
        accent3: '#008a90',
        warn: '#d4a040',
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
