/** Build reliable outbound links to Polymarket / Kalshi. */

type PolySlugSource = {
  slug?: string | null;
  question?: string | null;
  events?: { slug?: string | null; title?: string | null }[] | null;
};

function titleToSlug(title: string): string {
  return title
    .replace(/\s*\[(YES|NO)\]\s*$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Polymarket `/event/` pages use the event slug, not the market slug. */
export function polymarketExternalUrl(source: PolySlugSource): string {
  const eventSlug = source.events?.[0]?.slug?.trim();
  if (eventSlug) return `https://polymarket.com/event/${eventSlug}`;

  const title = source.question?.trim();
  if (title) return `https://polymarket.com/search?q=${encodeURIComponent(title)}`;

  return 'https://polymarket.com';
}

export function kalshiExternalUrl(ticker?: string | null, title?: string | null): string {
  const t = ticker?.trim();
  if (t) return `https://kalshi.com/markets/${t}`;

  const q = title?.trim();
  if (q) return `https://kalshi.com/?search=${encodeURIComponent(q)}`;

  return 'https://kalshi.com';
}

export function platformExternalUrl(
  platform: string,
  opts: { title: string; ticker?: string | null; poly?: PolySlugSource | null },
): string {
  const q = encodeURIComponent(opts.title);
  switch (platform) {
    case 'kalshi':
      return kalshiExternalUrl(opts.ticker, opts.title);
    case 'manifold':
      return `https://manifold.markets/search?q=${q}`;
    case 'predictit':
      return `https://www.predictit.org/markets/search?query=${q}`;
    default:
      if (opts.poly) return polymarketExternalUrl({ ...opts.poly, question: opts.title });
      return `https://polymarket.com/search?q=${q}`;
  }
}

/** Normalize stored DB URLs — fall back when missing or using a market slug in /event/. */
export function resolveExternalUrl(
  platform: string,
  title: string,
  stored: string | null | undefined,
): string {
  if (platform === 'polymarket' && stored?.includes('polymarket.com/event/')) {
    const slug = stored.split('/event/')[1]?.split(/[?#]/)[0] ?? '';
    // Scraped URLs often put the market question slug in /event/ — those 404.
    if (slug === titleToSlug(title)) {
      return `https://polymarket.com/search?q=${encodeURIComponent(title)}`;
    }
    return stored;
  }
  if (stored?.startsWith('http')) return stored;
  return platformExternalUrl(platform, { title });
}
