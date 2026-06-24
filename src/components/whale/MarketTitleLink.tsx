'use client';

import Link from 'next/link';
import { marketDetailPath, type MarketLinkExtras } from '@/lib/whale/marketRoutes';

export function MarketTitleLink({
  title,
  platform,
  extras,
  className = 'block hover:underline',
  subtitle,
}: {
  title: string;
  platform: string;
  extras?: MarketLinkExtras;
  className?: string;
  subtitle?: string | null;
}) {
  const href = marketDetailPath(title, platform, extras);
  return (
    <Link href={href} className={className} onClick={(e) => e.stopPropagation()}>
      <div className="market-title leading-snug">{title}</div>
      {subtitle && subtitle !== title && (
        <div className="text-[11px] mt-0.5 opacity-60 leading-snug">{subtitle}</div>
      )}
    </Link>
  );
}
