'use client';

import { useEffect, useRef } from 'react';

/**
 * 클래식 Matrix Digital Rain — SIGNALOGY 버전
 * 원본 알고리즘 그대로: 모든 컬럼 + 반투명 검정 잔상 + 초록 글자
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
    const fontSize = 15;
    let columns = 0;
    let drops: number[] = [];

    function resize() {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      columns = Math.floor(c.width / fontSize);
      drops = Array.from({ length: columns }, () =>
        Math.floor(Math.random() * c.height / fontSize) * -1
      );
    }

    function draw() {
      // 핵심: 완전히 지우지 않고 반투명 검정으로 덮어서 잔상
      g.fillStyle = 'rgba(0, 0, 0, 0.06)';
      g.fillRect(0, 0, c.width, c.height);

      g.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // 선두 글자: 밝은 흰색
        g.fillStyle = '#fff';
        g.fillText(char, x, y);

        // 바로 뒤: 밝은 초록
        g.fillStyle = '#0f0';
        g.fillText(chars[Math.floor(Math.random() * chars.length)], x, y - fontSize);

        drops[i] += 0.5;

        // 화면 밖 → 랜덤 확률로 리셋
        if (drops[i] * fontSize > c.height && Math.random() > 0.975) {
          drops[i] = 0;
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
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
