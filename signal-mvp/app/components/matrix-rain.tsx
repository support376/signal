'use client';

import { useEffect, useRef } from 'react';

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    function resize() {
      if (!canvas || !ctx) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();

    const fontSize = 14;

    // 15축 + 시나리오 키워드 + 서비스 키워드 + 기호
    const chars = [
      // 서비스
      ...'SIGNALOGY'.split(''),
      ...'signal'.split(''),
      // 15축 한국어
      ...'안정'.split(''),
      ...'돌봄'.split(''),
      ...'자율'.split(''),
      ...'성취'.split(''),
      ...'보편'.split(''),
      ...'전통'.split(''),
      ...'불안'.split(''),
      ...'친화'.split(''),
      ...'성실'.split(''),
      ...'애착'.split(''),
      ...'회피'.split(''),
      ...'충성'.split(''),
      ...'도덕'.split(''),
      ...'갈등'.split(''),
      ...'복구'.split(''),
      // 시나리오 키워드
      ...'신뢰'.split(''),
      ...'침묵'.split(''),
      ...'배신'.split(''),
      ...'용서'.split(''),
      ...'가족'.split(''),
      ...'선택'.split(''),
      ...'위험'.split(''),
      ...'투자'.split(''),
      ...'시한부'.split(''),
      // 컨셉
      ...'잠재의식'.split(''),
      ...'케미'.split(''),
      ...'연결'.split(''),
      ...'벡터'.split(''),
      // 일본어
      ...'シグナル'.split(''),
      // 기호
      ...'01∞Σλψφ'.split(''),
    ];

    const columns = Math.floor(window.innerWidth / fontSize);
    const drops = new Array(columns).fill(0).map(() => Math.random() * -50);

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx!.fillStyle = 'rgba(0, 0, 0, 0.06)';
      ctx!.fillRect(0, 0, w, h);

      ctx!.font = fontSize + 'px ui-monospace, "JetBrains Mono", Menlo, monospace';
      ctx!.fillStyle = '#00c8d4';  // 시안-틸 (UI accent와 톤온톤)

      for (let i = 0; i < drops.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx!.fillText(ch, x, y);

        if (y > h && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.5;  // 절반 속도
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
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none', display: 'block',
      }}
    />
  );
}
