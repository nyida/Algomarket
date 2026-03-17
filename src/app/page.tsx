'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ReliabilityReport } from '@/components/ReliabilityReport';
import { MarkdownContent } from '@/components/MarkdownContent';
import { PipelineModeSelect } from '@/components/PipelineModeSelect';

type CortexAlternative = { model: string; output: string; confidence?: number; latency_ms?: number };

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  runId?: string;
  reliability?: Record<string, unknown>;
  latencyMs?: number;
  /** Run trace for research export (when improvedMode was used). */
  runTrace?: Record<string, unknown>;
  /** Images from web search or URLs, appended when LLM omits them */
  images?: { url: string; title?: string }[];
  /** CORTEX: confidence-optimized routing response */
  cortex?: {
    confidence: number;
    reliability: string;
    selected_model: string;
    alternatives: CortexAlternative[];
  };
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const bubble = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const chatIdFromUrl = searchParams.get('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [urlList, setUrlList] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [uploads, setUploads] = useState<{ id: string; name: string }[]>([]);
  const [improvedMode, setImprovedMode] = useState(false);
  const [cortexMode, setCortexMode] = useState(false);
  const [fastMode, setFastMode] = useState(true); // Default on for fastest response
  const pipelineMode: 'standard' | 'improved' | 'cortex' = cortexMode ? 'cortex' : improvedMode ? 'improved' : 'standard';
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => {
    if (messages.length > 0 || loading) scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (pathname === '/') {
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [pathname]);

  useEffect(() => {
    fetch('/api/auth/session').then((r) => r.json()).then((d) => setSignedIn(!!d?.user)).catch(() => setSignedIn(false));
  }, []);

  // Load conversation from URL
  useEffect(() => {
    if (!chatIdFromUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/chats/${chatIdFromUrl}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const msgs = (data.messages ?? []) as { role: string; content: string; runId?: string }[];
        setMessages(msgs.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          runId: m.runId,
        })));
        setConversationId(data.id);
      } catch {
        if (!cancelled) setConversationId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [chatIdFromUrl]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list?.length) return;
    for (const f of Array.from(list)) {
      const form = new FormData();
      form.set('file', f);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.id) setUploads((prev) => [...prev, { id: data.id, name: data.name ?? f.name }]);
    }
  }

  async function handleSend() {
    const toSend = input.trim();
    if (!toSend && messages.length === 0) return;
    if (loading) return;

    setLoading(true);
    setLoadingStep('');
    setError(null);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: toSend }]);

    try {
      if (pipelineMode === 'cortex') {
        const res = await fetch('/api/cortex/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: toSend }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'CORTEX request failed');
        const newAssistant: ChatMessage = {
          role: 'assistant',
          content: data.answer ?? '',
          latencyMs: data.latency_ms,
          cortex: {
            confidence: data.confidence ?? 0,
            reliability: data.reliability ?? 'Medium',
            selected_model: data.selected_model ?? '',
            alternatives: Array.isArray(data.alternatives) ? data.alternatives : [],
          },
        };
        setMessages((prev) => [...prev, newAssistant]);
        const allMessages = [...messages, { role: 'user' as const, content: toSend }, newAssistant];
        const payload = {
          conversationId: conversationId ?? undefined,
          title: messages.length === 0 ? toSend.slice(0, 80) : undefined,
          messages: allMessages.map((m) => ({ role: m.role, content: m.content, runId: m.runId })),
        };
        try {
          const chatRes = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const chatData = await chatRes.json();
          if (chatData.id && !conversationId) {
            setConversationId(chatData.id);
            router.replace(`/?chat=${chatData.id}`, { scroll: false });
          }
        } catch (_) {}
        if (messages.length === 0) setUrlList([]);
        setUploads([]);
        setLoading(false);
        return;
      }

      const body: {
        inputText: string;
        urls?: string[];
        attachments?: { id: string; name: string }[];
        conversationHistory?: { role: string; content: string }[];
        improvedMode?: boolean;
        fast?: boolean;
      } = { inputText: toSend, improvedMode };
      if (improvedMode && fastMode) body.fast = true;

      if (messages.length === 0) {
        if (urlList.length) body.urls = urlList;
        if (uploads.length) body.attachments = uploads;
      } else {
        body.conversationHistory = messages.map((m) => ({ role: m.role, content: m.content }));
        if (urlList.length) body.urls = urlList;
        if (uploads.length) body.attachments = uploads;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3 * 60 * 1000);
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok || !res.body) throw new Error('Request failed');

      // Consume the SSE stream, updating loading step labels as events arrive
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: Record<string, any> = {};
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          if (!chunk.startsWith('data: ')) continue;
          let event: Record<string, unknown>;
          try { event = JSON.parse(chunk.slice(6)); } catch { continue; }
          if (event.type === 'start') {
            setLoadingStep('Thinking…');
          } else if (event.type === 'search') {
            setLoadingStep(`Searching the web…`);
          } else if (event.type === 'sources') {
            const count = event.count as number;
            const engines = (event.engines as string[]).join(', ');
            setLoadingStep(`Found ${count} source${count !== 1 ? 's' : ''} · ${engines}`);
          } else if (event.type === 'generating') {
            const tier = event.tier as string;
            const label = tier === 'conversational' ? 'Responding…' : tier === 'knowledge' ? 'Composing answer…' : 'Writing research answer…';
            setLoadingStep(label);
          } else if (event.type === 'result') {
            data = event as Record<string, unknown>;
            break outer;
          } else if (event.type === 'error') {
            throw new Error(typeof event.error === 'string' ? event.error : 'Run failed');
          }
        }
      }

      let displayContent = (data.finalAnswer as string) ?? '';
      const images = ((data.images ?? []) as { url: string; title?: string }[]);
      const hasImageInContent = /!\[.*?\]\(.*?\)/.test(displayContent);
      if (images.length > 0 && !hasImageInContent) {
        const imageBlocks = images.slice(0, 3).map((img) => `![${img.title ?? 'Relevant image'}](${img.url})`).join('\n\n');
        displayContent = displayContent.trimEnd() + '\n\n---\n\n*Relevant images from the web:*\n\n' + imageBlocks;
      }
      const newAssistant: ChatMessage = {
        role: 'assistant',
        content: displayContent,
        runId: data.runId as string | undefined,
        reliability: data.reliability as Record<string, unknown>,
        latencyMs: data.latencyMs as number | undefined,
        runTrace: data.runTrace as Record<string, unknown> | undefined,
        images: images.length ? images : undefined,
      };
      setMessages((prev) => [...prev, newAssistant]);

      // Persist conversation
      const allMessages = [...messages, { role: 'user' as const, content: toSend }, newAssistant];
      const payload = {
        conversationId: conversationId ?? undefined,
        title: messages.length === 0 ? toSend.slice(0, 80) : undefined,
        messages: allMessages.map((m) => ({
          role: m.role,
          content: m.content,
          runId: m.runId,
        })),
      };
      try {
        const chatRes = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const chatData = await chatRes.json();
        if (chatData.id && !conversationId) {
          setConversationId(chatData.id);
          router.replace(`/?chat=${chatData.id}`, { scroll: false });
        }
      } catch (_) {}

      if (messages.length === 0) setUrlList([]);
      setUploads([]);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.name === 'AbortError'
            ? 'Request took too long (over 3 minutes). Try a shorter question or check the server.'
            : e.message
          : 'Something went wrong';
      setError(message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }

  const isFirstTurn = messages.length === 0;

  return (
    <>
      {/* First-turn: everything in one full-screen frame */}
      {isFirstTurn && !loading ? (
        <motion.div
          className="relative flex flex-col w-full"
          style={{ height: 'calc(100vh - 56px)' }}
          variants={container}
          initial="hidden"
          animate="show"
        >
          <div className="page-pixel-bg" aria-hidden="true" />
          {/* Hero — grows to fill available space, content centered */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6">
            <motion.div variants={item} className="flex justify-center mb-10" style={{ perspective: '900px' }}>
              <div className="cube">
                <div className="cube__face" id="cube__face--front">{Array.from({length:9}).map((_,i)=><span key={i} className="faceBox"/>)}</div>
                <div className="cube__face" id="cube__face--back">{Array.from({length:9}).map((_,i)=><span key={i} className="faceBox"/>)}</div>
                <div className="cube__face" id="cube__face--right">{Array.from({length:9}).map((_,i)=><span key={i} className="faceBox"/>)}</div>
                <div className="cube__face" id="cube__face--left">{Array.from({length:9}).map((_,i)=><span key={i} className="faceBox"/>)}</div>
                <div className="cube__face" id="cube__face--top">{Array.from({length:9}).map((_,i)=><span key={i} className="faceBox"/>)}</div>
                <div className="cube__face" id="cube__face--bottom">{Array.from({length:9}).map((_,i)=><span key={i} className="faceBox"/>)}</div>
              </div>
            </motion.div>
            <motion.h1 variants={item} className="font-serif font-semibold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em', fontSize: 'clamp(2.8rem, 5.5vw, 5rem)', lineHeight: 1.1 }}>
              OpenPatch
            </motion.h1>
            <motion.p variants={item} className="max-w-xl mx-auto leading-relaxed mb-6" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(15px, 1.3vw, 17px)' }}>
              Verified, traceable responses via multi-model orchestration.
            </motion.p>
            <motion.div variants={item} className="flex flex-wrap justify-center gap-4">
              <Link href="/paper.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Technical Report
              </Link>
            </motion.div>
          </div>

          {/* Input — pinned at bottom of frame */}
          <motion.div variants={item} className="relative z-10 flex-shrink-0 px-6 pb-8 max-w-5xl mx-auto w-full">
            <div className="space-y-3">
              <textarea
                className="input-base resize-none min-h-[130px] text-[16px]"
                style={{ opacity: 0.7 }}
                placeholder="Ask anything…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <PipelineModeSelect value={pipelineMode} onChange={(m) => { setImprovedMode(m === 'improved'); setCortexMode(m === 'cortex'); }} />
                {improvedMode && (
                  <label className="flex items-center gap-1.5 text-[12px] cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                    <input type="checkbox" checked={fastMode} onChange={(e) => setFastMode(e.target.checked)} className="rounded-none" />
                    Single-candidate
                  </label>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <input type="url" className="input-base h-9 py-2 text-[13px] w-48" style={{ opacity: 0.6 }} placeholder="Add URL (optional)" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const u = urlInput.trim(); if (u) { setUrlList((prev) => [...prev, u]); setUrlInput(''); } } }} />
                  <button type="button" onClick={() => { const u = urlInput.trim(); if (u) { setUrlList((prev) => [...prev, u]); setUrlInput(''); } }} className="btn-secondary text-[13px] h-9 px-3 shrink-0" style={{ opacity: 0.6 }}>Add</button>
                  <input ref={fileInputRef} type="file" multiple accept=".txt,.pdf,.md,.json,.csv" className="hidden" onChange={handleUpload} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary text-[13px] h-9 px-3 inline-flex items-center gap-1.5 shrink-0" style={{ opacity: 0.6 }}>
                    <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    {uploads.length > 0 ? `${uploads.length} file(s)` : 'Attach'}
                  </button>
                  <button type="button" onClick={handleSend} disabled={loading} className="btn-primary h-9 px-5 shrink-0" style={{ opacity: 0.7 }}>Submit</button>
                </div>
              </div>
              {error && (
                <div className="rounded-none border px-4 py-3 text-sm" style={{ background: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.25)', color: 'var(--error)' }}>
                  {error.includes('Visit /setup') ? (<>{error.replace(' Visit /setup to configure.', '')} <Link href="/setup" className="font-medium underline" style={{ color: 'var(--error)' }}>Configure →</Link></>) : error}
                </div>
              )}
              {urlList.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {urlList.map((u, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 text-[11px]" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      <span className="max-w-[160px] truncate" title={u}>{u}</span>
                      <button type="button" onClick={() => setUrlList((prev) => prev.filter((_, j) => j !== i))} style={{ color: 'var(--text-muted)' }} aria-label="Remove URL">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <div className="relative flex flex-col w-full">
        <section className="flex flex-col min-w-0">
          <div className="py-4 pb-6">
            <div className="space-y-8 max-w-5xl mx-auto">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    layout
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={bubble}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  >
                    {m.role === 'user' ? (
                      /* User message — right-aligned, compact */
                      <div className="flex justify-end">
                        <div
                          className="max-w-[72%] px-4 py-2.5 text-[14px] leading-relaxed"
                          style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span className="whitespace-pre-wrap">{m.content}</span>
                        </div>
                      </div>
                    ) : (
                      /* Assistant message — document style, no bubble */
                      <div className="space-y-4">
                        <div className="text-[15px]">
                          <MarkdownContent content={m.content} />
                        </div>
                        {/* Metadata: minimal single-line footer */}
                        {(m.runId || m.reliability || m.latencyMs != null || m.cortex) && (
                          <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--border-soft)' }}>
                            {/* CORTEX info */}
                            {m.cortex && (
                              <div className="flex items-center gap-3 flex-wrap text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                <span>Confidence: {Math.round((m.cortex.confidence ?? 0) * 100)}%</span>
                                <span style={{ color: 'var(--border-bright)' }}>·</span>
                                <span style={{ color: m.cortex.reliability === 'High' ? 'var(--success)' : 'var(--text-muted)' }}>
                                  {m.cortex.reliability}
                                </span>
                                {m.cortex.selected_model && (
                                  <>
                                    <span style={{ color: 'var(--border-bright)' }}>·</span>
                                    <span>{m.cortex.selected_model}</span>
                                  </>
                                )}
                              </div>
                            )}
                            {/* Reliability */}
                            {m.reliability && typeof m.reliability === 'object' && (
                              <ReliabilityReport data={m.reliability as import('@/components/ReliabilityReport').ReliabilityData} />
                            )}
                            {/* Trace line */}
                            <div className="flex items-center gap-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                              {m.latencyMs != null && <span>{(m.latencyMs / 1000).toFixed(1)}s</span>}
                              {m.runId && (
                                <>
                                  <span style={{ color: 'var(--border-bright)' }}>·</span>
                                  <Link
                                    href={`/runs/${m.runId}`}
                                    className="transition-colors hover:opacity-80"
                                    style={{ color: 'var(--accent)' }}
                                  >
                                    View trace
                                  </Link>
                                </>
                              )}
                              {m.runTrace && (
                                <>
                                  <span style={{ color: 'var(--border-bright)' }}>·</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const blob = new Blob([JSON.stringify(m.runTrace, null, 2)], { type: 'application/json' });
                                      const a = document.createElement('a');
                                      a.href = URL.createObjectURL(blob);
                                      a.download = `trace-${(m.runTrace as { run_id?: string }).run_id ?? 'export'}.json`;
                                      a.click();
                                      URL.revokeObjectURL(a.href);
                                    }}
                                    className="transition-colors hover:opacity-80"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    Export JSON
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="loaderRectangle flex-shrink-0">
                    <div /><div /><div /><div /><div /><div />
                    <div /><div /><div /><div /><div />
                  </div>
                  {loadingStep && (
                    <motion.span
                      key={loadingStep}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-[12px] truncate max-w-[260px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {loadingStep}
                    </motion.span>
                  )}
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex-shrink-0 py-2"
              >
                <div className="rounded-none border px-4 py-3 text-sm" style={{ background: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.25)', color: 'var(--error)' }}>
                  {error.includes('Visit /setup') ? (
                    <>
                      {error.replace(' Visit /setup to configure.', '')}{' '}
                      <Link href="/setup" className="font-medium underline" style={{ color: 'var(--error)' }}>
                        Configure →
                      </Link>
                    </>
                  ) : (
                    error
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="flex-shrink-0 pt-4 pb-8 max-w-5xl mx-auto w-full">
            <div className="space-y-3">
                <textarea
                  rows={3}
                  className="input-base resize-none min-h-[72px] text-[14px] w-full"
                  placeholder="Continue the conversation…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <PipelineModeSelect
                    value={pipelineMode}
                    onChange={(m) => {
                      setImprovedMode(m === 'improved');
                      setCortexMode(m === 'cortex');
                    }}
                    size="sm"
                  />
                  {improvedMode && (
                    <label className="flex items-center gap-1.5 text-[12px] cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                      <input type="checkbox" checked={fastMode} onChange={(e) => setFastMode(e.target.checked)} className="rounded-none" />
                      Fast
                    </label>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      type="url"
                      className="input-base h-9 py-2 text-[13px] w-40"
                      placeholder="Add URL"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const u = urlInput.trim();
                          if (u) { setUrlList((prev) => [...prev, u]); setUrlInput(''); }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => { const u = urlInput.trim(); if (u) { setUrlList((prev) => [...prev, u]); setUrlInput(''); } }}
                      className="btn-secondary text-[13px] h-9 px-3 shrink-0"
                    >
                      Add
                    </button>
                    <input ref={fileInputRef} type="file" multiple accept=".txt,.pdf,.md,.json,.csv" className="hidden" onChange={handleUpload} />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-secondary text-[13px] h-9 px-3 inline-flex items-center gap-1.5 shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {uploads.length > 0 ? `${uploads.length} file(s)` : 'Attach'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={loading}
                      className="btn-primary h-9 px-5 shrink-0"
                    >
                      Submit
                    </button>
                  </div>
                </div>
                {urlList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {urlList.map((u, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 text-[11px]" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        <span className="max-w-[120px] truncate" title={u}>{u}</span>
                        <button type="button" onClick={() => setUrlList((prev) => prev.filter((_, j) => j !== i))} style={{ color: 'var(--text-muted)' }} aria-label="Remove">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
            </div>
          </footer>
        </section>
        </div>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>Loading…</div>}>
      <HomePageContent />
    </Suspense>
  );
}
