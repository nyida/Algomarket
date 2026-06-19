# Algomarket

Cross-venue prediction market analytics for **Polymarket** and **Kalshi** — whale holdings, live large fills, arbitrage scanner, and market screener.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data

Whale holdings and trade history are read from a local SQLite database (default: `~/Desktop/PolymarketAnalysis/whale_data.db`). Override with:

```bash
export WHALE_DB_PATH=/path/to/whale_data.db
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
| `/` | Whale holdings vs. market-implied odds |
| `/arbs` | Cross-venue arbitrage scanner |
| `/screener` | Filter markets by prob, volume, days |
| `/live` | Large fills feed (Poly + Kalshi) |
| `/traders` | Whale leaderboard |
| `/profile` | Wallet positions and history |

## API

Developer endpoints (auth via `x-api-key` or `?api_key=`):

- `GET /api/arbs` — top cross-venue arbs with net ROI
- `GET /api/whales` — whale leaderboard
- `GET /api/arbitrage` — full arb pair list

Default dev key: `algomarket-dev-key` (override with `ALGOMARKET_API_KEY`).

## Stack

Next.js 14 · React Query · Zustand · better-sqlite3 · Recharts · Framer Motion
