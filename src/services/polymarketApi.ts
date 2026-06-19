import { inferMarketCategory } from '@/lib/whale/categories';
import type { UnifiedMarket } from './types';

const GAMMA = process.env.POLY_GAMMA_URL ?? 'https://gamma-api.polymarket.com';

async function gammaFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${GAMMA}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Polymarket API ${res.status}`);
  return res.json() as Promise<T>;
}

type GammaMarket = {
  id?: string;
  question?: string;
  slug?: string;
  outcomePrices?: string;
  volume?: string;
  volume24hr?: number;
  image?: string;
  active?: boolean;
  closed?: boolean;
  events?: { title?: string; image?: string; slug?: string }[];
  groupItemTitle?: string;
};

function parseProb(outcomePrices?: string): number {
  try {
    const arr = JSON.parse(outcomePrices ?? '["0.5"]') as string[];
    return parseFloat(arr[0]) || 0.5;
  } catch {
    return 0.5;
  }
}

function toMarket(m: GammaMarket, eventTitle?: string | null): UnifiedMarket {
  const title = m.question ?? 'Unknown';
  return {
    id: `poly-${m.id ?? m.slug ?? title}`,
    title,
    event_title: eventTitle ?? m.groupItemTitle ?? null,
    venue: 'polymarket',
    volume: parseFloat(m.volume ?? '0') || 0,
    volume_24h: m.volume24hr ?? null,
    probability: parseProb(m.outcomePrices),
    category: inferMarketCategory(title),
    image: m.image ?? m.events?.[0]?.image ?? null,
    external_url: m.slug ? `https://polymarket.com/event/${m.slug}` : 'https://polymarket.com',
    status: m.closed ? 'closed' : m.active ? 'active' : 'unknown',
  };
}

export async function searchPolymarketEvents(query: string, limit = 30): Promise<UnifiedMarket[]> {
  if (!query.trim()) return [];
  const data = await gammaFetch<{
    events?: {
      id?: string;
      title?: string;
      slug?: string;
      image?: string;
      markets?: GammaMarket[];
    }[];
  }>(`/public-search?q=${encodeURIComponent(query)}&limit=${limit}`);

  const rows: UnifiedMarket[] = [];
  for (const ev of data.events ?? []) {
    for (const m of ev.markets ?? []) {
      rows.push(toMarket({ ...m, slug: m.slug ?? ev.slug, image: m.image ?? ev.image }, ev.title));
    }
    if (!ev.markets?.length && ev.title) {
      rows.push({
        id: `poly-ev-${ev.id ?? ev.slug}`,
        title: ev.title,
        event_title: null,
        venue: 'polymarket',
        volume: 0,
        volume_24h: null,
        probability: 0.5,
        category: inferMarketCategory(ev.title),
        image: ev.image ?? null,
        external_url: ev.slug ? `https://polymarket.com/event/${ev.slug}` : 'https://polymarket.com',
        status: 'active',
      });
    }
  }
  return rows;
}
