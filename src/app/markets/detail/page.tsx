'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ContractCell } from '@/components/whale/PlatformTag';
import { fmtUsd, shortWallet } from '@/lib/whale/utils';
import { Shell, PageHero, TableShell, SkeletonList } from '@/components/whale/Shell';

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

function Content() {
  const searchParams = useSearchParams();
  const market = searchParams.get('market') ?? '';
  const platform = searchParams.get('platform') ?? 'polymarket';
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!market) return;
    setLoading(true);
    fetch(`/api/market_traders?market=${encodeURIComponent(market)}&platform=${encodeURIComponent(platform)}`)
      .then((r) => r.json())
      .then(setPositions)
      .catch(() => setPositions([]))
      .finally(() => setLoading(false));
  }, [market, platform]);

  return (
    <Shell>
      <PageHero
        eyebrow="Market detail"
        title={market || 'Market'}
        subtitle={
          market ? (
            <ContractCell title="Whale positions" platform={platform} />
          ) : (
            'Whale positions on this contract.'
          )
        }
      />
      {loading ? (
        <SkeletonList n={3} />
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
                  <td className="text-right font-mono tabular-nums" style={{ color: p.unrealized_pnl >= 0 ? 'var(--mint)' : 'var(--rose)' }}>
                    {fmtUsd(p.unrealized_pnl)}
                  </td>
                  <td className="text-right">
                    <Link href={`/profile?wallet=${p.wallet}`} className="btn btn-ghost text-xs !py-2 !px-4">Profile</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
    </Shell>
  );
}

export default function MarketDetailPage() {
  return (
    <Suspense fallback={<Shell><p style={{ color: 'var(--text-3)' }}>Loading…</p></Shell>}>
      <Content />
    </Suspense>
  );
}
