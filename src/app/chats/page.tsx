'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageMotion } from '@/components/PageMotion';

type ChatSummary = { id: string; title: string; updatedAt: string };

export default function ChatsPage() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        const hasUser = !!sessionData?.user;
        setSignedIn(hasUser);

        if (hasUser) {
          const res = await fetch('/api/chats');
          if (res.ok) {
            const data = await res.json();
            setChats(data);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageMotion className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Chats</h1>
          <span className="badge text-[var(--text-muted)] bg-[var(--bg-subtle)]">v1</span>
        </div>
        <p className="page-subtitle">Open a past conversation to continue or view.</p>
      </div>
      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : signedIn === false ? (
        <div className="px-4 py-3 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          Not signed in — <Link href="/auth" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--accent)' }}>log in</Link> to save and access your conversations across devices.
        </div>
      ) : chats.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No saved chats yet. Start a conversation and it will appear here.</p>
      ) : (
        <ul className="space-y-2">
          {chats.map((c) => (
            <li key={c.id}>
              <Link
                href={`/?chat=${c.id}`}
                className="block rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 transition-colors hover:border-[#d6d3d1] hover:bg-[var(--bg-subtle)]"
              >
                <p className="font-medium line-clamp-1" style={{ color: 'var(--text-primary)' }}>{c.title || 'Chat'}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {new Date(c.updatedAt).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageMotion>
  );
}
