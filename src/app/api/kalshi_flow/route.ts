import { NextRequest } from 'next/server';
import { getKalshiNetFlow } from '@/lib/whale/queries';
import { whaleError, whaleJson } from '@/lib/whale/api';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const hours = parseFloat(sp.get('hours') ?? '1');
  const minSize = parseFloat(sp.get('min_size') ?? '0');
  const limit = parseInt(sp.get('limit') ?? '1000', 10);
  try {
    const flows = getKalshiNetFlow(hours, minSize, limit);
    return whaleJson({ flows, count: flows.length });
  } catch (e) {
    return whaleError(e);
  }
}
