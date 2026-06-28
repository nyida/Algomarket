/**
 * Manifold Markets API client.
 * Play-money prediction markets. No auth required for reads. Rate limit: 1000/min.
 * @see https://docs.manifold.markets/api
 */

import { inferMarketCategory } from '@/lib/whale/categories';
import { apiFetch } from '../http';
import type { ApiMarket } from '../types/api.types';

const BASE = process.env.MANIFOLD_API_URL ?? 'https://api.manifold.markets';

type ManifoldMarket = {
  id: string;
  question: string;
  slug: string;
  url: string;
  probability: number;
  volume: number;
  volume24Hours: number;
  isResolved: boolean;
  closeTime?: number;
  creatorName?: string;
};

function toApiMarket(m: ManifoldMarket): ApiMarket {
  return {
    id: `manifold-${m.id}`,
    title: m.question,
    event_title: m.creatorName ?? null,
    platform: 'manifold',
    source: 'manifold',
    volume: m.volume,
    volume_24h: m.volume24Hours ?? null,
    probability: m.probability,
    category: inferMarketCategory(m.question),
    image: null,
    external_url: m.url,
    status: m.isResolved ? 'closed' : 'active',
  };
}

/** Search Manifold markets by keyword. */
export async function searchManifoldMarkets(term: string, limit = 30): Promise<ApiMarket[]> {
  const data = await apiFetch<ManifoldMarket[]>({
    source: 'manifold',
    baseUrl: BASE,
    path: `/v0/search-markets?term=${encodeURIComponent(term)}&limit=${limit}`,
    rateLimitPerMinute: 1000,
  });
  return (data ?? []).map(toApiMarket);
}

/** Fetch trending/open Manifold markets. */
export async function fetchManifoldMarkets(limit = 50): Promise<ApiMarket[]> {
  const data = await apiFetch<ManifoldMarket[]>({
    source: 'manifold',
    baseUrl: BASE,
    path: `/v0/markets?limit=${limit}&sort=volume24Hours`,
    rateLimitPerMinute: 1000,
  });
  return (data ?? []).filter((m) => !m.isResolved).map(toApiMarket);
}

/** Fetch a single market by ID or slug. */
export async function fetchManifoldMarket(idOrSlug: string): Promise<ApiMarket | null> {
  const data = await apiFetch<ManifoldMarket>({
    source: 'manifold',
    baseUrl: BASE,
    path: `/v0/market/${encodeURIComponent(idOrSlug)}`,
    rateLimitPerMinute: 1000,
  });
  return data ? toApiMarket(data) : null;
}
