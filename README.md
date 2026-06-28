# Algomarket

Cross-venue prediction market analytics for **Polymarket**, **Kalshi**, and more — whale holdings, live large fills, arbitrage scanner, and market screener.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — configure API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data sources

### Prediction markets (integrated)

| Source | Auth | Coverage | Used in |
|--------|------|----------|---------|
| **Polymarket** (Gamma API) | None | Direct market data | Dashboard, screener, arbs |
| **Kalshi** (Trade API) | None | Direct market data | Dashboard, screener, arbs, live |
| **PolyRouter** | API key (free beta) | 7 platforms unified | `/api/markets/aggregate` |
| **SimpleFunctions** | Optional key | Kalshi + Polymarket scan/changes | Live feed, screener |
| **PredScope** | None | 510+ Polymarket markets | Screener |
| **Manifold** | None | Play-money markets | Screener |
| **Metaculus** | None | Academic forecasts | Screener |
| **Dome** | API key | Orderbooks (EOL Apr 2026) | Orderbook client |

### Cryptocurrency

| Source | Auth | Notes |
|--------|------|-------|
| **CoinPaprika** | None | Primary — 20k calls/month, no key |
| **CoinGecko** | Optional key | Fallback if CoinPaprika empty |
| **CoinMarketCap** | API key | Optional secondary source |

### Macro & Hyperliquid

| Source | Auth | Notes |
|--------|------|-------|
| **FRED** | Free API key | GDP, unemployment, CPI, rates |
| **GoldRush** | API key | Hyperliquid ecosystem data |

### Local whale data

Whale holdings and trade history are read from `./whale_data.db`. Override with:

```bash
export WHALE_DB_PATH=./whale_data.db
```

Start background scrapers:

```bash
npm run scrape:ensure    # Kalshi live + batch if stale
npm run scrape           # Polymarket whale holdings
npm run scrape:live      # Kalshi anonymous large fills
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Whale holdings vs. market-implied odds + crypto strip |
| `/arbs` | Cross-venue arbitrage scanner |
| `/screener` | Filter markets by prob, volume, days (Poly, Kalshi, Manifold, Metaculus) |
| `/live` | Large fills feed + cross-venue market changes |
| `/traders` | Whale leaderboard |
| `/profile` | Wallet positions and history |

## API routes

### Public

- `GET /api/dashboard` — whale holdings panel
- `GET /api/market_screener` — filtered market catalog
- `GET /api/arbitrage` — cross-venue arb pairs
- `GET /api/live_whales` — large fills feed
- `GET /api/markets/aggregate` — unified markets from all sources
- `GET /api/market_changes?since=1h` — SimpleFunctions change feed
- `GET /api/crypto` — crypto ticker overview (CoinPaprika)
- `GET /api/data_sources` — data source health/status
- `GET /api/macro` — FRED macro series (requires `FRED_API_KEY`)

### Developer (auth via `x-api-key` or `?api_key=`)

- `GET /api/arbs` — top cross-venue arbs with net ROI
- `GET /api/whales` — whale leaderboard

Default dev key: `algomarket-dev-key` (override with `ALGOMARKET_API_KEY`).

## API client structure

```
src/lib/api/
├── clients/          # One module per external API
├── types/            # Shared TypeScript types
├── aggregator.ts     # Multi-source fetch with graceful degradation
├── http.ts           # Rate-limited fetch wrapper
└── index.ts          # Barrel exports
```

## Environment variables

Copy `.env.example` to `.env.local`. Priority keys to configure:

```bash
POLYROUTER_API_KEY=       # Free at polyrouter.io — unlocks 7-platform unified API
SIMPLEFUNCTIONS_API_KEY=  # Optional — public endpoints work without key
FRED_API_KEY=             # Free at fred.stlouisfed.org — macro dashboard
COINGECKO_API_KEY=        # Optional — CoinPaprika works without any key
```

## Testing

```bash
npm test          # Run API client unit tests
npm run test:watch
```

Tests include mock responses and verify graceful degradation when APIs fail.

## Stack

Next.js 14 · React Query · Zustand · better-sqlite3 · Recharts · Framer Motion · Vitest
