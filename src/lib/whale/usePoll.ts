'use client';

import { useEffect } from 'react';

export function usePoll(callback: () => void | Promise<void>, intervalMs: number, enabled = true) {
  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    const id = setInterval(() => {
      void callback();
    }, intervalMs);
    return () => clearInterval(id);
  }, [callback, intervalMs, enabled]);
}
