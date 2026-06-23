export type MarketVenue = 'polymarket' | 'kalshi';

export function cleanMarketTitle(title: string): string {
  return title.replace(/\s*\[(YES|NO)\]\s*$/i, '').trim();
}

export function normalizeMarketVenue(platform: string): MarketVenue {
  return platform === 'kalshi' ? 'kalshi' : 'polymarket';
}

/** URL-safe market id: `{venue}--{encodedTitle}` */
export function encodeMarketId(title: string, platform: string): string {
  const venue = normalizeMarketVenue(platform);
  const clean = cleanMarketTitle(title);
  return `${venue}--${encodeURIComponent(clean)}`;
}

export function decodeMarketId(
  marketId: string,
): { title: string; platform: MarketVenue } | null {
  const sep = marketId.indexOf('--');
  if (sep <= 0) return null;
  const platform = marketId.slice(0, sep);
  if (platform !== 'polymarket' && platform !== 'kalshi') return null;
  try {
    const title = decodeURIComponent(marketId.slice(sep + 2));
    if (!title) return null;
    return { title, platform };
  } catch {
    return null;
  }
}

export function marketDetailPath(
  title: string,
  platform: string,
  extras?: {
    price?: number;
    volume?: number;
    url?: string;
    event?: string | null;
  },
): string {
  const base = `/market/${encodeMarketId(title, platform)}`;
  if (!extras) return base;
  const params = new URLSearchParams();
  if (extras.price != null && Number.isFinite(extras.price)) {
    params.set('price', String(extras.price));
  }
  if (extras.volume != null && Number.isFinite(extras.volume)) {
    params.set('volume', String(extras.volume));
  }
  if (extras.url) params.set('url', extras.url);
  if (extras.event) params.set('event', extras.event);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}
