/**
 * SimpleFunctions unified prediction market API.
 * Kalshi + Polymarket with scan, changes, and screener endpoints.
 * Public endpoints require no auth; optional API key for higher limits.
 * @see https://docs.simplefunctions.dev/
 */

import { inferMarketCategory } from '@/lib/whale/categories';
import { apiFetch } from '../http';
import type { ApiChangeEvent, ApiMarket } from '../types/api.types';

const BASE = process.env.SIMPLEFUNCTIONS_API_URL ?? 'https://simplefunctions.dev';

type ScanResult = {
  markets?: {
    ticker?: string;
    venue?: string;
    title?: string;
    price?: number;
    volume?: number;
    volume_24h?: number;
    status?: string;
    url?: string;
    change_1d?: number;
  }[];
  results?: ScanResult['markets'];
};

type ChangeRecord = {
  id?: string;
  type?: string;
  ticker?: string;
  venue?: string;
  title?: string;
  old_price?: number;
  new_price?: number;
  change_pct?: number;
  timestamp?: string;
  url?: string;
};

type ChangesResponse = {
  changes?: ChangeRecord[];
  events?: ChangeRecord[];
};

function apiKey(): string | undefined {
  return process.env.SIMPLEFUNCTIONS_API_KEY ?? process.env.SIMPLECLOCK_API_KEY;
}

function toApiMarket(m: NonNullable<ScanResult['markets']>[number]): ApiMarket {
  const venue = (m.venue ?? 'unknown').toLowerCase();
  const platform =
    venue.includes('poly') ? 'polymarket' : venue.includes('kalshi') ? 'kalshi' : 'unknown';
  const title = m.title ?? m.ticker ?? 'Unknown';
  return {
    id: `sf-${m.ticker ?? title}`,
    title,
    event_title: null,
    platform,
    source: 'simplefunctions',
    volume: m.volume ?? 0,
    volume_24h: m.volume_24h ?? null,
    probability: m.price ?? 0.5,
    category: inferMarketCategory(title),
    image: null,
    external_url: m.url ?? '#',
    status: m.status ?? 'active',
    change_1d: m.change_1d ?? null,
  };
}

function toChangeEvent(c: ChangeRecord): ApiChangeEvent {
  return {
    id: c.id ?? `${c.ticker}-${c.timestamp}`,
    type: c.type ?? 'price_move',
    title: c.title ?? c.ticker ?? 'Unknown',
    platform: c.venue ?? 'unknown',
    old_price: c.old_price ?? null,
    new_price: c.new_price ?? null,
    change_pct: c.change_pct ?? null,
    timestamp: c.timestamp ?? new Date().toISOString(),
    external_url: c.url ?? null,
  };
}

/** Scan markets by topic keyword across Kalshi + Polymarket. */
export async function scanSimpleFunctionsMarkets(q: string): Promise<ApiMarket[]> {
  const data = await apiFetch<ScanResult>({
    source: 'simplefunctions',
    baseUrl: BASE,
    path: `/api/public/scan?q=${encodeURIComponent(q)}`,
    rateLimitPerMinute: 60,
  });
  if (!data) return [];

  const markets = data.markets ?? data.results ?? [];
  return markets.map(toApiMarket);
}

/** Track cross-venue market changes. */
export async function fetchSimpleFunctionsChanges(since = '1h'): Promise<ApiChangeEvent[]> {
  const data = await apiFetch<ChangesResponse>({
    source: 'simplefunctions',
    baseUrl: BASE,
    path: `/api/changes?since=${encodeURIComponent(since)}`,
    rateLimitPerMinute: 60,
  });
  if (!data) return [];

  const records = data.changes ?? data.events ?? [];
  return records.map(toChangeEvent);
}

/** Fetch paginated market universe. */
export async function fetchSimpleFunctionsMarkets(limit = 50): Promise<ApiMarket[]> {
  const data = await apiFetch<{ markets?: ScanResult['markets'] }>({
    source: 'simplefunctions',
    baseUrl: BASE,
    path: `/api/public/markets?limit=${limit}`,
    rateLimitPerMinute: 60,
  });
  return (data?.markets ?? []).map(toApiMarket);
}

/** Whether an optional API key is configured. */
export function isSimpleFunctionsKeyConfigured(): boolean {
  return Boolean(apiKey());
}
