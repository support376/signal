'use client';

/**
 * Midjourney-style 배경 — 그래디언트 블록 그리드가 컬럼별로 흐르는 효과
 * 이미지 대신 gradient 블록 사용 (외부 리소스 0)
 * CSS transform만 사용 (GPU 가속, 성능 좋음)
 */

const GRADIENTS = [
  'from-cyan-900/40 to-cyan-800/20',
  'from-purple-900/40 to-purple-800/20',
  'from-emerald-900/40 to-emerald-800/20',
  'from-blue-900/40 to-blue-800/20',
  'from-teal-900/40 to-teal-800/20',
  'from-indigo-900/40 to-indigo-800/20',
  'from-cyan-900/30 to-purple-900/20',
  'from-emerald-900/30 to-cyan-900/20',
  'from-purple-900/30 to-blue-900/20',
  'from-teal-900/30 to-emerald-900/20',
];

// 각 컬럼의 블록 높이 패턴 (다양한 비율)
const BLOCK_HEIGHTS = [
  [120, 160, 100, 180, 140, 120, 160, 100, 140, 180],
  [140, 100, 180, 120, 160, 140, 100, 180, 120, 160],
  [160, 180, 120, 100, 140, 160, 180, 120, 100, 140],
  [100, 140, 160, 180, 120, 100, 140, 160, 180, 120],
  [180, 120, 140, 100, 160, 180, 120, 140, 100, 160],
  [120, 180, 100, 160, 140, 120, 180, 100, 160, 140],
];

// 컬럼별 속도 (초) — 서로 다르게 해서 패럴랙스
const SPEEDS = [70, 55, 85, 60, 75, 90];

// 방향: 홀수 위, 짝수 아래
const DIRECTIONS = ['up', 'down', 'up', 'down', 'up', 'down'];

export default function ScrollingGridBg({ opacity = 0.15 }: { opacity?: number }) {
  const cols = 6;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ opacity }}
    >
      {/* 상단 + 하단 페이드 마스크 */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: 'linear-gradient(to bottom, #000 0%, transparent 20%, transparent 80%, #000 100%)',
        }}
      />

      {/* 중앙 콘텐츠 영역 마스크 (텍스트 가독성) */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,0,0,0.85) 0%, transparent 100%)',
        }}
      />

      {/* 그리드 컬럼들 */}
      <div className="flex h-full gap-2 px-2">
        {Array.from({ length: cols }).map((_, colIdx) => {
          const speed = SPEEDS[colIdx % SPEEDS.length];
          const dir = DIRECTIONS[colIdx % DIRECTIONS.length];
          const heights = BLOCK_HEIGHTS[colIdx % BLOCK_HEIGHTS.length];
          const gradient = (blockIdx: number) =>
            GRADIENTS[(colIdx * 3 + blockIdx) % GRADIENTS.length];

          return (
            <div
              key={colIdx}
              className="flex-1 overflow-hidden relative"
            >
              {/* 두 번 복제 (무한 루프) */}
              <div
                className="flex flex-col gap-2"
                style={{
                  animation: `scroll${dir === 'up' ? 'Up' : 'Down'} ${speed}s linear infinite`,
                }}
              >
                {/* 첫 번째 세트 */}
                {heights.map((h, bIdx) => (
                  <div
                    key={`a${bIdx}`}
                    className={`w-full rounded-xl bg-gradient-to-br ${gradient(bIdx)}`}
                    style={{ height: h, minHeight: h }}
                  />
                ))}
                {/* 복제 세트 (무한 루프용) */}
                {heights.map((h, bIdx) => (
                  <div
                    key={`b${bIdx}`}
                    className={`w-full rounded-xl bg-gradient-to-br ${gradient(bIdx)}`}
                    style={{ height: h, minHeight: h }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* CSS 애니메이션 (인라인 — 컴포넌트 자급자족) */}
      <style jsx>{`
        @keyframes scrollUp {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        @keyframes scrollDown {
          from { transform: translateY(-50%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
