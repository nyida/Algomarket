export type ScreenerRow = {
  platform: 'polymarket' | 'kalshi';
  market_title: string;
  event_title: string | null;
  probability: number;
  price_open: number | null;
  price_high: number | null;
  price_low: number | null;
  change_1d: number | null;
  volume: number;
  volume_24h: number | null;
  days_to_resolution: number | null;
  status: string;
  external_url: string;
};

export type ScreenerFacets = {
  total: number;
  polymarket: number;
  kalshi: number;
};

export type ScreenerFilters = {
  platform: 'all' | 'polymarket' | 'kalshi';
  prob_min: number;
  prob_max: number;
  volume_min: number;
  days_max: number | null;
  search: string;
  matched_only: boolean;
  limit: number;
  offset: number;
};

type Cache = {
  at: number;
  polymarket: ScreenerRow[];
  kalshi: ScreenerRow[];
};

const CACHE_MS = 90_000;
let cache: Cache | null = null;

function parseNum(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86_400_000);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

async function fetchPolymarket(): Promise<ScreenerRow[]> {
  const rows: ScreenerRow[] = [];
  for (let offset = 0; offset < 2000; offset += 100) {
    const url = `https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100&offset=${offset}&order=volume24hr&ascending=false`;
    const markets = await fetchJson<
      {
        question?: string;
        slug?: string;
        outcomePrices?: string;
        volume?: string;
        volume24hr?: number;
        endDate?: string;
        active?: boolean;
        closed?: boolean;
        oneDayPriceChange?: number;
        events?: { title?: string; slug?: string; series?: { title?: string }[] }[];
        groupItemTitle?: string;
      }[]
    >(url);
    for (const m of markets) {
      let prob = 0.5;
      try {
        const prices = JSON.parse(m.outcomePrices ?? '["0.5"]') as string[];
        prob = parseFloat(prices[0]) || 0.5;
      } catch {
        /* default */
      }
      const change = m.oneDayPriceChange ?? null;
      const open = change != null ? prob - change : null;
      const eventTitle =
        m.groupItemTitle ??
        m.events?.[0]?.series?.[0]?.title ??
        (m.events?.[0]?.title !== m.question ? m.events?.[0]?.title : null) ??
        null;
      const vol = parseNum(m.volume);
      const vol24 = m.volume24hr ?? null;
      rows.push({
        platform: 'polymarket',
        market_title: m.question ?? 'Unknown',
        event_title: eventTitle,
        probability: prob,
        price_open: open,
        price_high: change != null ? Math.max(prob, open ?? prob) : null,
        price_low: change != null ? Math.min(prob, open ?? prob) : null,
        change_1d: change,
        volume: vol,
        volume_24h: vol24,
        days_to_resolution: daysUntil(m.endDate),
        status: m.closed ? 'closed' : m.active ? 'active' : 'unknown',
        external_url: polymarketExternalUrl(m),
      });
    }
    if (markets.length < 100) break;
  }
  return rows;
}

type KalshiMarket = {
  ticker?: string;
  title?: string;
  yes_sub_title?: string;
  subtitle?: string;
  last_price_dollars?: string;
  previous_price_dollars?: string;
  volume_fp?: string;
  volume_24h_fp?: string;
  close_time?: string;
  latest_expiration_time?: string;
  status?: string;
  event_ticker?: string;
};

