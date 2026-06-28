/**
 * CoinGecko cryptocurrency API.
 * Requires API key for production (10,000 calls/month free tier).
 * @see https://www.coingecko.com/en/api
 */

import { apiFetch } from '../http';
import type { CryptoTicker } from '../types/api.types';

const BASE = process.env.COINGECKO_API_URL ?? 'https://api.coingecko.com/api/v3';
const PRO_BASE = process.env.COINGECKO_PRO_API_URL ?? 'https://pro-api.coingecko.com/api/v3';

function apiKey(): string | undefined {
  return process.env.COINGECKO_API_KEY;
}

function baseUrl(): string {
  return apiKey() ? PRO_BASE : BASE;
}

function authOpts() {
  const key = apiKey();
  return key
    ? { apiKey: key, apiKeyHeader: 'x-cg-pro-api-key' as const }
    : {};
}

type CoinGeckoMarket = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  ath: number;
  ath_date: string;
  market_cap_rank: number;
};

function toCryptoTicker(m: CoinGeckoMarket): CryptoTicker {
  return {
    id: m.id,
    symbol: m.symbol.toUpperCase(),
    name: m.name,
    rank: m.market_cap_rank,
    price_usd: m.current_price,
    volume_24h: m.total_volume,
    market_cap: m.market_cap,
    change_24h: m.price_change_percentage_24h,
    change_7d: m.price_change_percentage_7d_in_currency ?? 0,
    ath_price: m.ath,
    ath_date: m.ath_date,
    source: 'coingecko',
  };
}

/** Fetch top coins by market cap. */
export async function fetchCoinGeckoMarkets(limit = 20): Promise<CryptoTicker[]> {
  const data = await apiFetch<CoinGeckoMarket[]>({
    source: 'coingecko',
    baseUrl: baseUrl(),
    path: `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=7d`,
    rateLimitPerMinute: apiKey() ? 500 : 30,
    ...authOpts(),
  });
  return (data ?? []).map(toCryptoTicker);
}

/** Fetch a single coin by ID. */
export async function fetchCoinGeckoCoin(id: string): Promise<CryptoTicker | null> {
  const data = await apiFetch<CoinGeckoMarket[]>({
    source: 'coingecko',
    baseUrl: baseUrl(),
    path: `/coins/markets?vs_currency=usd&ids=${encodeURIComponent(id)}`,
    rateLimitPerMinute: apiKey() ? 500 : 30,
    ...authOpts(),
  });
  const m = data?.[0];
  return m ? toCryptoTicker(m) : null;
}

/** Whether CoinGecko API key is configured. */
export function isCoinGeckoConfigured(): boolean {
  return Boolean(apiKey());
}
