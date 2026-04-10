'use client';

interface Point {
  x: number;
  y: number;
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
  const r = size * 0.4;

  function toSvg(x: number, y: number): { sx: number; sy: number } {
    return {
      sx: cx + x * r,
      sy: cy - y * r,
    };
  }

  const quadrants = [
    { label: '불안형', x: -0.6, y: 0.6 },
    { label: '혼란형', x: 0.6, y: 0.6 },
    { label: '안정형', x: -0.6, y: -0.6 },
    { label: '회피형', x: 0.6, y: -0.6 },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect x={0} y={0} width={size} height={size} rx={12} className="fill-card" />

        <line x1={cx} y1={8} x2={cx} y2={size - 8} className="stroke-line" strokeWidth={1} />
        <line x1={8} y1={cy} x2={size - 8} y2={cy} className="stroke-line" strokeWidth={1} />

        <text x={cx} y={14} textAnchor="middle" className="fill-dim text-[9px]">불안 높음</text>
        <text x={cx} y={size - 6} textAnchor="middle" className="fill-dim text-[9px]">불안 낮음</text>
        <text x={12} y={cy - 6} textAnchor="start" className="fill-dim text-[9px]">회피 낮음</text>
        <text x={size - 12} y={cy - 6} textAnchor="end" className="fill-dim text-[9px]">회피 높음</text>

        {quadrants.map((q) => {
          const { sx, sy } = toSvg(q.x, q.y);
          return (
            <text
              key={q.label}
              x={sx}
              y={sy}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-faint text-[10px]"
            >
              {q.label}
            </text>
          );
        })}

        {points.map((p, i) => {
          const { sx, sy } = toSvg(p.x, p.y);
          const fill = p.color || (i === 0 ? '#666666' : '#999999');
          return (
            <g key={i}>
              <circle cx={sx} cy={sy} r={6} fill={fill} className="stroke-bg" strokeWidth={2} />
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

      <div className="flex items-center gap-3 mt-2 text-xs text-dim">
        {points.map((p, i) => (
          <span key={i} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: p.color || (i === 0 ? '#666666' : '#999999') }}
            />
            {p.name || (i === 0 ? '나' : '상대')} · {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
