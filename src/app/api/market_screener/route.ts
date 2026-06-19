import { NextRequest } from 'next/server';
import { getScreenerData } from '@/lib/whale/screener';
import { whaleError, whaleJson } from '@/lib/whale/api';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    const probBucket = sp.get('prob') ?? 'all';
    let prob_min = 0;
    let prob_max = 100;
    if (probBucket !== 'all') {
      const [a, b] = probBucket.split('-').map(Number);
      prob_min = a;
      prob_max = b;
    } else {
      prob_min = parseFloat(sp.get('prob_min') ?? '0');
      prob_max = parseFloat(sp.get('prob_max') ?? '100');
    }

    const daysRaw = sp.get('days');
    let days_max: number | null = null;
    if (daysRaw === '0') days_max = 0;
    else if (daysRaw === '9999') days_max = 9999;
    else if (daysRaw) days_max = parseInt(daysRaw, 10);

    const data = await getScreenerData({
      platform: (sp.get('platform') ?? 'all') as 'all' | 'polymarket' | 'kalshi',
      prob_min,
      prob_max,
      volume_min: parseFloat(sp.get('volume_min') ?? '0'),
      days_max,
      search: sp.get('search') ?? '',
      matched_only: sp.get('matched_only') === '1' || sp.get('matched_only') === 'true',
      limit: Math.min(parseInt(sp.get('limit') ?? '50', 10), 100),
      offset: parseInt(sp.get('offset') ?? '0', 10),
    });

    return whaleJson(data);
  } catch (e) {
    return whaleError(e);
  }
}
