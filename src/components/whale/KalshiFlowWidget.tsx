'use client';

import { fmtUsd } from '@/lib/whale/utils';
import { useKalshiFlow } from '@/lib/whale/hooks';

function FlowSplitBar({ yesUsd, noUsd }: { yesUsd: number; noUsd: number }) {
  const total = yesUsd + noUsd || 1;
  const yesPct = (yesUsd / total) * 100;

  return (
    <div className="flow-split-bar" aria-hidden>
      <div className="flow-split-yes" style={{ width: `${yesPct}%` }}>
        <span>YES</span>
      </div>
      <div className="flow-split-no" style={{ width: `${100 - yesPct}%` }}>
        <span>NO</span>
      </div>
    </div>
  );
}

export function KalshiFlowWidget() {
  const { data, isLoading, isError } = useKalshiFlow();
  const flows = data?.flows ?? [];

  return (
    <aside className="kalshi-flow-widget surface">
      <div className="kalshi-flow-header">
        <span className="text-[10px] uppercase tracking-wider opacity-60">Kalshi sentiment</span>
        <span className="text-[9px] opacity-40">1h tape · anonymous fills</span>
      </div>

      {isLoading && flows.length === 0 && <div className="shimmer h-16 w-full rounded mx-3 my-2" />}
      {isError && (
        <p className="text-xs p-3 opacity-50">Kalshi flow unavailable.</p>
      )}
      {!isLoading && flows.length === 0 && (
        <p className="text-xs p-3 opacity-50">No Kalshi fills in the last hour.</p>
      )}

      <ul className="kalshi-flow-list">
        {flows.slice(0, 12).map((f) => {
          const positive = f.net_flow_usd >= 0;
          return (
            <li key={f.market_title} className="kalshi-flow-row">
              <div className="min-w-0 flex-1">
                <div className="kalshi-flow-row-head">
                  <div className="text-[11px] leading-snug truncate" title={f.market_title}>
                    {f.market_title}
                  </div>
                  <div
                    className="font-mono tabular-nums text-[10px] shrink-0"
                    style={{ color: positive ? 'var(--mint)' : 'var(--rose)' }}
                  >
                    {positive ? '+' : ''}
                    {fmtUsd(f.net_flow_usd)}
                  </div>
                </div>
                <FlowSplitBar yesUsd={f.yes_usd} noUsd={f.no_usd} />
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
