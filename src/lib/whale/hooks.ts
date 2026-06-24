'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/whale/fetch';
import type { ArbitrageSpread, UnifiedMarket } from '@/services/types';

export const LIVE_REFETCH_MS = 15_000;
export const ARB_REFETCH_MS = 120_000;

type UnifiedSearchResponse = { results: UnifiedMarket[]; count: number };
type ArbitrageResponse = {
  pairs: ArbitrageSpread[];
  byPolyTitle: Record<string, ArbitrageSpread>;
  count: number;
};

type LiveWhaleResponse = {
  trades: {
    market_title: string;
    event_title: string | null;
    outcome: string;
    side: string;
    usd_value: number;
    timestamp: number;
    platform: string;
  }[];
  total: number;
};

export function useUnifiedSearch(
  q: string,
  venue: string,
  minVolume: number,
  category: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ['unified-search', q, venue, minVolume, category],
    queryFn: () => {
      const params = new URLSearchParams({
        q,
        venue,
        min_volume: String(minVolume),
        category,
        limit: '30',
      });
      return fetchJson<UnifiedSearchResponse>(`/api/unified/search?${params}`, undefined, 30_000);
    },
    enabled: enabled && q.trim().length >= 2,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useArbitrageMap(minSpread = 0) {
  return useQuery({
    queryKey: ['arbitrage', minSpread],
    queryFn: () => {
      const params = minSpread > 0 ? `?min_spread=${minSpread}` : '';
      return fetchJson<ArbitrageResponse>(`/api/arbitrage${params}`, undefined, 45_000);
    },
    refetchInterval: ARB_REFETCH_MS,
    staleTime: 90_000,
    retry: 2,
    retryDelay: 2000,
  });
}

export function useLiveWhales(minSize = 500, limit = 100) {
  return useQuery({
    queryKey: ['live-whales', minSize, limit],
    queryFn: () =>
      fetchJson<LiveWhaleResponse>(
        `/api/live_whales?min_size=${minSize}&limit=${limit}&platform=all`,
      ),
    refetchInterval: LIVE_REFETCH_MS,
    staleTime: 10_000,
  });
}

type KalshiFlowResponse = {
  flows: {
    market_title: string;
    event_title: string | null;
    net_flow_usd: number;
    yes_usd: number;
    no_usd: number;
    trade_count: number;
  }[];
  count: number;
};

export function useKalshiFlow(hours = 1) {
  return useQuery({
    queryKey: ['kalshi-flow', hours],
    queryFn: () => fetchJson<KalshiFlowResponse>(`/api/kalshi_flow?hours=${hours}&limit=1000`),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}
