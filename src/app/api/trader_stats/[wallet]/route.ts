import { NextRequest } from 'next/server';
import { getTraderStats } from '@/lib/whale/queries';
import { whaleError, whaleJson } from '@/lib/whale/api';

export async function GET(_req: NextRequest, { params }: { params: { wallet: string } }) {
  try {
    const stats = getTraderStats(params.wallet);
    if (!stats) return whaleJson({ error: 'Trader not found' }, 404);
    return whaleJson(stats);
  } catch (e) {
    return whaleError(e);
  }
}
