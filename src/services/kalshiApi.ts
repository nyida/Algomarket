import { inferMarketCategory } from '@/lib/whale/categories';
import { kalshiExternalUrl } from '@/lib/whale/marketUrls';
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
};

function toMarket(m: KalshiMarket): UnifiedMarket {
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
    external_url: kalshiExternalUrl(m.ticker, m.title),
    status: m.status ?? 'active',
  };
}

export async function searchKalshiEvents(query: string, limit = 30): Promise<UnifiedMarket[]> {
  if (!query.trim()) return [];
  const data = await kalshiFetch<{ markets: KalshiMarket[] }>(
    `/markets?status=open&limit=${Math.min(limit, 100)}&mve_filter=exclude&query=${encodeURIComponent(query)}`,
  );
  return (data.markets ?? []).map(toMarket);
}
