/**
 * Metaculus API client.
 * Academic forecasting platform. No auth required for public question data.
 * @see https://www.metaculus.com/api/
 */

import { inferMarketCategory } from '@/lib/whale/categories';
import { apiFetch } from '../http';
import type { ApiMarket } from '../types/api.types';

const BASE = process.env.METACULUS_API_URL ?? 'https://www.metaculus.com/api2';

type MetaculusQuestion = {
  id: number;
  title: string;
  slug?: string;
  url?: string;
  community_prediction?: { full?: { q2?: number } };
  activity?: number;
  number_of_predictions?: number;
  status?: string;
  categories?: { name?: string }[];
};

type MetaculusResponse = {
  results?: MetaculusQuestion[];
  count?: number;
};

function toApiMarket(q: MetaculusQuestion): ApiMarket {
  const prob = q.community_prediction?.full?.q2 ?? 0.5;
  const slug = q.slug ?? String(q.id);
  return {
    id: `metaculus-${q.id}`,
    title: q.title,
    event_title: q.categories?.[0]?.name ?? null,
    platform: 'metaculus',
    source: 'metaculus',
    volume: q.activity ?? q.number_of_predictions ?? 0,
    volume_24h: null,
    probability: prob,
    category: q.categories?.[0]?.name ?? inferMarketCategory(q.title),
    image: null,
    external_url: q.url ?? `https://www.metaculus.com/questions/${slug}/`,
    status: q.status ?? 'active',
  };
}

/** Search Metaculus questions by keyword. */
export async function searchMetaculusQuestions(q: string, limit = 30): Promise<ApiMarket[]> {
  const data = await apiFetch<MetaculusResponse>({
    source: 'metaculus',
    baseUrl: BASE,
    path: `/questions/?search=${encodeURIComponent(q)}&limit=${limit}&status=open`,
    rateLimitPerMinute: 60,
  });
  return (data?.results ?? []).map(toApiMarket);
}

/** Fetch open Metaculus questions ordered by activity. */
export async function fetchMetaculusQuestions(limit = 50): Promise<ApiMarket[]> {
  const data = await apiFetch<MetaculusResponse>({
    source: 'metaculus',
    baseUrl: BASE,
    path: `/questions/?limit=${limit}&status=open&order_by=-activity`,
    rateLimitPerMinute: 60,
  });
  return (data?.results ?? []).map(toApiMarket);
}

/** Fetch a single question by ID. */
export async function fetchMetaculusQuestion(id: number): Promise<ApiMarket | null> {
  const data = await apiFetch<MetaculusQuestion>({
    source: 'metaculus',
    baseUrl: BASE,
    path: `/questions/${id}/`,
    rateLimitPerMinute: 60,
  });
  return data ? toApiMarket(data) : null;
}
