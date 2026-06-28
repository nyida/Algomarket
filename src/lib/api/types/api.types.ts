/**
 * Shared types for all external data source integrations.
 */

export type PredictionPlatform =
  | 'polymarket'
  | 'kalshi'
  | 'manifold'
  | 'limitless'
  | 'metaculus'
  | 'prophetx'
  | 'novig'
  | 'sxbet'
  | 'unknown';

export type DataSource =
  | PredictionPlatform
  | 'polyrouter'
  | 'simplefunctions'
  | 'dome'
  | 'predscope'
  | 'coinpaprika'
  | 'coingecko'
  | 'coinmarketcap'
  | 'fred'
  | 'goldrush';

export type ApiMarket = {
  id: string;
  title: string;
  event_title: string | null;
  platform: PredictionPlatform | 'unknown';
  source: DataSource;
  volume: number;
  volume_24h: number | null;
  probability: number;
  category: string;
  image: string | null;
  external_url: string;
  status: string;
  change_1d?: number | null;
  liquidity?: number | null;
};

export type ApiChangeEvent = {
  id: string;
  type: 'new_contract' | 'price_move' | 'removed_contract' | string;
  title: string;
  platform: string;
  old_price?: number | null;
  new_price?: number | null;
  change_pct?: number | null;
  timestamp: string;
  external_url?: string | null;
};

export type CryptoTicker = {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  price_usd: number;
  volume_24h: number;
  market_cap: number;
  change_24h: number;
  change_7d: number;
  ath_price: number | null;
  ath_date: string | null;
  source: 'coinpaprika' | 'coingecko' | 'coinmarketcap';
};

export type MacroSeriesPoint = {
  date: string;
  value: number;
};

export type MacroSeries = {
  series_id: string;
  title: string;
  units: string;
  frequency: string;
  observations: MacroSeriesPoint[];
  source: 'fred';
};

export type DataSourceStatus = {
  source: DataSource;
  available: boolean;
  requires_key: boolean;
  has_key: boolean;
  last_error?: string | null;
  rate_limit_per_minute?: number;
};

export type AggregatedMarketsResponse = {
  markets: ApiMarket[];
  sources: Record<string, { count: number; ok: boolean }>;
  cached_at: number;
};

export type MarketChangesResponse = {
  changes: ApiChangeEvent[];
  sources: Record<string, { count: number; ok: boolean }>;
  cached_at: number;
};

export type CryptoOverviewResponse = {
  tickers: CryptoTicker[];
  sources: Record<string, { count: number; ok: boolean }>;
  cached_at: number;
};
