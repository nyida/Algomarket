'use client';

import { FilterToggle } from '@/components/whale/FilterToggle';

export function MatchedMarketsToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <FilterToggle
      checked={checked}
      onChange={onChange}
      label="Show matched only (both venues)"
    />
  );
}
