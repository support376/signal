'use client';

import { useEffect, useState } from 'react';

/**
 * Midjourney-style 배경 — 진짜 이미지 갤러리가 흐르는 그리드
 * picsum.photos (무료) 또는 고정 이미지 세트 사용
 * 컬럼별 다른 속도 + 방향 교차 + 상하 페이드
 */

// 6컬럼 × 10행 = 60개 이미지 (작은 썸네일, lazy load)
// picsum.photos: seed로 고정 이미지 (매번 같은 사진)
function getImageUrl(seed: number, w: number, h: number) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

interface ColConfig {
  speed: number;
  dir: 'normal' | 'reverse';
  heights: number[];
}

const COLS: ColConfig[] = [
  { speed: 80, dir: 'normal', heights: [180, 220, 160, 240, 200, 180, 220, 160, 200, 240] },
  { speed: 60, dir: 'reverse', heights: [200, 160, 240, 180, 220, 200, 160, 240, 180, 220] },
  { speed: 95, dir: 'normal', heights: [220, 240, 180, 160, 200, 220, 240, 180, 160, 200] },
  { speed: 65, dir: 'reverse', heights: [160, 200, 220, 240, 180, 160, 200, 220, 240, 180] },
  { speed: 85, dir: 'normal', heights: [240, 180, 200, 160, 220, 240, 180, 200, 160, 220] },
  { speed: 100, dir: 'reverse', heights: [180, 240, 160, 220, 200, 180, 240, 160, 220, 200] },
];

export default function ScrollingGridBg() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* 상하 강한 페이드 */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        background: 'linear-gradient(180deg, #000 0%, rgba(0,0,0,0.3) 15%, transparent 30%, transparent 70%, rgba(0,0,0,0.3) 85%, #000 100%)',
      }} />

      {/* 중앙 콘텐츠 영역 어둡게 */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        background: 'radial-gradient(ellipse 55% 45% at 50% 45%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
      }} />

      {/* 전체 어둡게 + 살짝 blur */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        backgroundColor: 'rgba(0,0,0,0.4)',
      }} />

      {/* 이미지 그리드 */}
      <div style={{ display: 'flex', height: '100%', gap: 4, padding: '0 2px' }}>
        {COLS.map((col, ci) => (
          <div key={ci} style={{ flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                animationName: 'mjScrollUp',
                animationDuration: `${col.speed}s`,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationDirection: col.dir,
              }}
            >
              {[0, 1].map((setIdx) =>
                col.heights.map((h, bi) => {
                  const seed = ci * 100 + bi * 10 + setIdx + 42;
                  return (
                    <img
                      key={`${setIdx}-${bi}`}
                      src={getImageUrl(seed, 200, h)}
                      alt=""
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: h,
                        objectFit: 'cover',
                        borderRadius: 8,
                        display: 'block',
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
