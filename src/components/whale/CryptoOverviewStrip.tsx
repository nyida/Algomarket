'use client';

import { fmtUsd } from '@/lib/whale/utils';
import { useCryptoOverview } from '@/lib/whale/dataSourceHooks';

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function CryptoOverviewStrip() {
  const { data, isLoading } = useCryptoOverview();
  const tickers = data?.tickers ?? [];

  if (isLoading && !tickers.length) {
    return (
      <div className="crypto-strip crypto-strip--loading">
        <span className="text-[11px] text-[var(--muted)]">Loading crypto prices…</span>
      </div>
    );
  }

  if (!tickers.length) return null;

  return (
    <div className="crypto-strip">
      <span className="crypto-strip-label">Crypto</span>
      <div className="crypto-strip-items">
        {tickers.slice(0, 5).map((t) => (
          <div key={t.id} className="crypto-strip-item">
            <span className="crypto-symbol">{t.symbol}</span>
            <span className="crypto-price">{fmtUsd(t.price_usd, 0)}</span>
            <span className={t.change_24h >= 0 ? 'text-[var(--mint)]' : 'text-[var(--rose)]'}>
              {fmtPct(t.change_24h)}
            </span>
          </div>
        ))}
      </div>
      <span className="crypto-strip-source">via CoinPaprika</span>
    </div>
  );
}
