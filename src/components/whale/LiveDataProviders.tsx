'use client';

import { usePathname } from 'next/navigation';
import { SpreadHistoryRecorder } from '@/components/whale/SpreadHistoryRecorder';
import { PriceStreamProvider } from '@/hooks/useWebSocket';

/** Arb/WS infra only on pages that need live spread data — not every route. */
function needsLiveData(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/arbs') ||
    pathname.startsWith('/screener') ||
    pathname.startsWith('/market')
  );
}

export function LiveDataProviders() {
  const pathname = usePathname() ?? '';
  if (!needsLiveData(pathname)) return null;
  return (
    <>
      <SpreadHistoryRecorder />
      <PriceStreamProvider />
    </>
  );
}
