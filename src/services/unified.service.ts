import { searchKalshi, fetchTopKalshi } from './kalshi.service';
import { searchPolymarket, fetchTopPolymarket } from './polymarket.service';
import type { UnifiedMarket, UnifiedSearchParams } from './types';

export async function unifiedSearch(params: UnifiedSearchParams): Promise<UnifiedMarket[]> {
  const q = params.q.trim();
  const limit = params.limit ?? 40;
  const minVol = params.min_volume ?? 0;
  const venue = params.venue ?? 'all';
  const category = params.category ?? 'all';

  let rows: UnifiedMarket[] = [];

  if (q) {
    const [poly, kalshi] = await Promise.all([
      venue === 'kalshi' ? [] : searchPolymarket(q, limit),
      venue === 'polymarket' ? [] : searchKalshi(q, limit),
    ]);
    rows = [...poly, ...kalshi];
  } else {
    const [poly, kalshi] = await Promise.all([
      venue === 'kalshi' ? [] : fetchTopPolymarket(Math.min(limit, 100)),
      venue === 'polymarket' ? [] : fetchTopKalshi(2).then((m) => m.slice(0, limit)),
    ]);
    rows = [...poly, ...kalshi];
  }

  rows = rows.filter((r) => {
    if (minVol > 0 && r.volume < minVol) return false;
    if (category !== 'all' && r.category !== category) return false;
    return r.status === 'active' || r.status === 'open';
  });

  rows.sort((a, b) => (b.volume_24h ?? b.volume) - (a.volume_24h ?? a.volume));
  return rows.slice(0, limit);
}
