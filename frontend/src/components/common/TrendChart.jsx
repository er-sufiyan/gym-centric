import React, { useState } from 'react';

export default function TrendChart({
  eyebrow = 'TRAFFIC',
  title = 'Activity Trend',
  subtitle = 'Last 8 days',
  data = [],
  valuePrefix = '',
  valueSuffix = ''
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) return null;

  const width = 680;
  const height = 190;
  const padX = 28;
  const padTop = 22;
  const padBottom = 28;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const span = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padX + (i * (width - padX * 2)) / Math.max(data.length - 1, 1);
    const y = height - padBottom - ((d.value - minVal) / span) * (height - padTop - padBottom);
    return { x, y, ...d };
  });

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padBottom} L ${points[0].x} ${height - padBottom} Z`;

  const gridLines = [0, 0.33, 0.66, 1].map((t) => padTop + t * (height - padTop - padBottom));
  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : points[points.length - 1];

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-cyan-400">{eyebrow}</p>
          <h3 className="text-base font-bold text-white mt-1">{title}</h3>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-cyan-300">
            {valuePrefix}
            {activePoint.value.toLocaleString()}
            {valueSuffix}
          </p>
          <p className="text-[11px] text-slate-500">
            {activePoint.label} • {subtitle}
          </p>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          <defs>
            <linearGradient id="cyanAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Subtle dashed horizontal grid lines */}
          {gridLines.map((yPos, idx) => (
            <line
              key={idx}
              x1={padX}
              y1={yPos}
              x2={width - padX}
              y2={yPos}
              stroke="rgba(148, 163, 184, 0.14)"
              strokeDasharray="4 5"
              strokeWidth="1"
            />
          ))}

          {/* Area under line */}
          <path d={areaPath} fill="url(#cyanAreaFill)" />

          {/* Glowing cyan line */}
          <path
            d={linePath}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data nodes + labels */}
          {points.map((pt, idx) => {
            const isActive = hoveredIdx === idx || (hoveredIdx === null && idx === points.length - 1);
            return (
              <g
                key={pt.label}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isActive ? 5.5 : 4}
                  fill="#060b0e"
                  stroke="#22d3ee"
                  strokeWidth={isActive ? 3 : 2.2}
                />
                <text
                  x={pt.x}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-medium"
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
