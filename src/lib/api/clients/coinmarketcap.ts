/**
 * CoinMarketCap cryptocurrency API.
 * Industry standard with 10,000 monthly credits. Some keyless endpoints available.
 * @see https://coinmarketcap.com/api/
 */

import { apiFetch } from '../http';
import type { CryptoTicker } from '../types/api.types';

const BASE = process.env.COINMARKETCAP_API_URL ?? 'https://pro-api.coinmarketcap.com/v1';

function apiKey(): string | undefined {
  return process.env.COINMARKETCAP_API_KEY;
}

type CmcQuote = {
  price: number;
  volume_24h: number;
  market_cap: number;
  percent_change_24h: number;
  percent_change_7d: number;
};

type CmcListing = {
  id: number;
  name: string;
  symbol: string;
  cmc_rank: number;
  quote: { USD: CmcQuote };
};

type CmcListingsResponse = {
  data?: CmcListing[];
};

function toCryptoTicker(m: CmcListing): CryptoTicker {
  const q = m.quote.USD;
  return {
    id: String(m.id),
    symbol: m.symbol,
    name: m.name,
    rank: m.cmc_rank,
    price_usd: q.price,
    volume_24h: q.volume_24h,
    market_cap: q.market_cap,
    change_24h: q.percent_change_24h,
    change_7d: q.percent_change_7d,
    ath_price: null,
    ath_date: null,
    source: 'coinmarketcap',
  };
}

/** Fetch latest cryptocurrency listings. Requires API key. */
export async function fetchCoinMarketCapListings(limit = 20): Promise<CryptoTicker[]> {
  const key = apiKey();
  if (!key) return [];

  const data = await apiFetch<CmcListingsResponse>({
    source: 'coinmarketcap',
    baseUrl: BASE,
    path: `/cryptocurrency/listings/latest?limit=${limit}&convert=USD`,
    apiKey: key,
    apiKeyHeader: 'X-CMC_PRO_API_KEY',
    rateLimitPerMinute: 30,
  });
  return (data?.data ?? []).map(toCryptoTicker);
}

/** Whether CoinMarketCap API key is configured. */
export function isCoinMarketCapConfigured(): boolean {
  return Boolean(apiKey());
}
