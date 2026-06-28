'use client';

import Link from 'next/link';
import { NetROIBadge } from '@/components/whale/NetROIBadge';
import { SpreadSparkline } from '@/components/whale/SpreadSparkline';
import { ArbAlertsBar } from '@/components/whale/ArbAlertsBar';
import {
  Shell,
  PageHeader,
  TableShell,
  SkeletonTable,
  FadeSwap,
  StatStrip,
  StatPill,
  Pager,
} from '@/components/whale/Shell';
import { DataSourcesBanner } from '@/components/whale/DataSourcesBanner';
import { LiveRefreshNote } from '@/components/whale/LiveRefreshNote';
import { useArbitrageMap } from '@/lib/whale/hooks';
import { marketDetailPath } from '@/lib/whale/marketRoutes';
import { platformExternalUrl } from '@/lib/whale/marketUrls';
import { fmtRelativeTime } from '@/lib/whale/utils';

const PAGE_SIZE = 40;
const MIN_SPREAD = 0.02;

export default function ArbScannerPage() {
  const { data, isLoading, isError, dataUpdatedAt } = useArbitrageMap(MIN_SPREAD);
  const pairs = (data?.pairs ?? [])
    .filter((p) => Math.abs(p.spread) >= MIN_SPREAD)
    .sort((a, b) => b.net_profit_cents - a.net_profit_cents);

  const profitable = pairs.filter((p) => p.roi.tier === 'green').length;
  const marginal = pairs.filter((p) => p.roi.tier === 'yellow').length;

  return (
    <Shell>
      <PageHeader
        title="Arbitrage scanner"
        description="Cross-venue gaps ≥ 2¢ between Polymarket & Kalshi — sorted by net profit after fees. Enable POLYROUTER_API_KEY for unified 7-platform discovery."
        action={dataUpdatedAt ? <LiveRefreshNote lastFetch={dataUpdatedAt} label="Scanned" /> : null}
      />

      <DataSourcesBanner />

      <StatStrip>
        <StatPill label="Opportunities" value={pairs.length.toLocaleString()} accent="mint" />
        <StatPill label="Profitable (>1¢)" value={String(profitable)} />
        <StatPill label="Marginal (0–1¢)" value={String(marginal)} />
        <StatPill label="Min spread" value="2¢" />
      </StatStrip>

      <ArbAlertsBar pairs={pairs} />

      {isError && (
        <div className="error-banner">
          <p>Failed to load arbitrage data. Retrying…</p>
        </div>
      )}

      {isLoading && pairs.length === 0 ? (
        <SkeletonTable rows={12} />
      ) : (
        <FadeSwap viewKey={`arbs-${pairs.length}-${dataUpdatedAt}`}>
          <TableShell>
            <table className="data-table screener-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Matched markets</th>
                  <th className="text-right">Poly</th>
                  <th className="text-right">Kalshi</th>
                  <th className="text-right">Net profit</th>
                  <th className="text-center">Trend</th>
                  <th className="text-right">Last seen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pairs.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty">No arbs above 2¢ right now. Check back in ~10s.</div>
                    </td>
                  </tr>
                )}
                {pairs.slice(0, PAGE_SIZE).map((spread, i) => (
                  <tr key={spread.id}>
                    <td className="font-mono tabular-nums">{i + 1}</td>
                    <td className="col-market">
                      <a
                        href={marketDetailPath(spread.poly_title, 'polymarket', {
                          price: spread.poly_price,
                        })}
                        className="block hover:underline"
                      >
                        <div className="market-title leading-snug">{spread.poly_title}</div>
                        <div className="text-[10px] mt-0.5 opacity-50">↔ {spread.kalshi_title}</div>
                      </a>
                    </td>
                    <td className="text-right font-mono tabular-nums">{(spread.poly_price * 100).toFixed(1)}%</td>
                    <td className="text-right font-mono tabular-nums">{(spread.kalshi_price * 100).toFixed(1)}%</td>
                    <td className="text-right">
                      <NetROIBadge spread={spread} />
                    </td>
                    <td className="text-center">
                      <SpreadSparkline
                        contractId={spread.id}
                        title={spread.poly_title}
                        polyTitle={spread.poly_title}
                        kalshiTitle={spread.kalshi_title}
                        netCents={spread.net_profit_cents}
                      />
                    </td>
                    <td className="text-right font-mono tabular-nums text-[10px] opacity-60">
                      {fmtRelativeTime(Math.floor(spread.last_seen_at / 1000))}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <a
                        href={spread.poly_url || platformExternalUrl('polymarket', { title: spread.poly_title })}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost text-[10px] !py-0.5"
                      >
                        Poly
                      </a>
                      <a
                        href={spread.kalshi_url || platformExternalUrl('kalshi', { title: spread.kalshi_title })}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost text-[10px] !py-0.5"
                      >
                        Kalshi
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
          {pairs.length > PAGE_SIZE && (
            <Pager page={1} totalPages={1} total={pairs.length} pageSize={PAGE_SIZE} onChange={() => {}} />
          )}
        </FadeSwap>
      )}

      <p className="text-[10px] opacity-50 mt-4 text-center">
        Net profit = gross spread − 1.5% Kalshi fee − 1% Poly fee − $0.75 gas · refreshes every 10s
      </p>
    </Shell>
  );
}
