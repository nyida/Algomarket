import { getApiKey } from '@/lib/apiAuth';

export function AppFooter() {
  const apiKey = getApiKey();

  return (
    <footer className="app-footer border-t mt-auto" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="shell py-4 max-w-6xl">
        <p className="text-[10px] uppercase tracking-wider opacity-40 mb-2">Developer API</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-mono opacity-70">
          <span>
            <code className="text-[var(--mint)]">GET /api/arbs</code>
            <span className="opacity-50 ml-2">Top arbs with net ROI</span>
          </span>
          <span>
            <code className="text-[var(--mint)]">GET /api/whales</code>
            <span className="opacity-50 ml-2">Whale leaderboard</span>
          </span>
        </div>
        <p className="text-[10px] opacity-40 mt-2">
          Auth: <code>x-api-key: {apiKey}</code> or <code>?api_key=…</code>
          <span className="opacity-80"> · Example: </span>
          <a href={`/api/arbs?api_key=${apiKey}`} className="underline opacity-60">
            /api/arbs
          </a>
        </p>
      </div>
    </footer>
  );
}
