'use client';

import { useEffect, useState } from 'react';

/**
 * Midjourney-style 스크롤링 그리드 배경
 * 초단순 버전 — 빌드/렌더 문제 최소화
 */

const COLORS = [
  '#003040', '#200040', '#003020',
  '#102050', '#003535', '#250035',
  '#004030', '#151560', '#004040',
  '#300050',
];

interface ColConfig {
  speed: number;
  dir: 'normal' | 'reverse';
  heights: number[];
}

const COLS: ColConfig[] = [
  { speed: 70, dir: 'normal', heights: [120, 160, 100, 180, 140, 120, 160, 100, 140, 180] },
  { speed: 55, dir: 'reverse', heights: [140, 100, 180, 120, 160, 140, 100, 180, 120, 160] },
  { speed: 85, dir: 'normal', heights: [160, 180, 120, 100, 140, 160, 180, 120, 100, 140] },
  { speed: 60, dir: 'reverse', heights: [100, 140, 160, 180, 120, 100, 140, 160, 180, 120] },
  { speed: 75, dir: 'normal', heights: [180, 120, 140, 100, 160, 180, 120, 140, 100, 160] },
  { speed: 90, dir: 'reverse', heights: [120, 180, 100, 160, 140, 120, 180, 100, 160, 140] },
];

export default function ScrollingGridBg() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {/* 상하 페이드 */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2,
          background: 'linear-gradient(180deg, #000 0%, transparent 20%, transparent 80%, #000 100%)',
        }} />

        {/* 중앙 마스크 */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2,
          background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0,0,0,0.85) 0%, transparent 100%)',
        }} />

        {/* 컬럼들 */}
        <div style={{ display: 'flex', height: '100%', gap: 6, padding: '0 4px' }}>
          {COLS.map((col, ci) => {
            const totalH = col.heights.reduce((a, b) => a + b, 0) + col.heights.length * 6;
            return (
              <div key={ci} style={{ flex: 1, overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    animationName: 'mjScrollUp',
                    animationDuration: `${col.speed}s`,
                    animationTimingFunction: 'linear',
                    animationIterationCount: 'infinite',
                    animationDirection: col.dir,
                  }}
                >
                  {[0, 1].map((s) =>
                    col.heights.map((h, bi) => (
                      <div
                        key={`${s}-${bi}`}
                        style={{
                          width: '100%',
                          height: h,
                          borderRadius: 10,
                          background: COLORS[(ci + bi) % COLORS.length],
                          opacity: 0.5,
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
