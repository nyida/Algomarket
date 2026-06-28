/**
 * FRED (Federal Reserve Economic Data) API.
 * Free and unlimited macroeconomic data: GDP, unemployment, CPI, interest rates.
 * @see https://fred.stlouisfed.org/docs/api/fred/
 */

import { apiFetch } from '../http';
import type { MacroSeries } from '../types/api.types';

const BASE = process.env.FRED_API_URL ?? 'https://api.stlouisfed.org/fred';

function apiKey(): string | undefined {
  return process.env.FRED_API_KEY;
}

type FredSeriesInfo = {
  seriess?: { id: string; title: string; units: string; frequency: string }[];
};

type FredObservations = {
  observations?: { date: string; value: string }[];
};

/** Common macro series IDs for dashboard widgets. */
export const FRED_MACRO_SERIES = {
  GDP: 'GDP',
  UNEMPLOYMENT: 'UNRATE',
  CPI: 'CPIAUCSL',
  FED_FUNDS: 'FEDFUNDS',
  TEN_YEAR: 'DGS10',
} as const;

/** Fetch metadata for a FRED series. */
export async function fetchFredSeriesInfo(
  seriesId: string,
): Promise<{ id: string; title: string; units: string; frequency: string } | null> {
  const key = apiKey();
  if (!key) return null;

  const data = await apiFetch<FredSeriesInfo>({
    source: 'fred',
    baseUrl: BASE,
    path: `/series?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(key)}&file_type=json`,
    rateLimitPerMinute: 120,
  });
  return data?.seriess?.[0] ?? null;
}

/** Fetch observations for a FRED series. */
export async function fetchFredSeries(
  seriesId: string,
  limit = 24,
): Promise<MacroSeries | null> {
  const key = apiKey();
  if (!key) return null;

  const [info, obs] = await Promise.all([
    fetchFredSeriesInfo(seriesId),
    apiFetch<FredObservations>({
      source: 'fred',
      baseUrl: BASE,
      path: `/series/observations?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(key)}&file_type=json&sort_order=desc&limit=${limit}`,
      rateLimitPerMinute: 120,
    }),
  ]);

  if (!obs?.observations) return null;

  const observations = obs.observations
    .filter((o) => o.value !== '.')
    .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
    .filter((o) => Number.isFinite(o.value))
    .reverse();

  return {
    series_id: seriesId,
    title: info?.title ?? seriesId,
    units: info?.units ?? '',
    frequency: info?.frequency ?? '',
    observations,
    source: 'fred',
  };
}

/** Fetch all default macro series for dashboard. */
export async function fetchFredMacroOverview(): Promise<MacroSeries[]> {
  const ids = Object.values(FRED_MACRO_SERIES);
  const results = await Promise.all(ids.map((id) => fetchFredSeries(id, 12)));
  return results.filter((r): r is MacroSeries => r !== null);
}

/** Whether FRED API key is configured. */
export function isFredConfigured(): boolean {
  return Boolean(apiKey());
}
