'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { SpreadChartModal } from '@/components/whale/SpreadChartModal';

type SpreadModalState = {
  contractId: string;
  title: string;
  polyTitle?: string;
  kalshiTitle?: string;
} | null;

type SpreadModalContextValue = {
  openSpreadModal: (state: NonNullable<SpreadModalState>) => void;
};

const SpreadModalContext = createContext<SpreadModalContextValue | null>(null);

export function SpreadModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<SpreadModalState>(null);

  const openSpreadModal = useCallback((state: NonNullable<SpreadModalState>) => {
    setModal(state);
  }, []);

  return (
    <SpreadModalContext.Provider value={{ openSpreadModal }}>
      {children}
      {modal && (
        <SpreadChartModal
          contractId={modal.contractId}
          title={modal.title}
          polyTitle={modal.polyTitle}
          kalshiTitle={modal.kalshiTitle}
          onClose={() => setModal(null)}
        />
      )}
    </SpreadModalContext.Provider>
  );
}

export function useSpreadModal() {
  const ctx = useContext(SpreadModalContext);
  if (!ctx) throw new Error('useSpreadModal must be used within SpreadModalProvider');
  return ctx;
}
