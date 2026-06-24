'use client';

import { Suspense } from 'react';
import { MarketDetailFallback, MarketDetailView } from '@/components/whale/MarketDetailView';

export default function MarketViewPage() {
  return (
    <Suspense fallback={<MarketDetailFallback />}>
      <MarketDetailView />
    </Suspense>
  );
}
