import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type ClientSpreadPoint = {
  at: number;
  poly_price: number;
  kalshi_price: number;
  net_cents: number;
};

type SpreadHistoryRecord = {
  contractId: string;
  title: string;
  points: ClientSpreadPoint[];
  updatedAt: number;
};

interface SpreadDB extends DBSchema {
  history: {
    key: string;
    value: SpreadHistoryRecord;
  };
}

const DB_NAME = 'algomarket-spreads';
const DB_VERSION = 1;
const MAX_MARKETS = 200;
const MIN_INTERVAL_MS = 55_000;
const RAW_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_POINTS = 5000;

let dbPromise: Promise<IDBPDatabase<SpreadDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<SpreadDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('history')) {
          db.createObjectStore('history', { keyPath: 'contractId' });
        }
      },
    });
  }
  return dbPromise;
}

function trimRaw(points: ClientSpreadPoint[]): ClientSpreadPoint[] {
  const cutoff = Date.now() - RAW_RETENTION_MS;
  return points.filter((p) => p.at >= cutoff).slice(-MAX_POINTS);
}

export async function appendLiveSnapshot(
  contractId: string,
  title: string,
  snapshot: Omit<ClientSpreadPoint, 'at'>,
): Promise<ClientSpreadPoint[]> {
  if (typeof window === 'undefined') return [];
  const db = await getDb();
  const existing = await db.get('history', contractId);
  const now = Date.now();
  const point: ClientSpreadPoint = { ...snapshot, at: now };
  const points = trimRaw([...(existing?.points ?? []), point]);
  await db.put('history', {
    contractId,
    title: title || existing?.title || contractId,
    points,
    updatedAt: now,
  });
  memoryCache.set(contractId, points);
  return points;
}

export async function appendSpreadSnapshotIdb(
  contractId: string,
  title: string,
  snapshot: Omit<ClientSpreadPoint, 'at'>,
): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await getDb();
  const existing = await db.get('history', contractId);
  const now = Date.now();

  if (existing?.points.length && now - existing.points[existing.points.length - 1].at < MIN_INTERVAL_MS) {
    return;
  }

  const points = trimRaw([...(existing?.points ?? []), { ...snapshot, at: now }]);
  await db.put('history', {
    contractId,
    title: title || existing?.title || contractId,
    points,
    updatedAt: now,
  });
  memoryCache.set(contractId, points);
}

export async function recordArbSnapshotsIdb(
  pairs: {
    id: string;
    title: string;
    poly_price: number;
    kalshi_price: number;
    net_profit_cents: number;
  }[],
): Promise<void> {
  for (const p of pairs.slice(0, MAX_MARKETS)) {
    await appendSpreadSnapshotIdb(p.id, p.title, {
      poly_price: p.poly_price,
      kalshi_price: p.kalshi_price,
      net_cents: p.net_profit_cents,
    });
  }
}

export async function getSpreadHistoryIdb(contractId: string): Promise<ClientSpreadPoint[]> {
  if (typeof window === 'undefined') return [];
  const db = await getDb();
  const rec = await db.get('history', contractId);
  return rec?.points ?? [];
}

export type ChartPoint = {
  at: number;
  label: string;
  poly: number;
  kalshi: number;
  spread: number;
};

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export function aggregateDaily(points: ClientSpreadPoint[]): ChartPoint[] {
  const byDay = new Map<string, ClientSpreadPoint[]>();
  for (const p of points) {
    const k = dayKey(p.at);
    const arr = byDay.get(k) ?? [];
    arr.push(p);
    byDay.set(k, arr);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([label, pts]) => {
      const n = pts.length;
      const poly = pts.reduce((s, p) => s + p.poly_price, 0) / n;
      const kalshi = pts.reduce((s, p) => s + p.kalshi_price, 0) / n;
      const spread = pts.reduce((s, p) => s + p.net_cents, 0) / n;
      return {
        at: pts[pts.length - 1].at,
        label,
        poly: poly * 100,
        kalshi: kalshi * 100,
        spread,
      };
    });
}

export function toChartPoints(points: ClientSpreadPoint[], range: '7d' | '30d'): ChartPoint[] {
  const cutoff =
    range === '7d'
      ? Date.now() - 7 * 24 * 60 * 60 * 1000
      : Date.now() - 30 * 24 * 60 * 60 * 1000;

  const filtered = points.filter((p) => p.at >= cutoff);
  if (range === '30d') return aggregateDaily(filtered);

  return filtered.map((p) => ({
    at: p.at,
    label: new Date(p.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    poly: p.poly_price * 100,
    kalshi: p.kalshi_price * 100,
    spread: p.net_cents,
  }));
}

export function spreadTrend(points: ClientSpreadPoint[]): 'up' | 'down' | 'flat' {
  if (points.length < 3) return 'flat';
  const mid = Math.floor(points.length / 2);
  const first = points.slice(0, mid);
  const second = points.slice(mid);
  const avg = (arr: ClientSpreadPoint[]) => arr.reduce((s, p) => s + p.net_cents, 0) / arr.length;
  const diff = avg(second) - avg(first);
  if (diff > 0.25) return 'up';
  if (diff < -0.25) return 'down';
  return 'flat';
}

/** Sync read from memory cache for sparklines (populated after idb load). */
const memoryCache = new Map<string, ClientSpreadPoint[]>();

export function setMemoryCache(contractId: string, points: ClientSpreadPoint[]) {
  memoryCache.set(contractId, points);
}

export function getClientSpreadHistory(contractId: string): ClientSpreadPoint[] {
  return memoryCache.get(contractId) ?? [];
}

export async function hydrateMemoryCache(contractId: string): Promise<ClientSpreadPoint[]> {
  const points = await getSpreadHistoryIdb(contractId);
  memoryCache.set(contractId, points);
  return points;
}
