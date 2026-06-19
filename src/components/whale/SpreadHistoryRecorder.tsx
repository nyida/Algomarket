'use client';

import { useEffect } from 'react';
import { useArbitrageMap } from '@/lib/whale/hooks';
import { recordArbSnapshotsIdb } from '@/lib/spreadHistoryIdb';

/** Records spread snapshots to IndexedDB every time arb data refreshes. */
export function SpreadHistoryRecorder() {
  const { data } = useArbitrageMap();

  useEffect(() => {
    if (!data?.pairs?.length) return;
    recordArbSnapshotsIdb(
      data.pairs.map((p) => ({
        id: p.id,
        title: p.poly_title,
        poly_price: p.poly_price,
        kalshi_price: p.kalshi_price,
        net_profit_cents: p.net_profit_cents,
      })),
    ).catch(() => {});
  }, [data?.pairs]);

  return null;
}
