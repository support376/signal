'use client';

import type { RadarDimension } from '@/lib/radar-dimensions';

interface Props {
  dimensions: RadarDimension[];
  size?: number;
  color?: string;
  compare?: RadarDimension[];
  compareColor?: string;
}

export default function RadarChart({
  dimensions,
  size = 280,
  color = '#666666',
  compare,
  compareColor = '#999999',
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const n = dimensions.length;

  function getPoint(index: number, value: number): { x: number; y: number } {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const dist = (value / 100) * r;
    return {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    };
  }

  function polygon(dims: RadarDimension[]): string {
    return dims.map((d, i) => {
      const p = getPoint(i, d.value);
      return `${p.x},${p.y}`;
    }).join(' ');
  }

  const gridLevels = [33, 66, 100];

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {gridLevels.map((lv) => (
          <polygon
            key={lv}
            points={dimensions.map((_, i) => {
              const p = getPoint(i, lv);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            className="stroke-line"
            strokeWidth={1}
          />
        ))}

        {dimensions.map((_, i) => {
          const p = getPoint(i, 100);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              className="stroke-line"
              strokeWidth={1}
              opacity={0.4}
            />
          );
        })}

        {compare && (
          <polygon
            points={polygon(compare)}
            fill={compareColor}
            fillOpacity={0.12}
            stroke={compareColor}
            strokeWidth={1.5}
            strokeOpacity={0.6}
          />
        )}

        <polygon
          points={polygon(dimensions)}
          fill={color}
          fillOpacity={0.2}
          stroke={color}
          strokeWidth={2}
        />

        {dimensions.map((d, i) => {
          const p = getPoint(i, d.value);
          return (
            <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color} />
          );
        })}

        {compare?.map((d, i) => {
          const p = getPoint(i, d.value);
          return (
            <circle key={`c${i}`} cx={p.x} cy={p.y} r={3} fill={compareColor} />
          );
        })}

        {dimensions.map((d, i) => {
          const p = getPoint(i, 120);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-fg text-[11px]"
            >
              {d.emoji} {d.label}
            </text>
          );
        })}
      </svg>

      {compare && (
        <div className="flex items-center gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            나
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: compareColor }} />
            상대
          </span>
        </div>
      )}
    </div>
  );
}
