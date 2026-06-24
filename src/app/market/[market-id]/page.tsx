'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Shell } from '@/components/whale/Shell';
import { marketDetailPath, resolveMarketIdentity } from '@/lib/whale/marketRoutes';
import { MarketDetailFallback, MarketDetailView } from '@/components/whale/MarketDetailView';

function LegacyIdRedirect() {
  const params = useParams();
  const sp = useSearchParams();
  const router = useRouter();
  const marketId = typeof params['market-id'] === 'string' ? params['market-id'] : '';

  useEffect(() => {
    if (sp.get('title')) return;
    const decoded = resolveMarketIdentity(marketId, {});
    if (decoded) {
      router.replace(marketDetailPath(decoded.title, decoded.platform));
    }
  }, [marketId, sp, router]);

  if (sp.get('title')) {
    return <MarketDetailView />;
  }

  return (
    <Shell>
      <p className="opacity-50 text-sm">Redirecting…</p>
    </Shell>
  );
}

export default function MarketIdPage() {
  return (
    <Suspense fallback={<MarketDetailFallback />}>
      <LegacyIdRedirect />
    </Suspense>
  );
}
