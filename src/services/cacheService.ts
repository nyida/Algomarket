export type SpreadSnapshot = {
  at: number;
  poly_price: number;
  kalshi_price: number;
  spread_cents: number;
  net_profit_cents: number;
};

const MAX_MARKETS = 200;
const MAX_POINTS = 240;
const MIN_INTERVAL_MS = 55_000;

type MarketHistory = {
  id: string;
  title: string;
  points: SpreadSnapshot[];
  lastRecorded: number;
  firstSeen: number;
  lastSeen: number;
};

const store = new Map<string, MarketHistory>();

function trimPoints(points: SpreadSnapshot[]): SpreadSnapshot[] {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  return points.filter((p) => p.at >= cutoff).slice(-MAX_POINTS);
}

export function recordSpreadSnapshots(
  pairs: {
    id: string;
    title: string;
    poly_price: number;
    kalshi_price: number;
    spread_cents: number;
    net_profit_cents: number;
  }[],
): void {
  const top = pairs.slice(0, MAX_MARKETS);
  const now = Date.now();
  const activeIds = new Set<string>();

  for (const p of top) {
    activeIds.add(p.id);
    const existing = store.get(p.id);
    if (existing && now - existing.lastRecorded < MIN_INTERVAL_MS) continue;

    const point: SpreadSnapshot = {
      at: now,
      poly_price: p.poly_price,
      kalshi_price: p.kalshi_price,
      spread_cents: p.spread_cents,
      net_profit_cents: p.net_profit_cents,
    };

    if (existing) {
      existing.points = trimPoints([...existing.points, point]);
      existing.lastRecorded = now;
      existing.lastSeen = now;
      existing.title = p.title;
    } else {
      store.set(p.id, {
        id: p.id,
        title: p.title,
        points: [point],
        lastRecorded: now,
        firstSeen: now,
        lastSeen: now,
      });
    }
  }

  for (const id of store.keys()) {
    if (!activeIds.has(id)) store.delete(id);
  }
}

export function getLastSeen(marketId: string): { first_seen_at: number; last_seen_at: number } | null {
  const h = store.get(marketId);
  if (!h) return null;
  return { first_seen_at: h.firstSeen, last_seen_at: h.lastSeen };
}

export function getSpreadHistory(marketId: string): SpreadSnapshot[] {
  return store.get(marketId)?.points ?? [];
}

export function getSpreadHistoryByTitle(title: string): SpreadSnapshot[] {
  const norm = title.toLowerCase().trim();
  for (const h of store.values()) {
    if (h.title.toLowerCase().trim() === norm) return h.points;
  }
  return [];
}

export function getAllSpreadHistories(): { id: string; title: string; points: SpreadSnapshot[] }[] {
  return Array.from(store.values()).map(({ id, title, points }) => ({ id, title, points }));
}
