'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UnifiedMarket } from '@/services/types';

export type PaperPosition = {
  id: string;
  market_title: string;
  venue: 'polymarket' | 'kalshi';
  side: 'YES' | 'NO';
  entry_price: number;
  size_usd: number;
  opened_at: number;
  closed_at: number | null;
  exit_price: number | null;
  external_url: string;
};

export type PaperPortfolio = {
  cash: number;
  positions: PaperPosition[];
};

const STORAGE_KEY = 'algomarket_paper_portfolio';
const LEGACY_STORAGE_KEY = 'arbwhale_paper_portfolio';
const STARTING_CASH = 10_000;

const defaultPortfolio: PaperPortfolio = { cash: STARTING_CASH, positions: [] };

function loadPortfolio(): PaperPortfolio {
  if (typeof window === 'undefined') return defaultPortfolio;
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    if (!raw) return defaultPortfolio;
    return JSON.parse(raw) as PaperPortfolio;
  } catch {
    return defaultPortfolio;
  }
}

function savePortfolio(p: PaperPortfolio) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

type AppStoreValue = {
  searchResults: UnifiedMarket[];
  setSearchResults: (r: UnifiedMarket[]) => void;
  portfolio: PaperPortfolio;
  openPaperTrade: (pos: Omit<PaperPosition, 'id' | 'opened_at' | 'closed_at' | 'exit_price'>) => boolean;
  closePaperPosition: (id: string, exitPrice: number) => void;
  resetPortfolio: () => void;
  unrealizedPnl: (currentPrices: Record<string, number>) => number;
  realizedPnl: number;
};

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [searchResults, setSearchResults] = useState<UnifiedMarket[]>([]);
  const [portfolio, setPortfolio] = useState<PaperPortfolio>(defaultPortfolio);

  useEffect(() => {
    setPortfolio(loadPortfolio());
  }, []);

  const persist = useCallback((p: PaperPortfolio) => {
    setPortfolio(p);
    savePortfolio(p);
  }, []);

  const openPaperTrade = useCallback(
    (pos: Omit<PaperPosition, 'id' | 'opened_at' | 'closed_at' | 'exit_price'>): boolean => {
      if (pos.size_usd > portfolio.cash) return false;
      const next: PaperPortfolio = {
        cash: portfolio.cash - pos.size_usd,
        positions: [
          ...portfolio.positions,
          {
            ...pos,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            opened_at: Date.now(),
            closed_at: null,
            exit_price: null,
          },
        ],
      };
      persist(next);
      return true;
    },
    [portfolio, persist],
  );

  const closePaperPosition = useCallback(
    (id: string, exitPrice: number) => {
      const pos = portfolio.positions.find((p) => p.id === id && !p.closed_at);
      if (!pos) return;
      const shares = pos.size_usd / pos.entry_price;
      const proceeds = shares * exitPrice;
      const updated = portfolio.positions.map((p) =>
        p.id === id ? { ...p, closed_at: Date.now(), exit_price: exitPrice } : p,
      );
      persist({ cash: portfolio.cash + proceeds, positions: updated });
    },
    [portfolio, persist],
  );

  const resetPortfolio = useCallback(() => persist(defaultPortfolio), [persist]);

  const realizedPnl = useMemo(() => {
    let pnl = STARTING_CASH - portfolio.cash;
    for (const p of portfolio.positions) {
      if (p.closed_at && p.exit_price != null) {
        const shares = p.size_usd / p.entry_price;
        pnl -= p.size_usd;
        pnl += shares * p.exit_price;
      } else {
        pnl -= p.size_usd;
      }
    }
    return pnl;
  }, [portfolio]);

  const unrealizedPnl = useCallback(
    (currentPrices: Record<string, number>) => {
      let u = 0;
      for (const p of portfolio.positions) {
        if (p.closed_at) continue;
        const cur = currentPrices[p.market_title] ?? p.entry_price;
        const shares = p.size_usd / p.entry_price;
        u += shares * cur - p.size_usd;
      }
      return u;
    },
    [portfolio.positions],
  );

  const value = useMemo(
    () => ({
      searchResults,
      setSearchResults,
      portfolio,
      openPaperTrade,
      closePaperPosition,
      resetPortfolio,
      unrealizedPnl,
      realizedPnl,
    }),
    [searchResults, portfolio, openPaperTrade, closePaperPosition, resetPortfolio, unrealizedPnl, realizedPnl],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
