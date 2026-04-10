'use client';

interface Point {
  x: number;    // -1..1 (회피 축)
  y: number;    // -1..1 (불안 축)
  label: string;
  name?: string;
  color?: string;
}

interface Props {
  points: Point[];
  size?: number;
}

export default function AttachmentQuadrant({ points, size = 240 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;  // 좌표 영역 반지름

  function toSvg(x: number, y: number): { sx: number; sy: number } {
    return {
      sx: cx + x * r,
      sy: cy - y * r,  // SVG y는 아래가 +, 반전
    };
  }

  // 4분면 라벨
  const quadrants = [
    { label: '불안형', x: -0.6, y: 0.6, color: '#ffb86b' },
    { label: '혼란형', x: 0.6, y: 0.6, color: '#ff6b6b' },
    { label: '안정형', x: -0.6, y: -0.6, color: '#5be3c7' },
    { label: '회피형', x: 0.6, y: -0.6, color: '#7aa2ff' },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 배경 */}
        <rect x={0} y={0} width={size} height={size} rx={12} fill="#0b0d12" />

        {/* 4분면 색상 영역 */}
        <rect x={2} y={2} width={cx - 2} height={cy - 2} fill="#ffb86b" fillOpacity={0.06} />
        <rect x={cx} y={2} width={cx - 2} height={cy - 2} fill="#ff6b6b" fillOpacity={0.06} />
        <rect x={2} y={cy} width={cx - 2} height={cy - 2} fill="#5be3c7" fillOpacity={0.06} />
        <rect x={cx} y={cy} width={cx - 2} height={cy - 2} fill="#7aa2ff" fillOpacity={0.06} />

        {/* 축 선 */}
        <line x1={cx} y1={8} x2={cx} y2={size - 8} stroke="#2a3142" strokeWidth={1} />
        <line x1={8} y1={cy} x2={size - 8} y2={cy} stroke="#2a3142" strokeWidth={1} />

        {/* 축 라벨 */}
        <text x={cx} y={14} textAnchor="middle" className="fill-dim text-[9px]">불안 높음</text>
        <text x={cx} y={size - 6} textAnchor="middle" className="fill-dim text-[9px]">불안 낮음</text>
        <text x={12} y={cy - 6} textAnchor="start" className="fill-dim text-[9px]">회피 낮음</text>
        <text x={size - 12} y={cy - 6} textAnchor="end" className="fill-dim text-[9px]">회피 높음</text>

        {/* 4분면 이름 */}
        {quadrants.map((q) => {
          const { sx, sy } = toSvg(q.x, q.y);
          return (
            <text
              key={q.label}
              x={sx}
              y={sy}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={q.color}
              className="text-[10px]"
              opacity={0.5}
            >
              {q.label}
            </text>
          );
        })}

        {/* 데이터 포인트 */}
        {points.map((p, i) => {
          const { sx, sy } = toSvg(p.x, p.y);
          const fill = p.color || (i === 0 ? '#7aa2ff' : '#b07aff');
          return (
            <g key={i}>
              {/* 펄스 효과 */}
              <circle cx={sx} cy={sy} r={14} fill={fill} fillOpacity={0.15}>
                <animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* 점 */}
              <circle cx={sx} cy={sy} r={6} fill={fill} stroke="#0b0d12" strokeWidth={2} />
              {/* 이름 */}
              {p.name && (
                <text
                  x={sx}
                  y={sy - 14}
                  textAnchor="middle"
                  fill={fill}
                  className="text-[11px] font-semibold"
                >
                  {p.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* 범례 */}
      <div className="flex items-center gap-3 mt-2 text-xs text-dim">
        {points.map((p, i) => (
          <span key={i} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: p.color || (i === 0 ? '#7aa2ff' : '#b07aff') }}
            />
            {p.name || (i === 0 ? '나' : '상대')} · {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
