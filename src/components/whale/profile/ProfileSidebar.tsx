'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { SearchInput } from '@/components/whale/Shell';
import { fmtUsd, shortWallet } from '@/lib/whale/utils';
import type { ProfileTrader } from './types';

export function ProfileSidebar({
  traders,
  selected,
  onSelect,
  loading,
}: {
  traders: ProfileTrader[];
  selected: string;
  onSelect: (wallet: string) => void;
  loading?: boolean;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return traders;
    return traders.filter(
      (t) =>
        t.display_name?.toLowerCase().includes(q) ||
        t.wallet.toLowerCase().includes(q),
    );
  }, [traders, search]);

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    const q = search.trim();
    if (q.startsWith('0x') && q.length >= 10) onSelect(q);
  }

  return (
    <aside className="profile-sidebar surface">
      <p className="profile-section-label">Whale wallets</p>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search name, wallet, or paste 0x…"
        onKeyDown={handleSearchKeyDown}
      />
      <p className="text-[10px] opacity-50 mt-2 mb-2 font-mono tabular-nums">
        {loading ? 'Loading…' : `${filtered.length} of ${traders.length}`}
      </p>
      <div className="profile-trader-list">
        {filtered.map((t) => (
          <button
            key={t.wallet}
            type="button"
            data-active={selected === t.wallet}
            onClick={() => onSelect(t.wallet)}
            className="trader-row"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-[13px] truncate">
                {t.display_name || shortWallet(t.wallet)}
              </span>
              <span className="text-[10px] font-mono opacity-40 shrink-0">#{t.rank}</span>
            </div>
            <div className="font-mono text-[11px] mt-0.5 tabular-nums opacity-70">
              {fmtUsd(t.alltime_profit)}
            </div>
          </button>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="text-xs opacity-60 py-4 text-center">No wallets match.</p>
        )}
      </div>
    </aside>
  );
}
