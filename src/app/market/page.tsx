'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { PaperTradeModal } from '@/components/whale/PaperTradeModal';
import { SpreadSparkline } from '@/components/whale/SpreadSparkline';
import { Shell, PageHeader, StatStrip, StatPill } from '@/components/whale/Shell';
import { useArbitrageMap } from '@/lib/whale/hooks';
import { lookupSpread } from '@/services/arbitrage.utils';
import { formatNetROI } from '@/utils/arbMath';
import { fmtUsd, platformShort } from '@/lib/whale/utils';
import { useState } from 'react';

function MarketContent() {
  const sp = useSearchParams();
  const title = sp.get('title') ?? '';
  const venue = (sp.get('venue') ?? 'polymarket') as 'polymarket' | 'kalshi';
  const price = parseFloat(sp.get('price') ?? '0.5');
  const volume = parseFloat(sp.get('volume') ?? '0');
  const externalUrl = sp.get('url') ?? '#';
  const event = sp.get('event');
  const [paperOpen, setPaperOpen] = useState(false);

  const { data: arbData } = useArbitrageMap();
  const spread = lookupSpread(arbData?.byPolyTitle ?? {}, title);

  return (
    <Shell>
      <PageHeader
        title={title || 'Contract'}
        description={event ?? 'Cross-venue contract detail'}
        action={
          <div className="flex gap-2">
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

      <StatStrip>
        <StatPill label="Venue" value={platformShort(venue)} />
        <StatPill label="Price" value={`${(price * 100).toFixed(1)}%`} accent="mint" />
        <StatPill label="Volume" value={fmtUsd(volume)} />
        {spread && (
          <StatPill
            label="Net profit"
            value={formatNetROI(spread.roi)}
            accent={spread.roi.tier === 'green' ? 'mint' : undefined}
          />
        )}
      </StatStrip>

      {spread && (
        <div className="surface p-4 mb-4">
          <p className="text-[10px] uppercase opacity-50 mb-2">Spread trend — click for full chart</p>
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

      {venue === 'polymarket' && (
        <div className="surface p-4">
          <Link
            href={`/markets/detail?market=${encodeURIComponent(title)}&platform=polymarket`}
            className="btn btn-ghost text-xs"
          >
            View whale holdings →
          </Link>
        </div>
      )}

      <PaperTradeModal
        open={paperOpen}
        onClose={() => setPaperOpen(false)}
        marketTitle={title}
        venue={venue}
        price={price}
        externalUrl={externalUrl}
        direction={
          spread?.direction === 'neutral' ? undefined : spread?.direction
        }
      />
    </Shell>
  );
}

export default function MarketPage() {
  return (
    <Suspense fallback={<Shell><p className="opacity-50 text-sm">Loading…</p></Shell>}>
      <MarketContent />
    </Suspense>
  );
}
