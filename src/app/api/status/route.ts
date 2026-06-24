import { getScrapeStatus } from '@/lib/whale/status';
import { cachedResponse } from '@/lib/whale/responseCache';
import { whaleError, whaleJson } from '@/lib/whale/api';

const CACHE_MS = 30_000;

export async function GET() {
  try {
    return whaleJson(cachedResponse('status', CACHE_MS, getScrapeStatus));
  } catch (e) {
    return whaleError(e);
  }
}
