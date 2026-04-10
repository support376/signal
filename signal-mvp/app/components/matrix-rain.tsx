'use client';

import { useEffect, useRef } from 'react';

/**
 * Matrix Digital Rain — 원본 데모 그대로 + SIGNALOGY 다국어
 * 출처: matrix_digital_rain_demo.html 의 알고리즘 100% 유지
 * 변경: chars만 SIGNALOGY + 한국어/일본어/기호로 교체
 */
export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // devicePixelRatio 대응 (선명하게)
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      if (!canvas || !ctx) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();

    const fontSize = 14;
    const chars = 'SIGNALOGYsignalogy신호시그널연결잠재의식케미シグナル信号アイウエオカキク01∞Σλψφ'.split('');
    const columns = Math.floor(window.innerWidth / fontSize);
    const drops = new Array(columns).fill(0).map(() => Math.random() * -50);

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // 잔상 트레일
      ctx!.fillStyle = 'rgba(0, 0, 0, 0.06)';
      ctx!.fillRect(0, 0, w, h);

      // 초록 글자
      ctx!.font = fontSize + 'px ui-monospace, "JetBrains Mono", Menlo, monospace';
      ctx!.fillStyle = '#00ff88';

      for (let i = 0; i < drops.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx!.fillText(ch, x, y);

        if (y > h && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      requestAnimationFrame(draw);
    }
    draw();

    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
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
        display: 'block',
      }}
    />
  );
}
