import { NextRequest } from 'next/server';
import { getLiveWhaleCount, getLiveWhales } from '@/lib/whale/queries';
import { whaleError, whaleJson } from '@/lib/whale/api';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const minSize = parseFloat(sp.get('min_size') ?? '500');
  const platform = sp.get('platform') ?? 'all';
  const category = sp.get('category') ?? 'all';
  const limit = parseInt(sp.get('limit') ?? '500', 10);
  try {
    const trades = getLiveWhales(minSize, platform, limit, category);
    const total = getLiveWhaleCount(minSize, platform, category);
    return whaleJson({ trades, total });
  } catch (e) {
    return whaleError(e);
  }
}
