'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/whale/fetch';
import type { CryptoTicker, ApiChangeEvent, DataSourceStatus } from '@/lib/api/types/api.types';

type CryptoResponse = {
  tickers: CryptoTicker[];
  sources: Record<string, { count: number; ok: boolean }>;
  cached_at: number;
};

type ChangesResponse = {
  changes: ApiChangeEvent[];
  sources: Record<string, { count: number; ok: boolean }>;
  cached_at: number;
};

type DataSourcesResponse = {
  sources: DataSourceStatus[];
  macro_available: boolean;
  goldrush_available: boolean;
  cached_at: number;
};

export function useCryptoOverview() {
  return useQuery({
    queryKey: ['crypto-overview'],
    queryFn: () => fetchJson<CryptoResponse>('/api/crypto'),
    refetchInterval: 60_000,
    staleTime: 45_000,
    retry: 1,
  });
}

export function useMarketChanges(since = '1h') {
  return useQuery({
    queryKey: ['market-changes', since],
    queryFn: () => fetchJson<ChangesResponse>(`/api/market_changes?since=${encodeURIComponent(since)}`),
    refetchInterval: 60_000,
    staleTime: 45_000,
    retry: 1,
  });
}

export function useDataSources() {
  return useQuery({
    queryKey: ['data-sources'],
    queryFn: () => fetchJson<DataSourcesResponse>('/api/data_sources'),
    staleTime: 120_000,
    retry: 1,
  });
}
