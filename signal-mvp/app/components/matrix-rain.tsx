'use client';

import { useEffect, useRef } from 'react';

/**
 * SIGNALOGY Matrix Digital Rain
 * - 글자: S, I, G, N, A, L, O, G, Y
 * - 느린 속도 (컬럼별 랜덤 0.15~0.4)
 * - 긴 잔상 트레일 (rgba 0.04)
 * - 선두 글자 밝게 (흰색)
 */
export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const c = canvas;
    const g = ctx;
    let animId: number;

    const chars = 'SIGNALOGY'.split('');
    const fontSize = 16;
    let columns = 0;
    let drops: number[] = [];
    let speeds: number[] = [];

    function resize() {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      columns = Math.floor(c.width / fontSize);
      drops = Array.from({ length: columns }, () => Math.random() * -50);
      speeds = Array.from({ length: columns }, () => 0.15 + Math.random() * 0.25);
    }

    function draw() {
      // 긴 잔상 트레일 — 0.04 (낮을수록 길어짐)
      g.fillStyle = 'rgba(0, 0, 0, 0.04)';
      g.fillRect(0, 0, c.width, c.height);

      g.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // 선두 글자: 밝은 흰색
        g.fillStyle = 'rgba(255, 255, 255, 0.9)';
        g.fillText(char, x, y);

        // 바로 위 글자: 메인 컬러 (네온 시안)
        const prevChar = chars[Math.floor(Math.random() * chars.length)];
        g.fillStyle = 'rgba(0, 212, 255, 0.6)';
        g.fillText(prevChar, x, y - fontSize);

        // 그 위: 어두운 시안
        g.fillStyle = 'rgba(0, 212, 255, 0.2)';
        g.fillText(chars[Math.floor(Math.random() * chars.length)], x, y - fontSize * 2);

        // 컬럼별 속도
        drops[i] += speeds[i];

        // 화면 밖으로 나가면 랜덤 리셋
        if (y > c.height && Math.random() > 0.98) {
          drops[i] = Math.random() * -20;
        }
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
