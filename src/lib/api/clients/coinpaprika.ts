/**
 * CoinPaprika cryptocurrency API.
 * No API key required. 20,000 calls/month free tier. Sub-50ms responses.
 * @see https://api.coinpaprika.com/
 */

import { apiFetch } from '../http';
import type { CryptoTicker } from '../types/api.types';

const BASE = process.env.COINPAPRIKA_API_URL ?? 'https://api.coinpaprika.com/v1';

type CoinPaprikaQuote = {
  price: number;
  volume_24h: number;
  market_cap: number;
  percent_change_24h: number;
  percent_change_7d: number;
  ath_price: number;
  ath_date: string;
};

type CoinPaprikaTicker = {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  quotes: { USD: CoinPaprikaQuote };
};

function toCryptoTicker(t: CoinPaprikaTicker): CryptoTicker {
  const q = t.quotes.USD;
  return {
    id: t.id,
    symbol: t.symbol,
    name: t.name,
    rank: t.rank,
    price_usd: q.price,
    volume_24h: q.volume_24h,
    market_cap: q.market_cap,
    change_24h: q.percent_change_24h,
    change_7d: q.percent_change_7d,
    ath_price: q.ath_price,
    ath_date: q.ath_date,
    source: 'coinpaprika',
  };
}

/** Fetch ticker for a single coin by ID (e.g. btc-bitcoin). */
export async function fetchCoinPaprikaTicker(coinId: string): Promise<CryptoTicker | null> {
  const data = await apiFetch<CoinPaprikaTicker>({
    source: 'coinpaprika',
    baseUrl: BASE,
    path: `/tickers/${encodeURIComponent(coinId)}`,
    rateLimitPerMinute: 600,
  });
  return data ? toCryptoTicker(data) : null;
}

/** Fetch top cryptocurrencies by market cap rank. */
export async function fetchCoinPaprikaTop(limit = 20): Promise<CryptoTicker[]> {
  const data = await apiFetch<CoinPaprikaTicker[]>({
    source: 'coinpaprika',
    baseUrl: BASE,
    path: `/tickers?limit=${limit}`,
    rateLimitPerMinute: 600,
  });
  return (data ?? []).map(toCryptoTicker);
}

/** Search coins by name or symbol. */
export async function searchCoinPaprika(q: string): Promise<CryptoTicker[]> {
  const data = await apiFetch<{ id: string; name: string; symbol: string; rank: number }[]>({
    source: 'coinpaprika',
    baseUrl: BASE,
    path: `/search?q=${encodeURIComponent(q)}&c=currencies`,
    rateLimitPerMinute: 600,
  });
  if (!data?.length) return [];

  const tickers = await Promise.all(
    data.slice(0, 10).map((c) => fetchCoinPaprikaTicker(c.id)),
  );
  return tickers.filter((t): t is CryptoTicker => t !== null);
}

/** Default watchlist for macro/crypto dashboard widgets. */
export const COINPAPRIKA_WATCHLIST = [
  'btc-bitcoin',
  'eth-ethereum',
  'sol-solana',
  'xrp-xrp',
  'doge-dogecoin',
];

/** Fetch watchlist tickers in parallel. */
export async function fetchCoinPaprikaWatchlist(
  ids: string[] = COINPAPRIKA_WATCHLIST,
): Promise<CryptoTicker[]> {
  const tickers = await Promise.all(ids.map((id) => fetchCoinPaprikaTicker(id)));
  return tickers.filter((t): t is CryptoTicker => t !== null);
}
