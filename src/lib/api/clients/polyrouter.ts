/**
 * PolyRouter unified prediction market API.
 * Aggregates Polymarket, Kalshi, Manifold, Limitless, ProphetX, Novig, SX.bet.
 * Requires free API key (open beta, 100 req/min).
 * @see https://docs.polyrouter.io/
 */

import { inferMarketCategory } from '@/lib/whale/categories';
import { apiFetch } from '../http';
import type { ApiMarket, PredictionPlatform } from '../types/api.types';

const BASE = process.env.POLYROUTER_API_URL ?? 'https://api-v2.polyrouter.io';

type PolyRouterMarket = {
  id?: string;
  platform?: string;
  title?: string;
  event_title?: string;
  volume?: number;
  volume_24h?: number;
  current_prices?: { yes?: { price?: number }; no?: { price?: number } };
  status?: string;
  url?: string;
  image?: string;
};

type PolyRouterMarketsResponse = {
  markets?: PolyRouterMarket[];
  pagination?: { next_cursor?: string };
};

const PLATFORM_MAP: Record<string, PredictionPlatform> = {
  polymarket: 'polymarket',
  kalshi: 'kalshi',
  manifold: 'manifold',
  limitless: 'limitless',
  prophetx: 'prophetx',
  novig: 'novig',
  'sx.bet': 'sxbet',
  sxbet: 'sxbet',
};

function toApiMarket(m: PolyRouterMarket): ApiMarket {
  const platform = PLATFORM_MAP[(m.platform ?? '').toLowerCase()] ?? 'unknown';
  const title = m.title ?? 'Unknown';
  const yesPrice = m.current_prices?.yes?.price ?? 0.5;
  return {
    id: `pr-${m.platform}-${m.id ?? title}`,
    title,
    event_title: m.event_title ?? null,
    platform,
    source: 'polyrouter',
    volume: m.volume ?? 0,
    volume_24h: m.volume_24h ?? null,
    probability: yesPrice,
    category: inferMarketCategory(title),
    image: m.image ?? null,
    external_url: m.url ?? '#',
    status: m.status ?? 'active',
  };
}

function apiKey(): string | undefined {
  return process.env.POLYROUTER_API_KEY;
}

/** List markets from PolyRouter, optionally filtered by platform. */
export async function fetchPolyRouterMarkets(opts?: {
  platform?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ markets: ApiMarket[]; nextCursor?: string }> {
  const key = apiKey();
  if (!key) return { markets: [] };

  const params = new URLSearchParams();
  if (opts?.platform) params.set('platform', opts.platform);
  params.set('limit', String(opts?.limit ?? 50));
  if (opts?.cursor) params.set('cursor', opts.cursor);

  const data = await apiFetch<PolyRouterMarketsResponse>({
    source: 'polyrouter',
    baseUrl: BASE,
    path: `/markets?${params}`,
    apiKey: key,
    rateLimitPerMinute: 100,
  });
  if (!data) return { markets: [] };

  return {
    markets: (data.markets ?? []).map(toApiMarket),
    nextCursor: data.pagination?.next_cursor,
  };
}

/** Fetch markets across all supported platforms via PolyRouter. */
export async function fetchPolyRouterAllPlatforms(limitPerPlatform = 25): Promise<ApiMarket[]> {
  const platforms = ['polymarket', 'kalshi', 'manifold', 'limitless'];
  const results = await Promise.all(
    platforms.map((p) => fetchPolyRouterMarkets({ platform: p, limit: limitPerPlatform })),
  );
  return results.flatMap((r) => r.markets);
}

/** Fetch price history for a market (OHLC candlesticks). */
export async function fetchPolyRouterPriceHistory(marketId: string, platform: string): Promise<unknown | null> {
  const key = apiKey();
  if (!key) return null;

  return apiFetch({
    source: 'polyrouter',
    baseUrl: BASE,
    path: `/price-history?market_id=${encodeURIComponent(marketId)}&platform=${encodeURIComponent(platform)}`,
    apiKey: key,
    rateLimitPerMinute: 100,
  });
}

/** List available platforms and health status. */
export async function fetchPolyRouterPlatforms(): Promise<unknown | null> {
  const key = apiKey();
  if (!key) return null;

  return apiFetch({
    source: 'polyrouter',
    baseUrl: BASE,
    path: '/platforms',
    apiKey: key,
    rateLimitPerMinute: 100,
  });
}

/** Whether PolyRouter is configured (API key present). */
export function isPolyRouterConfigured(): boolean {
  return Boolean(apiKey());
}
