'use client';

import { useEffect, useState } from 'react';

export function LiveRefreshNote({
  lastFetch,
  label = 'Updated',
}: {
  lastFetch: number | null;
  label?: string;
}) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!lastFetch) return null;

  const secs = Math.max(0, Math.floor((Date.now() - lastFetch) / 1000));
  const text = secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`;

  return (
    <span className="live-refresh-note" title="Auto-refresh from local database">
      {label} {text}
    </span>
  );
}
