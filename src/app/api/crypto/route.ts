import { aggregateCrypto } from '@/lib/api/aggregator';
import { cachedResponseAsync } from '@/lib/whale/responseCache';
import { whaleError, whaleJson } from '@/lib/whale/api';

export const dynamic = 'force-dynamic';

const CACHE_MS = 60_000;

export async function GET() {
  try {
    const data = await cachedResponseAsync('crypto:overview', CACHE_MS, aggregateCrypto);
    return whaleJson(data);
  } catch (e) {
    return whaleError(e);
  }
}
