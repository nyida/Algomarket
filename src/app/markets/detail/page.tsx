'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shell } from '@/components/whale/Shell';
import { marketDetailPath } from '@/lib/whale/marketRoutes';

function LegacyDetailRedirect() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const market = sp.get('market') ?? '';
    if (!market) {
      router.replace('/markets');
      return;
    }
    const platform = sp.get('platform') ?? 'polymarket';
    router.replace(marketDetailPath(market, platform));
  }, [sp, router]);

  return (
    <Shell>
      <p className="opacity-50 text-sm">Redirecting…</p>
    </Shell>
  );
}

export default function LegacyMarketDetailPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="opacity-50 text-sm">Loading…</p>
        </Shell>
      }
    >
      <LegacyDetailRedirect />
    </Suspense>
  );
}
