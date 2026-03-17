import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { DeleteRunButton } from './DeleteRunButton';
import { ReliabilityReport } from '@/components/ReliabilityReport';
import { MarkdownContent } from '@/components/MarkdownContent';

export const dynamic = 'force-dynamic';

export default async function RunTracePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const run = await prisma.run.findUnique({
    where: { id },
    include: {
      attachments: true,
      retrievalChunks: true,
      candidates: { include: { verifications: true } },
      judgeDecision: true,
    },
  });
  if (!run) notFound();
  if (run.userId && run.userId !== session?.id) notFound();

  const reliability = run.reliability as Record<string, unknown> | null;
  const judge = run.judgeDecision;
  const urlImages = run.urlImages as Record<string, string[]> | null;
  const allUrlsWithImages = urlImages ? Object.entries(urlImages).filter(([, imgs]) => imgs?.length) : [];

  type SearchResults = {
    query?: string;
    results?: Array<{ title?: string; url?: string; content?: string }>;
    images?: Array<{ url?: string; description?: string; title?: string; thumbnail?: string; source?: string }>;
  };
  const tavily = run.tavilySearchResults as SearchResults | null;
  const searxng = run.searxngSearchResults as SearchResults | null;
  const crossref = run.crossrefSearchResults as SearchResults | null;
  const wikipedia = run.wikipediaSearchResults as SearchResults | null;

  const hasAnySources =
    allUrlsWithImages.length > 0 ||
    run.retrievalChunks.length > 0 ||
    (tavily?.results?.length ?? 0) > 0 ||
    (tavily?.images?.length ?? 0) > 0 ||
    (searxng?.results?.length ?? 0) > 0 ||
    (searxng?.images?.length ?? 0) > 0 ||
    (crossref?.results?.length ?? 0) > 0 ||
    (wikipedia?.results?.length ?? 0) > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href="/runs"
          className="text-sm font-medium text-[var(--accent-muted)] hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1.5 rounded px-3 py-1.5 -ml-1 hover:bg-[var(--accent-soft)]"
        >
          <span aria-hidden>←</span> Back to Runs
        </Link>
        <DeleteRunButton runId={id} />
      </div>

      <div>
        <h1 className="page-title">Trace</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1 font-mono break-all">{id}</p>
      </div>

      <section className="card">
        <h2 className="section-label">Input</h2>
        <div className="text-[var(--text-primary)] leading-relaxed">
          <MarkdownContent content={run.inputText} />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
          <span>{run.taskType}</span>
          <span>Version: {run.versionTag ?? '—'}</span>
          {run.latencyMs != null && <span>{run.latencyMs}ms</span>}
        </div>
      </section>

      <section className="card">
        <h2 className="section-label">Sources used for this answer</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          This is exactly what the model had access to: your documents and web search (if used).
        </p>

        {!hasAnySources && (
          <p className="text-[var(--text-muted)] text-sm italic">
            No retrieval or search was used; the answer was generated from the model&apos;s training only.
          </p>
        )}

        {run.attachments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Your attachments</h3>
            <ul className="text-sm text-[var(--text-secondary)] space-y-1">
              {run.attachments.map((a) => (
                <li key={a.id}>{a.originalName}</li>
              ))}
            </ul>
          </div>
        )}

        {allUrlsWithImages.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Images from your URLs</h3>
            <div className="space-y-4">
              {allUrlsWithImages.map(([baseUrl, imgs]) => (
                <div key={baseUrl}>
                  <p className="text-xs text-[var(--text-muted)] truncate mb-2" title={baseUrl}>{baseUrl}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {(imgs ?? []).map((imgUrl) => (
                      <a
                        key={imgUrl}
                        href={imgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded overflow-hidden border border-[var(--border)] hover:border-[var(--accent-muted)] hover:shadow-md transition-all duration-200"
                      >
                        <img
                          src={imgUrl}
                          alt=""
                          className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {run.retrievalChunks.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Retrieval from your URLs/documents ({run.retrievalChunks.length} chunks)
            </h3>
            <div className="space-y-2 max-h-56 overflow-auto scroll-smooth">
              {run.retrievalChunks.slice(0, 10).map((c) => (
                <div key={c.id} className="text-sm bg-[var(--bg-subtle)] p-3 border border-[var(--border)] hover:border-[var(--accent-muted)] transition-colors">
                  <span className="text-xs font-medium text-[var(--text-muted)]">score {c.score.toFixed(3)}</span>
                  <p className="text-[var(--text-secondary)] mt-1 line-clamp-2">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {searxng?.results && searxng.results.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Web search (SearXNG)</h3>
            <ul className="space-y-3">
              {searxng.results.map((r, i) => (
                <li key={i} className="text-sm p-3 bg-[var(--bg-subtle)] border border-[var(--border)] hover:border-[var(--accent-muted)] transition-colors">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">
                    {r.title || r.url}
                  </a>
                  {r.content && <p className="text-[var(--text-secondary)] mt-0.5 line-clamp-2">{r.content}</p>}
                </li>
              ))}
            </ul>
            {searxng.images && searxng.images.filter((img) => img.url).length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Images from search</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {searxng.images.filter((img) => img.url).slice(0, 12).map((img, i) => (
                    <a
                      key={i}
                      href={img.source || img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded overflow-hidden border border-[var(--border)] hover:border-[var(--accent-muted)] hover:shadow-md transition-all duration-200"
                    >
                      <img
                        src={img.thumbnail || img.url!}
                        alt={img.title || img.description || 'Search result'}
                        className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {img.title && (
                        <p className="text-xs text-[var(--text-secondary)] px-2 py-1.5 line-clamp-2 bg-[var(--bg-elevated)]">{img.title}</p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tavily?.results && tavily.results.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Web search (Tavily)</h3>
            <ul className="space-y-3">
              {tavily.results.map((r, i) => (
                <li key={i} className="text-sm p-3 bg-[var(--bg-subtle)] border border-[var(--border)] hover:border-[var(--accent-muted)] transition-colors">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">
                    {r.title || r.url}
                  </a>
                  {r.content && <p className="text-[var(--text-secondary)] mt-0.5 line-clamp-2">{r.content}</p>}
                </li>
              ))}
            </ul>
            {tavily.images && tavily.images.filter((img) => img.url).length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Images from search</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {tavily.images.filter((img) => img.url).slice(0, 12).map((img, i) => (
                    <a
                      key={i}
                      href={img.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded overflow-hidden border border-[var(--border)] hover:border-[var(--accent-muted)] hover:shadow-md transition-all duration-200"
                    >
                      <img
                        src={img.url!}
                        alt={img.description ?? ''}
                        className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {img.description && (
                        <p className="text-xs text-[var(--text-secondary)] px-2 py-1.5 line-clamp-2 bg-[var(--bg-elevated)]">{img.description}</p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {crossref?.results && crossref.results.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Crossref (research metadata)</h3>
            <ul className="space-y-3">
              {crossref.results.map((r, i) => (
                <li key={i} className="text-sm p-3 bg-[var(--bg-subtle)] border border-[var(--border)] hover:border-[var(--accent-muted)] transition-colors">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">
                    {r.title || r.url}
                  </a>
                  {r.content && <p className="text-[var(--text-secondary)] mt-0.5 line-clamp-2">{r.content}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {wikipedia?.results && wikipedia.results.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Wikipedia</h3>
            <ul className="space-y-3">
              {wikipedia.results.map((r, i) => (
                <li key={i} className="text-sm p-3 bg-[var(--bg-subtle)] border border-[var(--border)] hover:border-[var(--accent-muted)] transition-colors">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">
                    {r.title || r.url}
                  </a>
                  {r.content && <p className="text-[var(--text-secondary)] mt-0.5 line-clamp-2">{r.content}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

      </section>

      {run.candidates.length > 0 && (
        <section className="card">
          <h2 className="section-label">Candidates <span className="text-[var(--text-muted)] font-normal">({run.candidates.length})</span></h2>
          <div className="space-y-4">
            {run.candidates.map((c, idx) => (
              <div
                key={c.id}
                className="border border-[var(--border)] p-5 bg-[var(--bg-subtle)] hover:border-[var(--accent-muted)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono font-semibold text-[var(--accent)]">#{idx + 1}</span>
                  <span className="text-xs font-medium text-[var(--text-muted)]">{c.modelName}</span>
                  <span className="text-xs text-[var(--text-muted)] ml-auto">{c.latencyMs ?? 0}ms</span>
                </div>
                <div className="text-[var(--text-primary)] text-sm leading-relaxed">
                  <MarkdownContent content={c.outputText.length > 800 ? c.outputText.slice(0, 800) + '…' : c.outputText} />
                </div>
                {c.verifications.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <ul className="flex flex-wrap gap-2">
                      {c.verifications.map((v) => (
                        <li
                          key={v.id}
                          className={`text-xs px-2.5 py-1 font-medium ${
                            v.passFail
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-muted)]'
                              : 'bg-[rgba(251,191,36,0.1)] text-[#f59e0b] border border-[rgba(251,191,36,0.25)]'
                          }`}
                        >
                          {v.type}: {v.passFail ? 'pass' : 'fail'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {judge && (
        <section className="card">
          <h2 className="section-label">Judge</h2>
          <div className="text-[var(--text-primary)] leading-relaxed">
            <MarkdownContent content={judge.rationaleText} />
          </div>
          {judge.rubricScoresJson && typeof judge.rubricScoresJson === 'object' && (
            <div className="mt-3 p-3 bg-[var(--bg-inset)] text-xs font-mono text-[var(--text-secondary)]">
              {JSON.stringify(judge.rubricScoresJson, null, 2)}
            </div>
          )}
        </section>
      )}

      <section className="card">
        <h2 className="section-label">Final answer</h2>
        <div className="text-[var(--text-primary)] leading-relaxed">
          <MarkdownContent content={run.finalAnswer ?? '—'} />
        </div>
      </section>

      {reliability && (
        <section className="card">
          <h2 className="section-label">Reliability</h2>
          <ReliabilityReport data={reliability as import('@/components/ReliabilityReport').ReliabilityData} />
        </section>
      )}
    </div>
  );
}
