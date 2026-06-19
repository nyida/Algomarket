import { fetchTopKalshi } from './kalshi.service';
import { fetchTopPolymarket } from './polymarket.service';
import { normalizeTitle, titleSimilarity } from './arbitrage.utils';
import { getLastSeen, recordSpreadSnapshots } from './cacheService';
import { calculateNetROI } from '@/utils/arbMath';
import type { ArbitrageSpread } from './types';

const ARB_CACHE_MS = 120_000;
let cache: { at: number; pairs: ArbitrageSpread[]; byPolyTitle: Map<string, ArbitrageSpread> } | null =
  null;

function buildSpread(
  polyTitle: string,
  kalshiTitle: string,
  polyPrice: number,
  kalshiPrice: number,
  polyUrl: string,
  kalshiUrl: string,
): ArbitrageSpread {
  const spread = polyPrice - kalshiPrice;
  const spreadCents = spread * 100;
  const roi = calculateNetROI(kalshiPrice, polyPrice);
  const id = `${normalizeTitle(polyTitle)}::${normalizeTitle(kalshiTitle)}`;
  const seen = getLastSeen(id);
  const now = Date.now();

  return {
    id,
    title: polyTitle,
    poly_title: polyTitle,
    kalshi_title: kalshiTitle,
    poly_price: polyPrice,
    kalshi_price: kalshiPrice,
    spread,
    spread_cents: spreadCents,
    net_profit_cents: roi.netCents,
    net_profit_pct: roi.roiPercent,
    roi,
    direction: roi.direction,
    poly_url: polyUrl,
    kalshi_url: kalshiUrl,
    first_seen_at: seen?.first_seen_at ?? now,
    last_seen_at: seen?.last_seen_at ?? now,
  };
}

export async function getArbitragePairs(minSpread = 0, sortByNet = false): Promise<{
  pairs: ArbitrageSpread[];
  byPolyTitle: Record<string, ArbitrageSpread>;
  cached_at: number;
}> {
  if (cache && Date.now() - cache.at < ARB_CACHE_MS) {
    let pairs =
      minSpread > 0
        ? cache.pairs.filter((p) => Math.abs(p.spread) >= minSpread)
        : cache.pairs;
    if (sortByNet) {
      pairs = [...pairs].sort((a, b) => b.net_profit_cents - a.net_profit_cents);
    }
    const byPolyTitle: Record<string, ArbitrageSpread> = {};
    for (const p of pairs) byPolyTitle[p.poly_title] = p;
    return { pairs, byPolyTitle, cached_at: cache.at };
  }

  const [polyMarkets, kalshiMarkets] = await Promise.all([
    fetchTopPolymarket(200),
    fetchTopKalshi(3),
  ]);

  const pairs: ArbitrageSpread[] = [];
  const byPolyTitleMap = new Map<string, ArbitrageSpread>();

  for (const poly of polyMarkets) {
    let bestSim = 0;
    let bestKalshi: (typeof kalshiMarkets)[0] | null = null;
    for (const kal of kalshiMarkets) {
      const sim = titleSimilarity(poly.title, kal.title);
      if (sim > bestSim) {
        bestSim = sim;
        bestKalshi = kal;
      }
      if (poly.event_title) {
        const sim2 = titleSimilarity(poly.event_title, kal.title);
        if (sim2 > bestSim) {
          bestSim = sim2;
          bestKalshi = kal;
        }
      }
    }
    if (!bestKalshi || bestSim < 0.35) continue;
    if (poly.probability <= 0 && bestKalshi.probability <= 0) continue;

    const spread = buildSpread(
      poly.title,
      bestKalshi.title,
      poly.probability,
      bestKalshi.probability,
      poly.external_url,
      bestKalshi.external_url,
    );
    if (Math.abs(spread.spread) >= minSpread) {
      pairs.push(spread);
      byPolyTitleMap.set(poly.title, spread);
    }
  }

  pairs.sort((a, b) => b.net_profit_cents - a.net_profit_cents);
  recordSpreadSnapshots(pairs);
  for (const p of pairs) {
    const seen = getLastSeen(p.id);
    if (seen) {
      p.first_seen_at = seen.first_seen_at;
      p.last_seen_at = seen.last_seen_at;
    }
  }
  const at = Date.now();
  cache = { at, pairs, byPolyTitle: byPolyTitleMap };

  let result = minSpread > 0 ? pairs.filter((p) => Math.abs(p.spread) >= minSpread) : pairs;
  if (sortByNet) {
    result = [...result].sort((a, b) => b.net_profit_cents - a.net_profit_cents);
  }

  const byPolyTitle: Record<string, ArbitrageSpread> = {};
  for (const [k, v] of byPolyTitleMap) byPolyTitle[k] = v;
  return { pairs: result, byPolyTitle, cached_at: at };
}
