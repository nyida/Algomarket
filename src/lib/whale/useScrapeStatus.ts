'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ScrapeStatus } from './status';
import { fetchJson } from './fetch';
import { usePoll } from './usePoll';

export function useScrapeStatus(pollMs = 15000) {
  const [status, setStatus] = useState<ScrapeStatus | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchJson<ScrapeStatus>('/api/status');
      setStatus(data);
      setLastFetch(Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status unavailable');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  usePoll(refresh, pollMs);

  return { status, lastFetch, error, refresh };
}
