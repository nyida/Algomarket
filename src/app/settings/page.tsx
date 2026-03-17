import { getSession } from '@/lib/auth';
import { AuthForm } from '@/app/auth/AuthForm';
import { PageMotion } from '@/components/PageMotion';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getSession();
  return (
    <PageMotion className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Settings</h1>
          <span className="badge text-[var(--text-muted)] bg-[var(--bg-subtle)]">v1</span>
        </div>
        <p className="page-subtitle">Auth and API configuration.</p>
      </div>
      <div className="card space-y-8">
        <section>
          <h2 className="section-label">Account</h2>
          {session ? (
            <div className="rounded-none p-4" style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Logged in</p>
              <p className="text-[15px] mt-1" style={{ color: 'var(--text-secondary)' }}>{session.email}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Your chats and runs are saved to your account.</p>
              <form action="/api/auth/logout" method="POST" className="mt-3">
                <button type="submit" className="text-sm font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
                  Log out
                </button>
              </form>
            </div>
          ) : (
            <div>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Log in to save your chats and access them from any device.</p>
              <AuthForm />
            </div>
          )}
        </section>
        <section>
          <h2 className="section-label">LLM (Ollama)</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The app uses 5 free Ollama models (llama3.2, qwen2.5:3b, mistral, phi3, gemma2:2b). No API key required. Default is 5 candidates per run. For parallel runs (faster), set <code className="research-code">OLLAMA_URLS</code> in .env to 5 comma-separated URLs (e.g. ports 11434–11438) and run 5 Ollama instances.
          </p>
        </section>
        <section>
          <h2 className="section-label">Version</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Set <code className="research-code">VERSION_TAG</code> in .env to tag runs for regression comparison.
          </p>
        </section>
      </div>
    </PageMotion>
  );
}
