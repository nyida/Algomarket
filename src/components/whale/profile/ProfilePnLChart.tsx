'use client';

import type { ChartPoint } from './types';

export function ProfilePnLChart({ data }: { data: ChartPoint[] }) {
  if (!data.length) {
    return (
      <p className="text-sm py-8 text-center opacity-60">No P&amp;L history for this wallet yet.</p>
    );
  }

  const values = data.map((d) => d.cumulative_pnl);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const w = 480;
  const h = 140;
  const zeroY = h - ((0 - min) / range) * (h - 16) - 8;

  const points = data
    .map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * w;
      const y = h - ((d.cumulative_pnl - min) / range) * (h - 16) - 8;
      return `${x},${y}`;
    })
    .join(' ');

  const last = values[values.length - 1] ?? 0;
  const stroke = last >= 0 ? 'var(--mint)' : 'var(--rose)';

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[140px]" role="img" aria-label="Cumulative profit chart">
        <line
          x1={0}
          y1={zeroY}
          x2={w}
          y2={zeroY}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
      <div className="flex justify-between text-[10px] font-mono tabular-nums opacity-50 mt-1 px-0.5">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
