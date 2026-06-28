/** Mock PredScope markets response */
export const mockPredScopeMarkets = {
  meta: { total_markets: 2, update_frequency: '10 minutes' },
  markets: [
    {
      title: 'Will BTC exceed $100k in 2026?',
      slug: 'btc-100k-2026',
      url: '/event/btc-100k-2026',
      volume: 1_000_000,
      volume_24h: 50_000,
      liquidity: 100_000,
      categories: ['crypto'],
      outcomes: [{ title: 'Yes', probability: 0.65, day_change: 0.02 }],
    },
  ],
};

/** Mock CoinPaprika BTC ticker */
export const mockCoinPaprikaBtc = {
  id: 'btc-bitcoin',
  name: 'Bitcoin',
  symbol: 'BTC',
  rank: 1,
  quotes: {
    USD: {
      price: 60000,
      volume_24h: 10_000_000_000,
      market_cap: 1_200_000_000_000,
      percent_change_24h: 1.5,
      percent_change_7d: -3.2,
      ath_price: 126000,
      ath_date: '2025-10-06T19:00:40Z',
    },
  },
};

/** Mock SimpleFunctions changes */
export const mockSimpleFunctionsChanges = {
  changes: [
    {
      id: 'chg-1',
      type: 'price_move',
      ticker: 'KXBTC-26',
      venue: 'kalshi',
      title: 'BTC above $100k',
      old_price: 0.6,
      new_price: 0.65,
      change_pct: 8.3,
      timestamp: '2026-06-27T12:00:00Z',
      url: 'https://kalshi.com/markets/kxbtc',
    },
  ],
};

/** Mock Manifold search result */
export const mockManifoldMarkets = [
  {
    id: 'abc123',
    question: 'Will oil hit $150 in 2026?',
    slug: 'oil-150-2026',
    url: 'https://manifold.markets/test/oil-150-2026',
    probability: 0.22,
    volume: 5000,
    volume24Hours: 100,
    isResolved: false,
  },
];

/** Mock PolyRouter markets */
export const mockPolyRouterMarkets = {
  markets: [
    {
      id: '516710',
      platform: 'polymarket',
      title: 'US recession in 2025?',
      volume: 100000,
      volume_24h: 5000,
      current_prices: { yes: { price: 0.065 }, no: { price: 0.935 } },
      status: 'active',
      url: 'https://polymarket.com/event/recession',
    },
  ],
};

/** Mock Metaculus questions */
export const mockMetaculusQuestions = {
  results: [
    {
      id: 12345,
      title: 'Will global GDP grow above 3% in 2026?',
      slug: 'gdp-2026',
      community_prediction: { full: { q2: 0.42 } },
      activity: 500,
      status: 'open',
      categories: [{ name: 'Economics' }],
    },
  ],
};

/** Mock FRED series observations */
export const mockFredObservations = {
  observations: [
    { date: '2026-01-01', value: '3.5' },
    { date: '2026-04-01', value: '3.7' },
  ],
};

export const mockFredSeriesInfo = {
  seriess: [{ id: 'GDP', title: 'Gross Domestic Product', units: 'Billions', frequency: 'Quarterly' }],
};
