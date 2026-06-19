'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchJson } from '@/lib/whale/fetch';
import {
  appendLiveSnapshot,
  getSpreadHistoryIdb,
  hydrateMemoryCache,
  toChartPoints,
  type ChartPoint,
} from '@/lib/spreadHistoryIdb';
import { calculateNetROI } from '@/utils/arbMath';
import { usePriceStore } from '@/stores/priceStore';
import type { ArbitrageSpread } from '@/services/types';

type Props = {
  contractId: string;
  title: string;
  polyTitle?: string;
  kalshiTitle?: string;
  onClose: () => void;
};

type ArbResponse = { pairs: ArbitrageSpread[]; byPolyTitle: Record<string, ArbitrageSpread> };

export function SpreadChartModal({ contractId, title, polyTitle, kalshiTitle, onClose }: Props) {
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [rawPoints, setRawPoints] = useState<Awaited<ReturnType<typeof getSpreadHistoryIdb>>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const live = usePriceStore((s) => s.prices[contractId]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const points = await hydrateMemoryCache(contractId);
      setRawPoints(points);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const refreshLatest = useCallback(async () => {
    setRefreshing(true);
    try {
      let polyPrice = live?.poly;
      let kalshiPrice = live?.kalshi;

      if (polyPrice == null || kalshiPrice == null) {
        const data = await fetchJson<ArbResponse>('/api/arbitrage');
        const match =
          data.pairs.find((p) => p.id === contractId) ??
          (polyTitle ? data.byPolyTitle[polyTitle] : undefined);
        if (match) {
          polyPrice = match.poly_price;
          kalshiPrice = match.kalshi_price;
        }
      }

      if (polyPrice != null && kalshiPrice != null) {
        const roi = calculateNetROI(kalshiPrice, polyPrice);
        const points = await appendLiveSnapshot(contractId, title, {
          poly_price: polyPrice,
          kalshi_price: kalshiPrice,
          net_cents: roi.netCents,
        });
        setRawPoints(points);
      } else {
        await loadHistory();
      }
    } finally {
      setRefreshing(false);
    }
  }, [contractId, title, polyTitle, live, loadHistory]);

  const chartData: ChartPoint[] = useMemo(
    () => toChartPoints(rawPoints, range),
    [rawPoints, range],
  );

  return (
    <div className="paper-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="spread-modal surface"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="spread-modal-title"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider opacity-50">Historical microstructure · free</p>
            <h2 id="spread-modal-title" className="text-sm font-medium leading-snug mt-0.5 truncate">
              {title}
            </h2>
            {polyTitle && kalshiTitle && polyTitle !== kalshiTitle && (
              <p className="text-[10px] opacity-50 mt-1 truncate">↔ {kalshiTitle}</p>
            )}
          </div>
          <button type="button" className="icon-btn shrink-0" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            type="button"
            className="btn btn-ghost text-xs"
            data-active={range === '7d'}
            onClick={() => setRange('7d')}
          >
            7D
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            data-active={range === '30d'}
            onClick={() => setRange('30d')}
          >
            30D
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs flex items-center gap-1 ml-auto"
            onClick={refreshLatest}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading && <div className="shimmer h-56 w-full rounded-lg mb-2" />}

        {!loading && chartData.length < 2 && (
          <p className="text-xs opacity-50 py-12 text-center">
            Building history… snapshots record every 60s. Hit Refresh to append the latest live price now.
          </p>
        )}

        {!loading && chartData.length >= 2 && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.45)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="spread"
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.45)' }}
                  unit="¢"
                  label={{ value: 'Spread', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#888' }}
                />
                <YAxis
                  yAxisId="price"
                  orientation="right"
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.45)' }}
                  unit="¢"
                />
                <Tooltip
                  contentStyle={{
                    background: '#111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area
                  yAxisId="spread"
                  type="monotone"
                  dataKey="spread"
                  name="Net spread"
                  stroke="#eab308"
                  fill="#eab308"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="poly"
                  name="Poly price"
                  stroke="var(--mint)"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="kalshi"
                  name="Kalshi price"
                  stroke="#60a5fa"
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-[10px] opacity-40 mt-3 text-center">
          {rawPoints.length} snapshots · IndexedDB · Oddpool charges $100/mo for this
        </p>
      </div>
    </div>
  );
}
