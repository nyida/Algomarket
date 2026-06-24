'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Search } from 'lucide-react';
import { MARKET_CATEGORIES } from '@/lib/whale/categories';
import { useUnifiedSearch } from '@/lib/whale/hooks';
import { marketDetailPath } from '@/lib/whale/marketRoutes';
import { fmtUsd, platformShort } from '@/lib/whale/utils';
import { PlatformTag } from '@/components/whale/PlatformTag';

const VENUE_OPTIONS = [
  { id: 'all', label: 'All venues' },
  { id: 'polymarket', label: 'Polymarket' },
  { id: 'kalshi', label: 'Kalshi' },
];

const VOLUME_OPTIONS = [
  { id: 0, label: 'Any vol' },
  { id: 10_000, label: '> $10K' },
  { id: 100_000, label: '> $100K' },
  { id: 1_000_000, label: '> $1M' },
];

export function UnifiedSearchBar() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [venue, setVenue] = useState('all');
  const [minVolume, setMinVolume] = useState(0);
  const [category, setCategory] = useState('all');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const { data, isFetching, isError } = useUnifiedSearch(debounced, venue, minVolume, category, open || debounced.length >= 2);

  const results = data?.results ?? [];
  const showDropdown = debounced.length >= 2 && (isFetching || results.length > 0 || isError);

  return (
    <div className="unified-search-wrap">
      <div className="unified-search-bar surface">
        <Search className="w-4 h-4 opacity-40 shrink-0" aria-hidden />
        <input
          type="search"
          className="unified-search-input"
          placeholder="Search Polymarket & Kalshi markets…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          aria-label="Cross-venue market search"
          aria-expanded={showDropdown}
        />
        {isFetching && <span className="text-[10px] opacity-40 font-mono">…</span>}

        <div className="unified-search-filters">
          <select
            className="unified-filter-select"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            aria-label="Venue filter"
          >
            {VENUE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="unified-filter-select"
            value={minVolume}
            onChange={(e) => setMinVolume(Number(e.target.value))}
            aria-label="Minimum volume"
          >
            {VOLUME_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="unified-filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Category filter"
          >
            <option value="all">All sectors</option>
            {MARKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showDropdown && open && (
        <div className="unified-search-dropdown surface" role="listbox">
          {isError && <p className="text-xs p-3" style={{ color: 'var(--rose)' }}>Search failed. Try again.</p>}
          {!isError && !isFetching && results.length === 0 && (
            <p className="text-xs p-3 opacity-50">No markets match.</p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              className="unified-search-result w-full text-left"
              role="option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                setQ('');
                router.push(
                  marketDetailPath(r.title, r.venue, {
                    price: r.probability,
                    volume: r.volume_24h ?? r.volume,
                    event: r.event_title,
                  }),
                );
              }}
            >
              {r.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
              ) : (
                <PlatformTag platform={r.venue} />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[12px] leading-snug truncate">{r.title}</div>
                {r.event_title && (
                  <div className="text-[10px] opacity-50 truncate">{r.event_title}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono tabular-nums text-[11px]">{(r.probability * 100).toFixed(1)}%</div>
                <div className="font-mono tabular-nums text-[10px] opacity-50">{fmtUsd(r.volume)}</div>
              </div>
              <ExternalLink className="w-3 h-3 opacity-40 shrink-0" />
            </button>
          ))}
          {results.length > 0 && (
            <p className="text-[9px] opacity-40 px-3 py-2 border-t border-white/5">
              {platformShort('polymarket')} + {platformShort('kalshi')} · refreshes every 10s
            </p>
          )}
        </div>
      )}
    </div>
  );
}
