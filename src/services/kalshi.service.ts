import { inferMarketCategory } from '@/lib/whale/categories';
import type { UnifiedMarket } from './types';

const KALSHI = process.env.KALSHI_API_URL ?? 'https://api.elections.kalshi.com/trade-api/v2';

async function kalshiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${KALSHI}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Kalshi API ${res.status}`);
  return res.json() as Promise<T>;
}

type KalshiMarket = {
  ticker?: string;
  title?: string;
  yes_sub_title?: string;
  subtitle?: string;
  last_price_dollars?: string;
  volume_fp?: string;
  volume_24h_fp?: string;
  status?: string;
  close_time?: string;
};

function toUnified(m: KalshiMarket): UnifiedMarket {
  const title = m.title ?? m.ticker ?? 'Unknown';
  const eventTitle = m.yes_sub_title ?? m.subtitle ?? null;
  return {
    id: `kalshi-${m.ticker ?? title}`,
    title,
    event_title: eventTitle !== title ? eventTitle : null,
    venue: 'kalshi',
    volume: parseFloat(m.volume_fp ?? '0') || 0,
    volume_24h: parseFloat(m.volume_24h_fp ?? '0') || null,
    probability: parseFloat(m.last_price_dollars ?? '0') || 0,
    category: inferMarketCategory(`${title} ${eventTitle ?? ''}`),
    image: null,
    external_url: m.ticker ? `https://kalshi.com/markets/${m.ticker}` : 'https://kalshi.com',
    status: m.status ?? 'active',
  };
}

export async function searchKalshi(q: string, limit = 30): Promise<UnifiedMarket[]> {
  if (!q.trim()) return [];
  const data = await kalshiFetch<{ markets: KalshiMarket[] }>(
    `/markets?status=open&limit=${Math.min(limit, 100)}&mve_filter=exclude&query=${encodeURIComponent(q)}`,
  );
  return (data.markets ?? []).map(toUnified);
}

export async function fetchTopKalshi(maxPages = 4): Promise<UnifiedMarket[]> {
  const all: KalshiMarket[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const params = new URLSearchParams({ status: 'open', limit: '1000', mve_filter: 'exclude' });
    if (cursor) params.set('cursor', cursor);
    const data = await kalshiFetch<{ markets: KalshiMarket[]; cursor?: string }>(
      `/markets?${params}`,
    );
    all.push(...(data.markets ?? []));
    cursor = data.cursor;
    if (!cursor || (data.markets?.length ?? 0) < 1000) break;
  }
  return all
    .map(toUnified)
    .filter((m) => m.volume > 0 || m.probability > 0)
    .sort((a, b) => b.volume - a.volume);
}
