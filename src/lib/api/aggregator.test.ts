import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetAggregatorCache, getDataSourceStatuses } from './aggregator';
import { mockPredScopeMarkets, mockCoinPaprikaBtc, mockSimpleFunctionsChanges } from './__mocks__/responses';

vi.mock('./clients/predscope', () => ({
  fetchPredScopeMarkets: vi.fn(),
}));

vi.mock('./clients/polymarket', () => ({
  fetchPolymarketMarkets: vi.fn().mockResolvedValue([]),
}));

vi.mock('./clients/kalshi', () => ({
  fetchKalshiMarkets: vi.fn().mockResolvedValue([]),
}));

vi.mock('./clients/manifold', () => ({
  fetchManifoldMarkets: vi.fn().mockResolvedValue([]),
}));

vi.mock('./clients/simplefunctions', () => ({
  fetchSimpleFunctionsMarkets: vi.fn().mockResolvedValue([]),
  fetchSimpleFunctionsChanges: vi.fn(),
}));

vi.mock('./clients/coinpaprika', () => ({
  fetchCoinPaprikaWatchlist: vi.fn(),
  COINPAPRIKA_WATCHLIST: ['btc-bitcoin'],
}));

vi.mock('./clients/polyrouter', () => ({
  isPolyRouterConfigured: vi.fn().mockReturnValue(false),
  fetchPolyRouterAllPlatforms: vi.fn().mockResolvedValue([]),
}));

import { aggregateMarkets, aggregateChanges, aggregateCrypto } from './aggregator';
import { fetchPredScopeMarkets } from './clients/predscope';
import { fetchSimpleFunctionsChanges } from './clients/simplefunctions';
import { fetchCoinPaprikaWatchlist } from './clients/coinpaprika';

describe('aggregator', () => {
  beforeEach(() => {
    resetAggregatorCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetAggregatorCache();
  });

  it('aggregateMarkets deduplicates and reports source status', async () => {
    vi.mocked(fetchPredScopeMarkets).mockResolvedValue([
      {
        id: 'ps-1',
        title: 'Test market',
        event_title: null,
        platform: 'polymarket',
        source: 'predscope',
        volume: 1000,
        volume_24h: 100,
        probability: 0.5,
        category: 'other',
        image: null,
        external_url: 'https://polymarket.com/test',
        status: 'active',
      },
    ]);

    const result = await aggregateMarkets({ limit: 10 });
    expect(result.markets.length).toBeGreaterThan(0);
    expect(result.sources.predscope?.ok).toBe(true);
  });

  it('aggregateChanges returns empty array when SimpleFunctions fails', async () => {
    vi.mocked(fetchSimpleFunctionsChanges).mockRejectedValue(new Error('timeout'));

    const result = await aggregateChanges('1h');
    expect(result.changes).toEqual([]);
    expect(result.sources.simplefunctions?.ok).toBe(false);
  });

  it('aggregateChanges maps SimpleFunctions events', async () => {
    vi.mocked(fetchSimpleFunctionsChanges).mockResolvedValue([
      {
        id: 'c1',
        type: 'price_move',
        title: 'BTC market',
        platform: 'kalshi',
        new_price: 0.65,
        timestamp: '2026-06-27T12:00:00Z',
      },
    ]);

    const result = await aggregateChanges('1h');
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].title).toBe('BTC market');
  });

  it('aggregateCrypto uses CoinPaprika as primary source', async () => {
    vi.mocked(fetchCoinPaprikaWatchlist).mockResolvedValue([
      {
        id: 'btc-bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        rank: 1,
        price_usd: mockCoinPaprikaBtc.quotes.USD.price,
        volume_24h: mockCoinPaprikaBtc.quotes.USD.volume_24h,
        market_cap: mockCoinPaprikaBtc.quotes.USD.market_cap,
        change_24h: mockCoinPaprikaBtc.quotes.USD.percent_change_24h,
        change_7d: mockCoinPaprikaBtc.quotes.USD.percent_change_7d,
        ath_price: mockCoinPaprikaBtc.quotes.USD.ath_price,
        ath_date: mockCoinPaprikaBtc.quotes.USD.ath_date,
        source: 'coinpaprika',
      },
    ]);

    const result = await aggregateCrypto();
    expect(result.tickers[0].symbol).toBe('BTC');
    expect(result.sources.coinpaprika?.ok).toBe(true);
  });

  it('getDataSourceStatuses lists free and key-required sources', () => {
    const statuses = getDataSourceStatuses();
    const predscope = statuses.find((s) => s.source === 'predscope');
    const polyrouter = statuses.find((s) => s.source === 'polyrouter');

    expect(predscope?.requires_key).toBe(false);
    expect(polyrouter?.requires_key).toBe(true);
  });
});

describe('mock responses integrity', () => {
  it('simplefunctions changes mock is valid', () => {
    expect(mockSimpleFunctionsChanges.changes[0].type).toBe('price_move');
  });

  it('predscope mock markets have outcomes', () => {
    expect(mockPredScopeMarkets.markets[0].outcomes.length).toBeGreaterThan(0);
  });
});