async function fetchKalshi(): Promise<ScreenerRow[]> {
  const all: KalshiMarket[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 6; page++) {
    const params = new URLSearchParams({
      status: 'open',
      limit: '1000',
      mve_filter: 'exclude',
    });
    if (cursor) params.set('cursor', cursor);
    const data = await fetchJson<{ markets: KalshiMarket[]; cursor?: string }>(
      `https://api.elections.kalshi.com/trade-api/v2/markets?${params}`,
    );
    all.push(...(data.markets ?? []));
    cursor = data.cursor;
    if (!cursor || (data.markets?.length ?? 0) < 1000) break;
  }

  const rows: ScreenerRow[] = [];
  for (const m of all) {
    const last = parseNum(m.last_price_dollars);
    const prev = parseNum(m.previous_price_dollars);
    const vol = parseNum(m.volume_fp);
    if (vol < 100 && last <= 0) continue;

    const eventTitle = m.yes_sub_title ?? m.subtitle ?? null;
    const change = prev > 0 || last > 0 ? last - prev : null;
    rows.push({
      platform: 'kalshi',
      market_title: m.title ?? m.ticker ?? 'Unknown',
      event_title: eventTitle && eventTitle !== m.title ? eventTitle : null,
      probability: last,
      price_open: prev > 0 ? prev : null,
      price_high: change != null ? Math.max(last, prev) : null,
      price_low: change != null ? Math.min(last, prev) : null,
      change_1d: change,
      volume: vol,
      volume_24h: parseNum(m.volume_24h_fp) || null,
      days_to_resolution: daysUntil(m.close_time ?? m.latest_expiration_time),
      status: m.status ?? 'active',
      external_url: kalshiExternalUrl(m.ticker, m.title),
    });
  }

  return rows.sort((a, b) => b.volume - a.volume);
}

async function loadCatalog(): Promise<Cache> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  const [polymarket, kalshi] = await Promise.all([
    fetchPolymarket().catch(() => [] as ScreenerRow[]),
    fetchKalshi().catch(() => [] as ScreenerRow[]),
  ]);
  cache = { at: Date.now(), polymarket, kalshi };
  return cache;
}

export function filterScreener(rows: ScreenerRow[], f: ScreenerFilters): ScreenerRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.platform !== 'all' && r.platform !== f.platform) return false;
    const pct = r.probability * 100;
    if (pct < f.prob_min || pct > f.prob_max) return false;
    if (f.volume_min > 0 && r.volume < f.volume_min) return false;
    if (f.days_max != null && f.days_max < 9999) {
      if (f.days_max === 0) {
        if (r.days_to_resolution !== 0) return false;
      } else if (r.days_to_resolution == null || r.days_to_resolution > f.days_max) {
        return false;
      }
    }
    if (f.days_max === 9999) {
      if (r.days_to_resolution == null || r.days_to_resolution <= 90) return false;
    }
    if (q) {
      const hay = `${r.market_title} ${r.event_title ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return r.status === 'active' || r.status === 'open' || r.status === 'initialized';
  });
}

import { getArbitragePairs } from '@/services/arbitrage.service';
import { titleSimilarity } from '@/services/arbitrage.utils';
import { kalshiExternalUrl, polymarketExternalUrl } from '@/lib/whale/marketUrls';

function filterMatchedRows(rows: ScreenerRow[], matchedTitles: { poly: string; kalshi: string }[]): ScreenerRow[] {
  if (!matchedTitles.length) return [];
  return rows.filter((r) => {
    for (const m of matchedTitles) {
      if (r.platform === 'polymarket' && titleSimilarity(r.market_title, m.poly) >= 0.35) return true;
      if (r.platform === 'kalshi' && titleSimilarity(r.market_title, m.kalshi) >= 0.35) return true;
    }
    return false;
  });
}

export async function getScreenerData(filters: ScreenerFilters) {
  const catalog = await loadCatalog();
  let combined = [...catalog.polymarket, ...catalog.kalshi];

  if (filters.matched_only) {
    const { pairs } = await getArbitragePairs(0);
    const matchedTitles = pairs.map((p) => ({ poly: p.poly_title, kalshi: p.kalshi_title }));
    combined = filterMatchedRows(combined, matchedTitles);
  }

  const filtered = filterScreener(combined, filters);
  filtered.sort((a, b) => (b.volume_24h ?? b.volume) - (a.volume_24h ?? a.volume));

  const facets: ScreenerFacets = {
    total: combined.length,
    polymarket: catalog.polymarket.length,
    kalshi: catalog.kalshi.length,
  };

  return {
    rows: filtered.slice(filters.offset, filters.offset + filters.limit),
    total: filtered.length,
    facets,
    cached_at: catalog.at,
  };
}
