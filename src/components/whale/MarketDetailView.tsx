'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { PaperTradeModal } from '@/components/whale/PaperTradeModal';
import { SpreadSparkline } from '@/components/whale/SpreadSparkline';
import { ContractCell } from '@/components/whale/PlatformTag';
import {
  Shell,
  PageHeader,
  StatStrip,
  StatPill,
  TableShell,
  SkeletonList,
} from '@/components/whale/Shell';
import { resolveMarketIdentity } from '@/lib/whale/marketRoutes';
import { platformExternalUrl } from '@/lib/whale/marketUrls';
import { useArbitrageMap } from '@/lib/whale/hooks';
import { lookupSpread } from '@/services/arbitrage.utils';
import { formatNetROI } from '@/utils/arbMath';
import { fmtUsd, platformShort, shortWallet } from '@/lib/whale/utils';
import type { ScreenerRow } from '@/lib/whale/screener';

type Position = {
  wallet: string;
  display_name: string;
  outcome: string;
  shares: number;
  avg_price: number;
  current_price: number;
  usd_value: number;
  platform: string;
  unrealized_pnl: number;
};

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function MarketDetailView() {
  const sp = useSearchParams();
  const titleParam = sp.get('title');
  const platformParam = sp.get('platform');
  const venueParam = sp.get('venue');
  const decoded = useMemo(
    () =>
      resolveMarketIdentity('', {
        title: titleParam,
        platform: platformParam,
        venue: venueParam,
      }),
    [titleParam, platformParam, venueParam],
  );

  const [positions, setPositions] = useState<Position[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [screenerRow, setScreenerRow] = useState<ScreenerRow | null>(null);
  const [paperOpen, setPaperOpen] = useState(false);

  const title = decoded?.title ?? '';
  const venue = decoded?.platform ?? 'polymarket';
  const priceParam = sp.get('price');
  const volumeParam = sp.get('volume');
  const eventParam = sp.get('event');
  const event = eventParam ?? screenerRow?.event_title ?? null;

  const price =
    priceParam != null && priceParam !== ''
      ? parseFloat(priceParam)
      : (screenerRow?.probability ?? 0.5);
  const volume =
    volumeParam != null && volumeParam !== ''
      ? parseFloat(volumeParam)
      : (screenerRow?.volume ?? screenerRow?.volume_24h ?? 0);

  const { data: arbData } = useArbitrageMap();
  const spread = lookupSpread(arbData?.byPolyTitle ?? {}, title);
  const externalUrl =
    screenerRow?.external_url ??
    spread?.poly_url ??
    platformExternalUrl(venue, { title });

  const whaleExposure = useMemo(
    () => positions.reduce((sum, p) => sum + p.usd_value, 0),
    [positions],
  );

  useEffect(() => {
    if (!decoded) {
      setPositionsLoading(false);
      return;
    }
    setPositionsLoading(true);
    fetch(
      `/api/market_traders?market=${encodeURIComponent(decoded.title)}&platform=${encodeURIComponent(decoded.platform)}`,
    )
      .then((r) => r.json())
      .then((data) => setPositions(Array.isArray(data) ? data : []))
      .catch(() => setPositions([]))
      .finally(() => setPositionsLoading(false));
  }, [decoded]);

  useEffect(() => {
    if (!decoded) return;

    const params = new URLSearchParams({
      platform: decoded.platform,
      search: decoded.title,
      prob: 'all',
      volume_min: '0',
      limit: '20',
      offset: '0',
    });
    fetch(`/api/market_screener?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const rows = (data.rows ?? []) as ScreenerRow[];
        const key = decoded.title.toLowerCase();
        const exact =
          rows.find((r) => r.market_title === decoded.title) ??
          rows.find((r) => r.market_title.replace(/\s*\[(YES|NO)\]\s*$/i, '').trim() === decoded.title) ??
          rows.find((r) => {
            const rt = r.market_title.toLowerCase();
            return rt === key || rt.includes(key) || key.includes(rt);
          }) ??
          rows[0] ??
          null;
        setScreenerRow(exact);
      })
      .catch(() => setScreenerRow(null));
  }, [decoded]);

  if (!decoded) {
    return (
      <Shell>
        <div className="empty surface">
          <p>Market not found.</p>
          <Link href="/screener" className="btn btn-ghost text-xs mt-3 inline-block">
            Browse screener
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader
        title={title}
        description={event && event !== title ? event : 'Cross-venue contract detail'}
        action={
          <div className="flex gap-2 flex-wrap justify-end">
            <button type="button" className="btn btn-ghost text-xs" onClick={() => setPaperOpen(true)}>
              Paper trade
            </button>
            <Link
              href={`/screener?search=${encodeURIComponent(title)}`}
              className="btn btn-ghost text-xs"
            >
              Screener
            </Link>
            <a href={externalUrl} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs">
              Open venue <ExternalLink className="w-3 h-3 ml-1 inline" />
            </a>
          </div>
        }
      />

      <div className="mb-4">
        <ContractCell title={title} platform={venue} />
      </div>

      <StatStrip>
        <StatPill label="Venue" value={platformShort(venue)} />
        <StatPill label="Price" value={fmtPct(price)} accent="mint" />
        <StatPill label="Volume" value={fmtUsd(volume)} />
        <StatPill label="Whale exposure" value={fmtUsd(whaleExposure)} />
        <StatPill label="Whales" value={String(positions.length)} />
        {spread && (
          <StatPill
            label="Net profit"
            value={formatNetROI(spread.roi)}
            accent={spread.roi.tier === 'green' ? 'mint' : undefined}
          />
        )}
      </StatStrip>

      {screenerRow && (
        <div className="surface p-4 mb-4">
          <p className="text-[10px] uppercase opacity-50 mb-2">24h range</p>
          <div className="flex flex-wrap gap-4 text-sm font-mono tabular-nums">
            <span>O {screenerRow.price_open != null ? fmtPct(screenerRow.price_open) : '—'}</span>
            <span>H {screenerRow.price_high != null ? fmtPct(screenerRow.price_high) : '—'}</span>
            <span>L {screenerRow.price_low != null ? fmtPct(screenerRow.price_low) : '—'}</span>
            <span className="opacity-60">
              Δ{' '}
              {screenerRow.change_1d != null
                ? `${screenerRow.change_1d >= 0 ? '+' : ''}${(screenerRow.change_1d * 100).toFixed(1)} pp`
                : '—'}
            </span>
            {screenerRow.days_to_resolution != null && (
              <span className="opacity-60">{screenerRow.days_to_resolution}d to resolve</span>
            )}
          </div>
        </div>
      )}

      {spread && (
        <div className="surface p-4 mb-4">
          <p className="text-[10px] uppercase opacity-50 mb-2">Cross-venue spread</p>
          <div className="h-24 flex items-center justify-center">
            <SpreadSparkline
              contractId={spread.id}
              title={title}
              polyTitle={spread.poly_title}
              kalshiTitle={spread.kalshi_title}
              netCents={spread.net_profit_cents}
            />
          </div>
          <p className="text-[10px] opacity-40 mt-2">
            Matched: {spread.kalshi_title} · Poly {(spread.poly_price * 100).toFixed(1)}¢ vs Kalshi{' '}
            {(spread.kalshi_price * 100).toFixed(1)}¢
          </p>
        </div>
      )}

      <div className="surface p-4">
        <p className="text-[10px] uppercase opacity-50 mb-3">Whale positions</p>
        {positionsLoading ? (
          <SkeletonList n={4} />
        ) : positions.length === 0 ? (
          <p className="text-xs opacity-60 py-2">No whale holdings on this contract.</p>
        ) : (
          <TableShell>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trader</th>
                  <th>Outcome</th>
                  <th className="text-right">USD</th>
                  <th className="text-right">Unrealized</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={`${p.wallet}-${p.outcome}`}>
                    <td className="font-medium">{p.display_name || shortWallet(p.wallet)}</td>
                    <td style={{ color: 'var(--text-2)' }}>{p.outcome}</td>
                    <td className="text-right font-mono tabular-nums">{fmtUsd(p.usd_value)}</td>
                    <td
                      className="text-right font-mono tabular-nums"
                      style={{ color: p.unrealized_pnl >= 0 ? 'var(--mint)' : 'var(--rose)' }}
                    >
                      {fmtUsd(p.unrealized_pnl)}
                    </td>
                    <td className="text-right">
                      <Link href={`/profile?wallet=${p.wallet}`} className="btn btn-ghost text-xs !py-2 !px-4">
                        Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
      </div>

      <PaperTradeModal
        open={paperOpen}
        onClose={() => setPaperOpen(false)}
        marketTitle={title}
        venue={venue}
        price={spread?.poly_price ?? price}
        externalUrl={externalUrl}
        direction={spread?.direction === 'neutral' ? undefined : spread?.direction}
      />
    </Shell>
  );
}

export function MarketDetailFallback() {
  return (
    <Shell>
      <p className="opacity-50 text-sm">Loading market…</p>
    </Shell>
  );
}
