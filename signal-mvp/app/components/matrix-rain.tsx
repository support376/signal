'use client';

import { useEffect, useRef } from 'react';

/**
 * SIGNALOGY Matrix Rain — 느린 속도 + 긴 잔상 + 다국어
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

    // 다국어 글자 세트: SIGNALOGY + 한국어 + 일본어 + 숫자 + 기호
    const chars = [
      ...'SIGNALOGY'.split(''),
      ...'signalogy'.split(''),
      ...'신호'.split(''),
      ...'시그널'.split(''),
      ...'연결'.split(''),
      ...'잠재의식'.split(''),
      ...'케미'.split(''),
      ...'シグナル'.split(''),  // 시그나루 (일본어)
      ...'信号'.split(''),      // 신호 (중국어)
      ...'SIGNAL'.split(''),
      ...'01'.split(''),
      ...'∞Σλψφ'.split(''),
    ];

    const fontSize = 18;
    let columns = 0;
    let drops: number[] = [];
    let speeds: number[] = [];

    function resize() {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      columns = Math.floor(c.width / fontSize);
      drops = Array.from({ length: columns }, () =>
        Math.floor(Math.random() * -50)
      );
      speeds = Array.from({ length: columns }, () =>
        0.1 + Math.random() * 0.2
      );
    }

    function draw() {
      // 긴 잔상: 알파 낮을수록 오래 남음
      g.fillStyle = 'rgba(0, 0, 0, 0.03)';
      g.fillRect(0, 0, c.width, c.height);

      g.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // 선두 글자: 밝은 흰색
        const headChar = chars[Math.floor(Math.random() * chars.length)];
        g.fillStyle = 'rgba(255, 255, 255, 0.9)';
        g.fillText(headChar, x, y);

        // 바로 뒤: 밝은 초록
        g.fillStyle = 'rgba(0, 255, 100, 0.5)';
        g.fillText(chars[Math.floor(Math.random() * chars.length)], x, y - fontSize);

        // 2칸 뒤: 어두운 초록
        g.fillStyle = 'rgba(0, 200, 80, 0.2)';
        g.fillText(chars[Math.floor(Math.random() * chars.length)], x, y - fontSize * 2);

        // 컬럼별 다른 느린 속도
        drops[i] += speeds[i];

        if (drops[i] * fontSize > c.height && Math.random() > 0.98) {
          drops[i] = Math.random() * -30;
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
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  );
}
