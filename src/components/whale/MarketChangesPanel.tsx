'use client';

import { ExternalLink } from 'lucide-react';
import { useMarketChanges } from '@/lib/whale/dataSourceHooks';
import { platformShort } from '@/lib/whale/utils';

function fmtChangeType(type: string): string {
  switch (type) {
    case 'price_move':
      return 'Price move';
    case 'new_contract':
      return 'New market';
    case 'removed_contract':
      return 'Removed';
    default:
      return type;
  }
}

export function MarketChangesPanel({ since = '1h', limit = 15 }: { since?: string; limit?: number }) {
  const { data, isLoading } = useMarketChanges(since);
  const changes = (data?.changes ?? []).slice(0, limit);

  if (isLoading && !changes.length) {
    return (
      <div className="market-changes-panel">
        <h3 className="panel-subtitle">Market changes</h3>
        <p className="text-[11px] text-[var(--muted)]">Loading cross-venue changes…</p>
      </div>
    );
  }

  if (!changes.length) return null;

  return (
    <div className="market-changes-panel">
      <div className="panel-head">
        <h3 className="panel-subtitle">Market changes</h3>
        <span className="text-[10px] text-[var(--muted)]">SimpleFunctions · last {since}</span>
      </div>
      <ul className="market-changes-list">
        {changes.map((c) => (
          <li key={c.id} className="market-changes-item">
            <span className="change-type">{fmtChangeType(c.type)}</span>
            <span className="change-title">{c.title}</span>
            <span className="change-platform">{platformShort(c.platform)}</span>
            {c.new_price != null && (
              <span className="change-price">{(c.new_price * 100).toFixed(1)}%</span>
            )}
            {c.external_url && (
              <a href={c.external_url} target="_blank" rel="noreferrer" className="change-link">
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
