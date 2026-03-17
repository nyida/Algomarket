'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

const sections = [
  { id: 'abstract', title: 'Abstract' },
  { id: 'introduction', title: '1. Introduction' },
  { id: 'pipeline', title: '2. Pipeline Architecture' },
  { id: 'routing', title: '3. Task Classification' },
  { id: 'retrieval', title: '4. Retrieval & RAG' },
  { id: 'generation', title: '5. Multi-Candidate Generation' },
  { id: 'verification', title: '6. Verification Layer' },
  { id: 'judge', title: '7. Judge & Selection' },
  { id: 'reliability', title: '8. Reliability Report' },
  { id: 'eval', title: '9. Evaluation' },
  { id: 'cortex', title: '10. CORTEX (Optional Extension)' },
  { id: 'references', title: 'References & Further Reading' },
];

export function ResearchHeader() {
  return (
    <>
      <motion.header
        className="mb-16 pt-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Image src="/logo.png" alt="" width={40} height={40} className="object-contain" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
            Technical Report
          </p>
        </div>
        <h1 className="font-serif text-4xl font-semibold tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
          OpenPatch: Methodology &amp; Research
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed max-w-2xl" style={{ color: 'var(--text-primary)' }}>
          A verification-first pipeline for reliable language-model outputs: multi-model orchestration,
          programmatic verification (arithmetic, citation, contradiction, safety), judge-based selection,
          and structured reliability reporting. Optional CORTEX mode adds calibrated confidence and learned routing.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-none" style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>v1</span>
        </div>
      </motion.header>

      <motion.nav
        className="mb-16 pb-8"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
        aria-label="On this page"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--text-muted)' }}>
          Contents
        </p>
        <ul className="space-y-2.5 text-[14px]">
          {sections.map(({ id, title }) => (
            <li key={id}>
              <Link
                href={`#${id}`}
                className="transition-colors hover:opacity-100"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              >
                {title}
              </Link>
            </li>
          ))}
        </ul>
      </motion.nav>
    </>
  );
}
