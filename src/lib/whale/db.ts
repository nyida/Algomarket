import Database from 'better-sqlite3';
import path from 'path';
import { ensureSchema } from './migrate';

const DEFAULT_DB = path.join(
  process.env.HOME ?? '',
  'Desktop/PolymarketAnalysis/whale_data.db',
);

const DB_PATH = process.env.WHALE_DB_PATH ?? DEFAULT_DB;

let db: Database.Database | null = null;
let migrated = false;

function schemaReady(): boolean {
  try {
    const probe = new Database(DB_PATH, { readonly: true, fileMustExist: true, timeout: 60000 });
    probe.pragma('busy_timeout = 60000');
    const row = probe
      .prepare("SELECT value FROM scrape_metadata WHERE key = 'schema_migrated_v2'")
      .get() as { value: string } | undefined;
    probe.close();
    return row?.value === '1';
  } catch {
    return false;
  }
}

function migrateOnce() {
  if (migrated || schemaReady()) {
    migrated = true;
    return;
  }
  const writeDb = new Database(DB_PATH, { fileMustExist: true, timeout: 60000 });
  try {
    writeDb.pragma('journal_mode = WAL');
    writeDb.pragma('busy_timeout = 60000');
    ensureSchema(writeDb);
    migrated = true;
  } finally {
    writeDb.close();
  }
}

export function getDb(): Database.Database {
  if (!db) {
    migrateOnce();
    db = new Database(DB_PATH, { readonly: true, fileMustExist: true, timeout: 60000 });
    db.pragma('busy_timeout = 60000');
  }
  return db;
}

export function dbPath(): string {
  return DB_PATH;
}
