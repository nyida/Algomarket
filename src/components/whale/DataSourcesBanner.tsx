'use client';

import { useDataSources } from '@/lib/whale/dataSourceHooks';

export function DataSourcesBanner() {
  const { data } = useDataSources();
  const sources = data?.sources ?? [];
  const active = sources.filter((s) => s.available && (!s.requires_key || s.has_key));
  const pending = sources.filter((s) => s.requires_key && !s.has_key);

  if (!sources.length) return null;

  return (
    <div className="data-sources-banner">
      <span className="data-sources-label">{active.length} data sources active</span>
      <div className="data-sources-pills">
        {active.slice(0, 8).map((s) => (
          <span key={s.source} className="data-source-pill data-source-pill--ok">
            {s.source}
          </span>
        ))}
        {pending.slice(0, 3).map((s) => (
          <span key={s.source} className="data-source-pill data-source-pill--key" title="API key not set">
            {s.source} (key)
          </span>
        ))}
      </div>
    </div>
  );
}
