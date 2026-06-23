'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shell } from '@/components/whale/Shell';
import { marketDetailPath } from '@/lib/whale/marketRoutes';

function LegacyMarketRedirect() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const title = sp.get('title') ?? sp.get('market') ?? '';
    if (!title) {
      router.replace('/screener');
      return;
    }
    const venue = sp.get('venue') ?? sp.get('platform') ?? 'polymarket';
    const priceRaw = sp.get('price');
    const volumeRaw = sp.get('volume');
    router.replace(
      marketDetailPath(title, venue, {
        price: priceRaw != null ? parseFloat(priceRaw) : undefined,
        volume: volumeRaw != null ? parseFloat(volumeRaw) : undefined,
        url: sp.get('url') ?? undefined,
        event: sp.get('event'),
      }),
    );
  }, [sp, router]);

  return (
    <Shell>
      <p className="opacity-50 text-sm">Redirecting…</p>
    </Shell>
  );
}

export default function LegacyMarketPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="opacity-50 text-sm">Loading…</p>
        </Shell>
      }
    >
      <LegacyMarketRedirect />
    </Suspense>
  );
}
