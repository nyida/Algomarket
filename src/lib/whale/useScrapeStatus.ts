'use client';

import { useQuery } from '@tanstack/react-query';
import type { ScrapeStatus } from './status';
import { fetchJson } from './fetch';

const DEFAULT_POLL_MS = 30_000;

/** Single shared status query — dedupes Nav + DataFeedBar + page pollers. */
export function useScrapeStatus(pollMs = DEFAULT_POLL_MS) {
  const q = useQuery({
    queryKey: ['status'],
    queryFn: () => fetchJson<ScrapeStatus>('/api/status'),
    refetchInterval: pollMs,
    staleTime: Math.max(pollMs - 5_000, 10_000),
  });

  return {
    status: q.data ?? null,
    lastFetch: q.dataUpdatedAt > 0 ? q.dataUpdatedAt : null,
    error: q.error ? (q.error instanceof Error ? q.error.message : 'Status unavailable') : null,
    refresh: q.refetch,
  };
}
