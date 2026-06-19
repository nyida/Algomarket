import { execSync, spawn } from 'child_process';
import path from 'path';

export const SCRAPER_DIR =
  process.env.WHALE_SCRAPER_DIR ??
  path.join(process.env.HOME ?? '', 'Desktop/PolymarketAnalysis');

export const SCRAPE_ENABLED =
  process.env.ENABLE_SCRAPER_REFRESH === 'true' || process.env.NODE_ENV === 'development';

export function isProcessRunning(pattern: string): boolean {
  try {
    execSync(`pgrep -f "${pattern}"`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

let batchRunning = false;

export function startBatchScraper():
  | { ok: true; message: string; pid?: number }
  | { ok: false; message: string } {
  if (!SCRAPE_ENABLED) {
    return { ok: false, message: 'Scraper refresh is disabled in this environment.' };
  }
  if (batchRunning || isProcessRunning('scraper.py')) {
    return { ok: true, message: 'Batch scraper already running' };
  }

  const script = path.join(SCRAPER_DIR, 'scraper.py');
  batchRunning = true;

  try {
    const child = spawn('python3', [script], {
      cwd: SCRAPER_DIR,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    child.on('exit', () => {
      batchRunning = false;
    });
    child.on('error', () => {
      batchRunning = false;
    });
    return { ok: true, message: 'Batch scraper started', pid: child.pid };
  } catch {
    batchRunning = false;
    return { ok: false, message: 'Failed to start batch scraper' };
  }
}

export function startKalshiScraper(projectRoot: string):
  | { ok: true; message: string; pid?: number }
  | { ok: false; message: string } {
  if (!SCRAPE_ENABLED) {
    return { ok: false, message: 'Scraper refresh is disabled in this environment.' };
  }
  if (isProcessRunning('scraper_kalshi.py')) {
    return { ok: true, message: 'Kalshi scraper already running' };
  }

  const script = path.join(projectRoot, 'scripts/run-live-scrapers.sh');
  try {
    const child = spawn('bash', [script], {
      cwd: SCRAPER_DIR,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return { ok: true, message: 'Kalshi scraper started', pid: child.pid };
  } catch {
    return { ok: false, message: 'Failed to start Kalshi scraper' };
  }
}
