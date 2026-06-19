import type { ArbitrageSpread } from './types';

export function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleTokens(t: string): Set<string> {
  return new Set(
    normalizeTitle(t)
      .split(' ')
      .filter((w) => w.length > 2),
  );
}

export function titleSimilarity(a: string, b: string): number {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

export function lookupSpread(
  byPolyTitle: Record<string, ArbitrageSpread>,
  marketTitle: string,
): ArbitrageSpread | null {
  if (byPolyTitle[marketTitle]) return byPolyTitle[marketTitle];
  const norm = normalizeTitle(marketTitle);
  for (const [title, spread] of Object.entries(byPolyTitle)) {
    if (normalizeTitle(title) === norm) return spread;
    if (titleSimilarity(title, marketTitle) > 0.6) return spread;
  }
  return null;
}
