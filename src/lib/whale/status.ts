import { getDb } from './db';

export type ScrapeStatus = {
  last_scrape_at: number | null;
  trader_count: number;
  position_count: number;
  market_count: number;
  contract_count: number;
  latest_trade_at: number | null;
  last_kalshi_scrape_at: number | null;
  live_feed_at: number | null;
  live_feed_fresh: boolean;
  live_trade_count: number;
  live_polymarket_trades: number;
  live_kalshi_trades: number;
  all_trader_count: number;
  platforms: string[];
  stale: boolean;
  stale_threshold_minutes: number;
  scrape_in_progress: boolean;
  scrape_complete: boolean;
  whale_target: number;
};

const STALE_MINUTES = 45;
const LIVE_MIN_USD = 500;

const LIVE_TRADE_FILTER = `
  WHERE COALESCE(usd_value, size * price) >= ?
    AND COALESCE(trade_kind, 'wallet_trade') IN ('wallet_trade', 'anonymous_fill')
    AND COALESCE(platform, 'polymarket') NOT IN ('manifold', 'predictit')
`;

function metaValue(db: ReturnType<typeof getDb>, key: string): string | null {
  try {
    const row = db.prepare('SELECT value FROM scrape_metadata WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

function liveCount(db: ReturnType<typeof getDb>, sql: string, ...params: (string | number)[]): number {
  try {
    return (db.prepare(sql).get(...params) as { c: number }).c ?? 0;
  } catch {
    return 0;
  }
}

export function getAvailablePlatforms(): string[] {
  const db = getDb();
  const platforms = new Set<string>();
  try {
    const positionRows = db
      .prepare(`
        SELECT DISTINCT COALESCE(platform, 'polymarket') AS platform
        FROM positions
      `)
      .all() as { platform: string }[];
    for (const r of positionRows) platforms.add(r.platform);

    const tradeRows = db
      .prepare(`
        SELECT DISTINCT COALESCE(platform, 'polymarket') AS platform
        FROM trades
        WHERE COALESCE(trade_kind, 'wallet_trade') IN ('wallet_trade', 'anonymous_fill')
          AND COALESCE(platform, 'polymarket') NOT IN ('manifold', 'predictit')
      `)
      .all() as { platform: string }[];
    for (const r of tradeRows) platforms.add(r.platform);
  } catch {
    return ['polymarket'];
  }
  if (platforms.size === 0) return ['polymarket'];
  return Array.from(platforms).sort();
}

export function syncMetadataFromDb(db: ReturnType<typeof getDb>) {
  const trader_count = liveCount(db, 'SELECT COUNT(*) AS c FROM traders');
  const position_count = liveCount(db, 'SELECT COUNT(*) AS c FROM positions');
  const market_count = liveCount(db, 'SELECT COUNT(DISTINCT market_title) AS c FROM positions');
  const contract_count = liveCount(
    db,
    `SELECT COUNT(*) AS c FROM (
       SELECT market_title, COALESCE(platform, 'polymarket') AS platform
       FROM positions
       GROUP BY market_title, COALESCE(platform, 'polymarket')
     )`,
  );
  const all_trader_count = liveCount(db, 'SELECT COUNT(*) AS c FROM all_traders');

  let live_trade_count = 0;
  let live_polymarket_trades = 0;
  let live_kalshi_trades = 0;
  try {
    const liveRows = db
      .prepare(`
        SELECT COALESCE(platform, 'polymarket') AS platform, COUNT(*) AS c
        FROM trades
        ${LIVE_TRADE_FILTER}
        GROUP BY COALESCE(platform, 'polymarket')
      `)
      .all(LIVE_MIN_USD) as { platform: string; c: number }[];
    for (const row of liveRows) {
      live_trade_count += row.c;
      if (row.platform === 'polymarket') live_polymarket_trades = row.c;
      if (row.platform === 'kalshi') live_kalshi_trades = row.c;
    }
  } catch {
    /* no trades */
  }

  const platforms = getAvailablePlatforms();
  const now = Math.floor(Date.now() / 1000);
  const stmt = db.prepare('INSERT OR REPLACE INTO scrape_metadata (key, value) VALUES (?, ?)');
  stmt.run('trader_count', String(trader_count));
  stmt.run('position_count', String(position_count));
  stmt.run('market_count', String(market_count));
  stmt.run('contract_count', String(contract_count));
  stmt.run('all_trader_count', String(all_trader_count));
  stmt.run('live_trade_count', String(live_trade_count));
  stmt.run('live_polymarket_trades', String(live_polymarket_trades));
  stmt.run('live_kalshi_trades', String(live_kalshi_trades));
  stmt.run('platforms_json', JSON.stringify(platforms));
  stmt.run('counts_synced_at', String(now));
  if (trader_count > 0) {
    stmt.run('last_scrape_at', String(now));
  }
}

function metaInt(db: ReturnType<typeof getDb>, key: string): number | null {
  const raw = metaValue(db, key);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function getScrapeStatus(): ScrapeStatus {
  const db = getDb();
  const countsSyncedAt = metaInt(db, 'counts_synced_at');
  const countsFresh = countsSyncedAt != null && Date.now() / 1000 - countsSyncedAt < 1800;

  const trader_count =
    (countsFresh ? metaInt(db, 'trader_count') : null) ??
    liveCount(db, 'SELECT COUNT(*) AS c FROM traders');
  const position_count =
    (countsFresh ? metaInt(db, 'position_count') : null) ??
    liveCount(db, 'SELECT COUNT(*) AS c FROM positions');
  const market_count =
    (countsFresh ? metaInt(db, 'market_count') : null) ??
    liveCount(db, 'SELECT COUNT(DISTINCT market_title) AS c FROM positions');
  const contract_count =
    (countsFresh ? metaInt(db, 'contract_count') : null) ??
    liveCount(
      db,
      `SELECT COUNT(*) AS c FROM (
         SELECT market_title, COALESCE(platform, 'polymarket') AS platform
         FROM positions
         GROUP BY market_title, COALESCE(platform, 'polymarket')
       )`,
    );

  const scrapeStatusRaw = metaValue(db, 'scrape_status');
  const whaleTargetMeta = parseInt(metaValue(db, 'whale_target') ?? '0', 10);
  const whaleTargetDb = liveCount(
    db,
    'SELECT COUNT(*) AS c FROM all_traders WHERE alltime_profit >= 10000',
  );
  const whaleTarget = whaleTargetMeta || whaleTargetDb || 250;
  const scrape_in_progress =
    scrapeStatusRaw === 'in_progress' ||
    (trader_count > 0 && whaleTarget > 0 && trader_count < whaleTarget);
  const scrape_complete = scrapeStatusRaw === 'complete' || trader_count >= whaleTarget;

  const lastScrapeRaw = metaValue(db, 'last_scrape_at');
  let last_scrape_at = lastScrapeRaw ? parseInt(lastScrapeRaw, 10) : null;

  let latest_trade_at: number | null = null;
  try {
    const row = db.prepare('SELECT MAX(timestamp) AS ts FROM trades').get() as { ts: number | null };
    latest_trade_at = row?.ts ?? null;
    if (!last_scrape_at && latest_trade_at) {
      last_scrape_at = latest_trade_at;
    }
  } catch {
    /* no trades table */
  }

  const ageMinutes = last_scrape_at
    ? (Date.now() / 1000 - last_scrape_at) / 60
    : Number.POSITIVE_INFINITY;

  const lastKalshiRaw = metaValue(db, 'last_kalshi_scrape_at');
  const last_kalshi_scrape_at = lastKalshiRaw ? parseInt(lastKalshiRaw, 10) : null;
  const live_feed_at = latest_trade_at;
  const liveAgeMinutes = live_feed_at
    ? (Date.now() / 1000 - live_feed_at) / 60
    : Number.POSITIVE_INFINITY;
  const live_feed_fresh = liveAgeMinutes <= 5;

  let live_trade_count =
    (countsFresh ? metaInt(db, 'live_trade_count') : null) ?? 0;
  let live_polymarket_trades =
    (countsFresh ? metaInt(db, 'live_polymarket_trades') : null) ?? 0;
  let live_kalshi_trades =
    (countsFresh ? metaInt(db, 'live_kalshi_trades') : null) ?? 0;
  if (!countsFresh) {
    try {
      const liveRows = db
        .prepare(`
          SELECT COALESCE(platform, 'polymarket') AS platform, COUNT(*) AS c
          FROM trades
          ${LIVE_TRADE_FILTER}
          GROUP BY COALESCE(platform, 'polymarket')
        `)
        .all(LIVE_MIN_USD) as { platform: string; c: number }[];
      live_trade_count = 0;
      live_polymarket_trades = 0;
      live_kalshi_trades = 0;
      for (const row of liveRows) {
        live_trade_count += row.c;
        if (row.platform === 'polymarket') live_polymarket_trades = row.c;
        if (row.platform === 'kalshi') live_kalshi_trades = row.c;
      }
    } catch {
      /* no trades table */
    }
  }
  const all_trader_count =
    (countsFresh ? metaInt(db, 'all_trader_count') : null) ??
    liveCount(db, 'SELECT COUNT(*) AS c FROM all_traders');

  let platforms: string[];
  const platformsJson = metaValue(db, 'platforms_json');
  if (platformsJson) {
    try {
      platforms = JSON.parse(platformsJson) as string[];
    } catch {
      platforms = getAvailablePlatforms();
    }
  } else {
    platforms = getAvailablePlatforms();
  }

  return {
    last_scrape_at,
    trader_count,
    position_count,
    market_count,
    contract_count,
    latest_trade_at,
    last_kalshi_scrape_at,
    live_feed_at,
    live_feed_fresh,
    live_trade_count,
    live_polymarket_trades,
    live_kalshi_trades,
    all_trader_count,
    platforms,
    stale: !scrape_in_progress && ageMinutes > STALE_MINUTES,
    stale_threshold_minutes: STALE_MINUTES,
    scrape_in_progress,
    scrape_complete,
    whale_target: whaleTarget,
  };
}
