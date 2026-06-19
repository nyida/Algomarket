import { create } from 'zustand';

export type LivePrice = {
  poly?: number;
  kalshi?: number;
  updatedAt: number;
};

type PriceStoreState = {
  prices: Record<string, LivePrice>;
  wsConnected: { kalshi: boolean; polymarket: boolean };
  lastWsAt: number | null;
  setPrice: (contractId: string, venue: 'poly' | 'kalshi', price: number) => void;
  setWsStatus: (venue: 'kalshi' | 'polymarket', connected: boolean) => void;
  reset: () => void;
};

export const usePriceStore = create<PriceStoreState>((set) => ({
  prices: {},
  wsConnected: { kalshi: false, polymarket: false },
  lastWsAt: null,
  setPrice: (contractId, venue, price) =>
    set((s) => ({
      prices: {
        ...s.prices,
        [contractId]: {
          ...s.prices[contractId],
          [venue]: price,
          updatedAt: Date.now(),
        },
      },
      lastWsAt: Date.now(),
    })),
  setWsStatus: (venue, connected) =>
    set((s) => ({
      wsConnected: { ...s.wsConnected, [venue]: connected },
    })),
  reset: () =>
    set({
      prices: {},
      wsConnected: { kalshi: false, polymarket: false },
      lastWsAt: null,
    }),
}));

export function isWsLive(state: Pick<PriceStoreState, 'wsConnected'>): boolean {
  return state.wsConnected.kalshi || state.wsConnected.polymarket;
}
