'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useScrapeStatus } from '@/lib/whale/useScrapeStatus';
import { useWebSocket } from '@/hooks/useWebSocket';

const HIGHLIGHT_SPRING = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.85 };

const links = [
  { href: '/', label: 'Dashboard', title: 'Polymarket whale holdings snapshot' },
  { href: '/arbs', label: 'Arbs', title: 'Cross-venue arbitrage scanner' },
  { href: '/screener', label: 'Screener', title: 'Market screener — Kalshi & Polymarket' },
  { href: '/live', label: 'Live', title: 'Whale tracking — Polymarket + Kalshi large fills' },
  { href: '/traders', label: 'Traders', title: 'Polymarket whale leaderboard' },
  { href: '/markets', label: 'Whales', title: 'Markets by whale notional' },
  { href: '/profile', label: 'Profile', title: 'Wallet positions and history' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinkItem({
  href,
  label,
  title,
  active,
  layoutId,
  onClick,
}: {
  href: string;
  label: string;
  title?: string;
  active: boolean;
  layoutId: string;
  onClick?: () => void;
}) {
  return (
    <Link href={href} className="nav-link" data-active={active} title={title} onClick={onClick}>
      {active && (
        <motion.span
          layoutId={layoutId}
          className="nav-slide-highlight"
          transition={HIGHLIGHT_SPRING}
          aria-hidden
        />
      )}
      <span className="nav-slide-label">{label}</span>
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { status } = useScrapeStatus(15000);
  const { live: wsLive } = useWebSocket();
  const feedFresh = status?.live_feed_fresh ?? false;

  return (
    <header className="nav-header sticky top-0 z-30">
      <div className="shell !py-0 !max-w-[1280px]">
        <div className="flex items-center justify-between h-11 gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Algomarket"
              className="h-6 w-6 rounded object-cover shrink-0"
              width={24}
              height={24}
            />
            <span className="text-sm font-medium tracking-tight" style={{ color: 'var(--text)' }}>
              Algomarket
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {links.map(({ href, label, title }) => (
              <NavLinkItem
                key={href}
                href={href}
                label={label}
                title={title}
                active={isActive(pathname, href)}
                layoutId="main-nav-highlight"
              />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span
              className="hidden sm:inline text-[10px] uppercase tracking-wider data-status-line"
              style={{ color: wsLive ? 'var(--mint)' : feedFresh ? '#ffffff' : 'rgba(255,255,255,0.65)' }}
              title={wsLive ? 'WebSocket price stream active' : feedFresh ? 'Live feed updating' : 'Live feed catching up'}
            >
              {wsLive ? 'WS live' : feedFresh ? 'Live' : 'Syncing'}
            </span>
            <button
              type="button"
              className="btn btn-ghost !p-1.5 md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden flex flex-wrap gap-1 pb-2 pt-2 mt-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
            {links.map(({ href, label, title }) => (
              <NavLinkItem
                key={href}
                href={href}
                label={label}
                title={title}
                active={isActive(pathname, href)}
                layoutId="main-nav-mobile-highlight"
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
