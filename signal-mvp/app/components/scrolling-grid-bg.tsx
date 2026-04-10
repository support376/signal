'use client';

/**
 * Midjourney-style 스크롤링 그리드 배경
 * 순수 인라인 스타일 (style jsx X, Tailwind dynamic X)
 * CSS transform + animation만 사용 (GPU 가속)
 */

const COLORS = [
  'rgba(0,180,220,0.15)',
  'rgba(120,60,200,0.12)',
  'rgba(0,200,120,0.12)',
  'rgba(60,100,220,0.12)',
  'rgba(0,150,180,0.15)',
  'rgba(100,40,180,0.12)',
  'rgba(0,220,160,0.10)',
  'rgba(80,80,200,0.12)',
  'rgba(0,200,200,0.10)',
  'rgba(140,60,220,0.12)',
];

const COLUMNS = [
  { speed: 70, dir: 'up', heights: [120, 160, 100, 180, 140, 120, 160, 100, 140, 180] },
  { speed: 55, dir: 'down', heights: [140, 100, 180, 120, 160, 140, 100, 180, 120, 160] },
  { speed: 85, dir: 'up', heights: [160, 180, 120, 100, 140, 160, 180, 120, 100, 140] },
  { speed: 60, dir: 'down', heights: [100, 140, 160, 180, 120, 100, 140, 160, 180, 120] },
  { speed: 75, dir: 'up', heights: [180, 120, 140, 100, 160, 180, 120, 140, 100, 160] },
  { speed: 90, dir: 'down', heights: [120, 180, 100, 160, 140, 120, 180, 100, 160, 140] },
];

export default function ScrollingGridBg({ opacity = 0.2 }: { opacity?: number }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden',
      pointerEvents: 'none', opacity,
    }}>
      {/* 상하 페이드 마스크 */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: 'linear-gradient(to bottom, #000 0%, transparent 15%, transparent 85%, #000 100%)',
      }} />

      {/* 중앙 콘텐츠 마스크 */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0,0,0,0.9) 0%, transparent 100%)',
      }} />

      {/* 컬럼 컨테이너 */}
      <div style={{ display: 'flex', height: '100%', gap: 6, padding: '0 4px' }}>
        {COLUMNS.map((col, ci) => (
          <div key={ci} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              animation: `${col.dir === 'up' ? 'mj-scroll-up' : 'mj-scroll-down'} ${col.speed}s linear infinite`,
            }}>
              {/* 블록 세트 × 2 (무한 루프) */}
              {[0, 1].map((setIdx) =>
                col.heights.map((h, bi) => (
                  <div
                    key={`${setIdx}-${bi}`}
                    style={{
                      width: '100%',
                      height: h,
                      minHeight: h,
                      borderRadius: 12,
                      background: `linear-gradient(135deg, ${COLORS[(ci * 3 + bi) % COLORS.length]}, ${COLORS[(ci * 3 + bi + 3) % COLORS.length]})`,
                    }}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
