'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fmtUsd, shortWallet } from '@/lib/whale/utils';
import { usePoll } from '@/lib/whale/usePoll';
import {
  Shell,
  PageHeader,
  SearchInput,
  Pager,
  StatStrip,
  StatPill,
  TableShell,
  SkeletonTable,
  Toolbar,
} from '@/components/whale/Shell';

const PAGE_SIZE = 40;
const POLL_MS = 30000;

type Trader = {
  wallet: string;
  display_name: string;
  alltime_profit: number;
  rank: number;
};

export default function TradersPage() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/all_traders', { cache: 'no-store' });
      if (res.ok) setTraders(await res.json());
      else if (!silent) setTraders([]);
    } catch {
      if (!silent) setTraders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  usePoll(() => load(true), POLL_MS);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return traders;
    return traders.filter(
      (t) => t.display_name?.toLowerCase().includes(q) || t.wallet.toLowerCase().includes(q),
    );
  }, [traders, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => setPage(1), [search]);

  const totalProfit = traders.reduce((s, t) => s + t.alltime_profit, 0);

  return (
    <Shell>
      <PageHeader title="Leaderboard" description="All-time profit by Polymarket whale wallets — auto-updates" />

      <StatStrip>
        <StatPill label="Traders" value={loading ? '—' : traders.length.toLocaleString()} />
        <StatPill label="Top" value={loading ? '—' : fmtUsd(traders[0]?.alltime_profit ?? 0)} accent="mint" />
        <StatPill label="Combined" value={loading ? '—' : fmtUsd(totalProfit)} />
      </StatStrip>

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or wallet…" />
      </Toolbar>

      {loading ? (
        <SkeletonTable rows={12} />
      ) : (
        <TableShell
          footer={
            filtered.length > PAGE_SIZE ? (
              <Pager page={safePage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
            ) : undefined
          }
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Trader</th>
                <th className="text-right">Profit</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((t) => (
                <tr key={t.wallet}>
                  <td className="font-mono tabular-nums w-10" style={{ color: 'var(--text-3)' }}>
                    {t.rank}
                  </td>
                  <td>
                    <div className="font-medium">{t.display_name || shortWallet(t.wallet)}</div>
                    <div className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>{shortWallet(t.wallet)}</div>
                  </td>
                  <td className="text-right font-mono tabular-nums font-medium" style={{ color: t.alltime_profit >= 0 ? 'var(--mint)' : 'var(--rose)' }}>
                    {fmtUsd(t.alltime_profit)}
                  </td>
                  <td className="text-right">
                    <Link href={`/profile?wallet=${t.wallet}`} className="btn btn-ghost">
                      View
                    </Link>
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
