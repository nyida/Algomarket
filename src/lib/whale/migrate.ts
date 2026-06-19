import type Database from 'better-sqlite3';

const MIGRATION_KEY = 'schema_migrated_v1';
const MIGRATION_KEY_V2 = 'schema_migrated_v2';
const MIGRATION_KEY_V3 = 'schema_migrated_v3';

function metaGet(db: Database.Database, key: string): string | null {
  try {
    const row = db.prepare('SELECT value FROM scrape_metadata WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

function metaSet(db: Database.Database, key: string, value: string) {
  db.prepare('INSERT OR REPLACE INTO scrape_metadata (key, value) VALUES (?, ?)').run(key, value);
}

export function ensureSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scrape_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  if (metaGet(db, MIGRATION_KEY) !== '1') {
    const alters = [
      "ALTER TABLE positions ADD COLUMN platform TEXT DEFAULT 'polymarket'",
      'ALTER TABLE trades ADD COLUMN usd_value REAL',
      "ALTER TABLE trades ADD COLUMN platform TEXT DEFAULT 'polymarket'",
      'ALTER TABLE trades ADD COLUMN external_url TEXT',
    ];
    for (const sql of alters) {
      try {
        db.exec(sql);
      } catch {
        /* column exists */
      }
    }

    db.prepare(`
      UPDATE positions SET platform = 'polymarket' WHERE platform IS NULL OR platform = ''
    `).run();
    db.prepare(`
      UPDATE trades SET platform = 'polymarket' WHERE platform IS NULL OR platform = ''
    `).run();
    db.prepare(`
      UPDATE trades SET usd_value = size * price WHERE usd_value IS NULL OR usd_value = 0
    `).run();

    metaSet(db, MIGRATION_KEY, '1');
  }

  if (metaGet(db, MIGRATION_KEY_V2) !== '1') {
    try {
      db.exec('ALTER TABLE trades ADD COLUMN trade_kind TEXT');
    } catch {
      /* column exists */
    }

    db.prepare(`
      UPDATE trades SET trade_kind = 'synthetic'
      WHERE platform IN ('manifold', 'predictit')
         OR wallet IN ('kalshi_system', 'manifold_system', 'predictit_system')
    `).run();
    db.prepare(`
      UPDATE trades SET trade_kind = 'wallet_trade'
      WHERE trade_kind IS NULL OR trade_kind = ''
    `).run();

    metaSet(db, MIGRATION_KEY_V2, '1');
  }

  if (metaGet(db, MIGRATION_KEY_V3) !== '1') {
    for (const col of ['event_title TEXT', 'category TEXT']) {
      try {
        db.exec(`ALTER TABLE trades ADD COLUMN ${col}`);
      } catch {
        /* column exists */
      }
    }
    metaSet(db, MIGRATION_KEY_V3, '1');
  }
}
