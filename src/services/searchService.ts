import { searchKalshiEvents } from './kalshiApi';
import { searchPolymarketEvents } from './polymarketApi';
import type { UnifiedMarket, UnifiedSearchParams } from './types';

export type SearchResult = UnifiedMarket;

export async function searchAllVenues(params: UnifiedSearchParams): Promise<SearchResult[]> {
  const q = params.q.trim();
  const limit = params.limit ?? 40;
  const minVol = params.min_volume ?? 0;
  const venue = params.venue ?? 'all';
  const category = params.category ?? 'all';

  if (!q) return [];

  const [poly, kalshi] = await Promise.all([
    venue === 'kalshi' ? [] : searchPolymarketEvents(q, limit),
    venue === 'polymarket' ? [] : searchKalshiEvents(q, limit),
  ]);

  let rows = [...poly, ...kalshi];

  rows = rows.filter((r) => {
    if (minVol > 0 && (r.volume_24h ?? r.volume) < minVol) return false;
    if (category !== 'all' && r.category !== category) return false;
    return r.status === 'active' || r.status === 'open';
  });

  rows.sort((a, b) => (b.volume_24h ?? b.volume) - (a.volume_24h ?? a.volume));
  return rows.slice(0, limit);
}
