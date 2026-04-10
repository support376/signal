'use client';

import { useEffect, useRef } from 'react';

/**
 * SIGNALOGY Matrix Rain — 세련된 버전
 * 큰 글자 + 느린 속도 + 넓은 간격 + 긴 트레일
 * "정신없음" → "세련된 데이터 흐름"
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
    const fontSize = 24;       // 크게
    const colGap = 3;          // 3칸마다 1컬럼만 활성 → 넓은 간격
    let columns = 0;
    let drops: number[] = [];
    let speeds: number[] = [];
    let active: boolean[] = []; // 활성 컬럼만 렌더

    function resize() {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      columns = Math.floor(c.width / fontSize);
      drops = Array.from({ length: columns }, () => Math.random() * -30);
      speeds = Array.from({ length: columns }, () => 0.08 + Math.random() * 0.15);
      // 3칸 중 1칸만 활성 → 듬성듬성
      active = Array.from({ length: columns }, (_, i) => i % colGap === 0);
    }

    function draw() {
      // 매우 긴 트레일 (0.025)
      g.fillStyle = 'rgba(0, 0, 0, 0.025)';
      g.fillRect(0, 0, c.width, c.height);

      g.font = `300 ${fontSize}px "JetBrains Mono", "Fira Code", monospace`;

      for (let i = 0; i < drops.length; i++) {
        if (!active[i]) continue;

        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // 선두: 밝은 시안
        const headChar = chars[Math.floor(Math.random() * chars.length)];
        g.fillStyle = 'rgba(0, 220, 255, 0.85)';
        g.fillText(headChar, x, y);

        // 1칸 위: 중간 밝기
        g.fillStyle = 'rgba(0, 180, 220, 0.35)';
        g.fillText(chars[Math.floor(Math.random() * chars.length)], x, y - fontSize);

        // 2칸 위: 어둡게
        g.fillStyle = 'rgba(0, 150, 200, 0.12)';
        g.fillText(chars[Math.floor(Math.random() * chars.length)], x, y - fontSize * 2);

        drops[i] += speeds[i];

        if (y > c.height && Math.random() > 0.99) {
          drops[i] = Math.random() * -15;
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
        top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.7,
      }}
    />
  );
}
