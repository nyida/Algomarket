const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function makePolymarketSlug(title: string): string {
  if (!title) return 'market';
  let slug = title.toLowerCase();
  slug = slug.replace(/ vs /g, '-vs-');
  slug = slug.replace(/ & /g, '-and-');
  slug = slug.replace(/[^a-z0-9-]/g, (c) => (c === ' ' ? '-' : ''));
  slug = slug.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return slug || 'market';
}

export function isPastMarket(title: string): boolean {
  const dateRegex =
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/i;
  const isoRegex = /(\d{4})-(\d{2})-(\d{2})/;
  let match = title.match(dateRegex);
  let year: number;
  let month: number;
  let day: number;

  if (match) {
    month = MONTH_NAMES.indexOf(match[1]) + 1;
    if (month === 0) return false;
    day = parseInt(match[2], 10);
    year = parseInt(match[3], 10);
  } else {
    match = title.match(isoRegex);
    if (!match) return false;
    year = parseInt(match[1], 10);
    month = parseInt(match[2], 10);
    day = parseInt(match[3], 10);
  }

  const dateObj = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dateObj < today;
}

export function fmt(n: number, d = 1): string {
  const v = Number(n);
  if (isNaN(v)) return '0';
  return v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtUsd(n: number, d = 0): string {
  const v = Number(n);
  if (isNaN(v)) return '$0';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${fmt(v, d)}`;
}

export function fmtPrice(price: number): string {
  const cents = price * 100;
  if (cents >= 10) return `${cents.toFixed(1)}¢`;
  return `${cents.toFixed(2)}¢`;
}

export function fmtContracts(n: number): string {
  const v = Number(n);
  if (isNaN(v)) return '0';
  return Math.round(v).toLocaleString();
}

export function shortWallet(wallet: string): string {
  if (!wallet || wallet.length < 12) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

export type Platform = 'polymarket' | 'kalshi' | 'predictit' | 'manifold';

export function platformLabel(platform: string): string {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

export function platformShort(platform: string): string {
  switch (platform) {
    case 'polymarket':
      return 'Poly';
    case 'kalshi':
      return 'Kalshi';
    case 'predictit':
      return 'PredictIt';
    case 'manifold':
      return 'Manifold';
    default:
      return platformLabel(platform);
  }
}

export type TradeKind = 'wallet_trade' | 'anonymous_fill' | 'synthetic';

export function tradeKindLabel(kind: string): string {
  switch (kind) {
    case 'anonymous_fill':
      return 'Anonymous fill';
    case 'synthetic':
      return 'Synthetic';
    default:
      return 'Wallet';
  }
}

export function fmtRelativeTime(unixSeconds: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - unixSeconds));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function fmtDataAsOf(unixSeconds: number | null): string {
  if (!unixSeconds) return 'Unknown';
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
