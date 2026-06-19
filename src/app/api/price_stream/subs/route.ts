import { NextRequest } from 'next/server';
import { getArbitragePairs } from '@/services/arbitrage.service';
import { kalshiTickerFromUrl, polySlugFromUrl, type PriceSubscription } from '@/services/websocket';
import { whaleError, whaleJson } from '@/lib/whale/api';

const GAMMA = process.env.POLY_GAMMA_URL ?? 'https://gamma-api.polymarket.com';

async function fetchPolyTokenId(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${GAMMA}/markets?slug=${encodeURIComponent(slug)}&limit=1`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const markets = (await res.json()) as { clobTokenIds?: string }[];
    const m = markets[0];
    if (!m?.clobTokenIds) return null;
    const ids = JSON.parse(m.clobTokenIds) as string[];
    return ids[0] ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10), 50);
  try {
    const { pairs } = await getArbitragePairs(0);
    const top = pairs.slice(0, limit);

    const subs: PriceSubscription[] = await Promise.all(
      top.map(async (p) => {
        const kalshiTicker = kalshiTickerFromUrl(p.kalshi_url);
        const polySlug = polySlugFromUrl(p.poly_url);
        const polyTokenId = polySlug ? await fetchPolyTokenId(polySlug) : null;
        return {
          contractId: p.id,
          polyTitle: p.poly_title,
          kalshiTitle: p.kalshi_title,
          kalshiTicker,
          polyTokenId,
          polySlug,
        };
      }),
    );

    return whaleJson({
      subs: subs.filter((s) => s.kalshiTicker || s.polyTokenId),
      count: subs.length,
    });
  } catch (e) {
    return whaleError(e);
  }
}
