import { prisma } from '@/lib/db';
import { classifyTask } from './router';
import { generateCandidates } from './generate';
import { runJudge } from './judge';
import { buildReliabilityReport } from './reliability';
import type { RunInput, RetrievalChunkData, VerificationResult } from './types';
import { defaultLLM } from '@/lib/llm';
import { retrieve, chunkDocument } from '@/lib/retrieval/retrieve';
import {
  verifyArithmetic,
  verifySafety,
  type CitationVerificationResult,
} from '@/lib/verifiers';
import { logger } from '@/lib/logger';
import { readAttachmentContent, getStoragePathForId } from '@/lib/storage';
import { tavilySearch } from '@/lib/tavily';
import { searchWeb } from '@/lib/searxng';
import { crossrefSearch } from '@/lib/crossref';
import { wikipediaSearch } from '@/lib/wikipedia';
import { runBaseline } from './baseline';
import { runImproved } from './improved';
import { appendRun, runId as runIdFromLog, type RunRecord } from '@/lib/run-log';

const VERSION_TAG = process.env.VERSION_TAG ?? 'dev';
const VISUAL_QUERY_PATTERN =
  /\b(image|images|photo|photos|picture|pictures|diagram|chart|graph|map|logo|screenshot|illustration|infographic|visualize|what does .* look like|show me)\b/i;

/**
 * Trim conversation history to avoid context overflow on small local models.
 * Keeps the last MAX_HISTORY_TURNS exchanges and truncates each message body
 * so total injected tokens stay well within the model's context window.
 */
const MAX_HISTORY_TURNS = 6;   // 3 user + 3 assistant messages
const MAX_MSG_CHARS = 800;      // ~200 tokens per message

function trimHistory(history: { role: string; content: string }[] | undefined) {
  if (!history?.length) return [];
  const trimmed = history.slice(-MAX_HISTORY_TURNS);
  return trimmed.map((m) => ({
    role: m.role,
    content: m.content.length > MAX_MSG_CHARS
      ? m.content.slice(0, MAX_MSG_CHARS) + '…'
      : m.content,
  }));
}

/**
 * Post-process raw LLM output to remove common degenerate artifacts:
 * - Duplicated paragraphs (model repeating itself at context limit)
 * - Words concatenated without spaces (token boundary artifact)
 * - Trailing incomplete sentences
 */
function cleanModelOutput(text: string): string {
  if (!text) return text;

  // 1. Deduplicate: if a paragraph appears twice consecutively, keep only the first
  const paras = text.split(/\n{2,}/);
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const p of paras) {
    const key = p.trim().toLowerCase().slice(0, 120);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    deduped.push(p);
  }
  let out = deduped.join('\n\n');

  // 2. Fix missing space after sentence-ending punctuation before a capital letter
  out = out.replace(/([.!?])([A-Z])/g, '$1 $2');

  // 3. Fix missing space after comma before a word character
  out = out.replace(/,([a-zA-Z])/g, ', $1');

  // 4. Truncate at the last complete sentence only if clearly cut off mid-word/mid-sentence.
  //    Use a conservative 0.75 threshold to avoid trimming well-formed long answers.
  const lastSentenceEnd = Math.max(
    out.lastIndexOf('. '),
    out.lastIndexOf('.\n'),
    out.lastIndexOf('! '),
    out.lastIndexOf('? '),
    out.lastIndexOf('."'),
    out.lastIndexOf('!"'),
    out.lastIndexOf('?"'),
  );
  const endsCleanly = /[.!?]["']?\s*$/.test(out.trim());
  if (!endsCleanly && lastSentenceEnd > out.length * 0.75) {
    out = out.slice(0, lastSentenceEnd + 1).trim();
  }

  return out.trim();
}

function shouldIncludeImages(query: string, urls?: string[]): boolean {
  if (VISUAL_QUERY_PATTERN.test(query)) return true;
  if (!urls?.length) return false;
  return urls.some((u) => /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u));
}

export interface RunPipelineResult {
  runId: string;
  finalAnswer: string;
  reliability: ReturnType<typeof buildReliabilityReport>;
  latencyMs: number;
  /** Present when improvedMode was used; for research export. */
  runTrace?: RunRecord;
  /** URLs of images from web search or URLs for display when relevant */
  images?: { url: string; title?: string }[];
}

export type PipelineProgressEvent =
  | { type: 'start' }
  | { type: 'search'; query: string }
  | { type: 'sources'; count: number; engines: string[] }
  | { type: 'generating'; tier: 'conversational' | 'knowledge' | 'research' }
  | { type: 'done' };

export type ProgressEmitter = (event: PipelineProgressEvent) => void;

export async function executeRun(input: RunInput, emit?: ProgressEmitter): Promise<RunPipelineResult> {
  const start = Date.now();
  // Trim history early — prevents context overflow on small local models
  const safeHistory = trimHistory(input.conversationHistory);
  input = { ...input, conversationHistory: safeHistory };

  const run = await prisma.run.create({
    data: {
      ...(input.userId ? { user: { connect: { id: input.userId } } } : {}),
      inputText: input.inputText,
      conversationHistory:
        input.conversationHistory?.length ?
          (input.conversationHistory as object)
        : undefined,
      taskType: 'unknown',
      versionTag: VERSION_TAG,
    },
  });
  const runId = run.id;
  logger.info('Run started', { runId, inputLen: input.inputText.length });
  emit?.({ type: 'start' });

  if (input.attachmentIds?.length) {
    await prisma.attachment.createMany({
      data: input.attachmentIds.map((attId) => ({
        runId,
        type: 'file',
        originalName: input.attachmentNames?.[attId] ?? attId,
        storagePath: getStoragePathForId(attId),
        url: null,
      })),
    });
  }

  const hasAttachments = (input.attachmentIds?.length ?? 0) > 0 || (input.urls?.length ?? 0) > 0;
  const skipRouter = process.env.SKIP_ROUTER !== 'false';
  const taskType = skipRouter ? 'unknown' : await classifyTask(input.inputText, hasAttachments, defaultLLM);
  await prisma.run.update({ where: { id: runId }, data: { taskType } });

  let chunks: RetrievalChunkData[] = [];
  let docChunks: { docId: string; text: string }[] = [];

  const [attachmentChunks, urlResults] = await Promise.all([
    input.attachmentIds?.length
      ? Promise.all(input.attachmentIds.map((attId) => readAttachmentContent(attId)))
          .then((contents) =>
            contents.flatMap((content, i) =>
              content ? chunkDocument(content, input.attachmentIds![i]) : []
            )
          )
      : Promise.resolve([]),
    input.urls?.length
      ? (async () => {
          const { fetchUrlContentAndImages } = await import('@/lib/urls');
          return Promise.all(input.urls!.map((url) => fetchUrlContentAndImages(url)));
        })()
      : Promise.resolve([]),
  ]);
  for (const c of attachmentChunks) docChunks.push(c);
  const urlImages: Record<string, string[]> = {};
  if (input.urls?.length) {
    for (let i = 0; i < input.urls.length; i++) {
      const { text: content, imageUrls } = urlResults[i];
      if (content) docChunks.push(...chunkDocument(content, input.urls[i]));
      if (imageUrls.length > 0) urlImages[input.urls[i]] = imageUrls;
    }
  }
  if (docChunks.length > 0) {
    chunks = await retrieve(input.inputText, docChunks, 10);
    await prisma.retrievalChunk.createMany({
      data: chunks.map((c) => ({
        runId,
        docId: c.docId,
        chunkId: c.chunkId,
        text: c.text,
        score: c.score,
      })),
    });
  }

  let contextExcerpts = chunks.map((c) => c.text);
  const searchQuery = input.inputText.trim();
  const includeImages = shouldIncludeImages(searchQuery, input.urls);

  // ── Three-tier query classifier ──────────────────────────────────────────────
  //
  // TIER 1 – Conversational  : greetings, small-talk, social questions
  //           → 0 search, 128 tokens, ~2-4 s
  // TIER 2 – Simple knowledge: stable definitions, formulas, history, concepts
  //           the model already knows well → 0 search, 600 tokens, ~5-10 s
  // TIER 3 – Research        : current events, comparisons, deep analysis
  //           → Tavily + optional academic, 1200 tokens, ~15-25 s

  // Tier 1: any social exchange — greetings, how-are-yous, acks, filler
  const CONVERSATIONAL_PATTERN =
    /^(hi|hello|hey|yo|sup|greetings|howdy|good\s+(morning|afternoon|evening|night|day)|thanks|thank you|ty|thx|cheers|np|no problem|ok|okay|k|sure|yep|yeah|yah|nope|nah|got it|sounds good|makes sense|cool|nice|great|awesome|perfect|lol|haha|lmao|hehe|interesting|i see|i understand|i get it|got it|alright|right|fair enough|makes sense|understood|of course|sure thing|absolutely|definitely|no worries|my bad|sorry|oops|wow|oh|ah|uh|hmm|tell me more|go on|continue|and\?|so\?|really\?|is that so|truly|for real|no way|seriously|omg|nice one|well done|good job|good to know|that makes sense|that's (right|cool|great|interesting|amazing|awesome|nice|good|helpful|correct|true|false|wrong)|you('?re| are) (right|correct|wrong|amazing|great|awesome)|can you|please|help me|yes|no|maybe|not sure|i don't know|idk)\b[.!?]?$/i;
  // Also catch short social questions like "How you doing?", "How's it going?", "You good?"
  // Note: "how do/did" is intentionally excluded — those are knowledge questions ("how do mountains form?").
  const SOCIAL_QUESTION_PATTERN =
    /^(how (are|r|ya|you|is|was|have|goes)\b|what('?s| is) up\b|you (good|ok|okay|alright|there|around|busy|free)\b|u (good|ok|okay)\b|how'?s (it|everything|things|life|work|school|your day)\b|how (are things|have you been|was your|goes it)\b|doing (well|good|ok|okay|alright)\b)/i;

  // In a multi-turn conversation, a short follow-up like "whats his best song" refers
  // to prior context — check the full conversation text for recency signals, not just this turn.
  const hasConversationHistory = (input.conversationHistory?.length ?? 0) > 0;
  // Do NOT include a blanket length check here — short queries like "What is DNA?" (11 chars)
  // are factual, not conversational. Length alone is a terrible signal.
  const isLikelyConversational =
    CONVERSATIONAL_PATTERN.test(searchQuery.trim()) ||
    SOCIAL_QUESTION_PATTERN.test(searchQuery.trim());

  // Tier 2: stable knowledge — model's training is sufficient, no search needed
  const SIMPLE_KNOWLEDGE_PATTERN =
    /^(what is|what are|what does|what do|who is|who was|who were|define |explain |what'?s (a |an |the )?|how does|how do\b|how do you|how do i|what formula|what equation|what theorem|what law|give me the|show me the|tell me (about|what|how|why)|what causes|what makes|why (is|are|does|do|was|were|did)|when (did|was|were|is)|where (is|are|was|were)|can you explain|could you explain|what happened (to|in|with|during)|how (was|were|did)|describe)\b/i;
  const RECENCY_SIGNAL =
    /\b(202[0-9]|today|current|latest|recent|right now|just|breaking|who won|who is the (current|new)|who (became|got elected)|price of|cost of|stock|weather|news|update)\b/i;
  // Short pronoun-based follow-ups like "whats his best song", "who made it" rely on prior
  // context — treat as simple knowledge so they resolve from history without web search.
  // Exclude vague connectors "and", "also", "so" since they match too broadly (e.g. queries
  // containing "and" are not necessarily follow-ups).
  const isShortFollowUp = hasConversationHistory && searchQuery.trim().length < 60 &&
    /\b(his|her|their|its|he|she|they|it|that|this|the same|more about|tell me more|what about)\b/i.test(searchQuery);
  const isSimpleKnowledge =
    !isLikelyConversational &&
    (isShortFollowUp || (SIMPLE_KNOWLEDGE_PATTERN.test(searchQuery) && !RECENCY_SIGNAL.test(searchQuery))) &&
    searchQuery.length < 150;

  const useWebSearch = !isLikelyConversational && !isSimpleKnowledge;
  // Crossref returns academic paper metadata — only useful when the query signals academic intent.
  const ACADEMIC_PATTERN =
    /\b(study|research|paper|journal|published|citation|evidence|findings|experiment|peer.?review|meta.?analysis|hypothesis|theory of|mechanism of|effect of|impact of)\b/i;
  const useAcademicSources = useWebSearch && ACADEMIC_PATTERN.test(searchQuery);

  const hasTavilyKey = !!process.env.TAVILY_API_KEY?.trim();
  const tavilyExplicitlyDisabled = process.env.TAVILY_ENABLED === 'false';
  const useTavily = hasTavilyKey && !tavilyExplicitlyDisabled && useWebSearch;
  const useSearXNG = process.env.SEARXNG_ENABLED === 'true' && useWebSearch && !useTavily;

  if (useWebSearch) emit?.({ type: 'search', query: searchQuery });

  const [tavilyData, searxngData, crossrefData, wikipediaData] = await Promise.all([
    useTavily
      ? tavilySearch(searchQuery, { maxResults: 5, includeImages, includeImageDescriptions: includeImages })
      : Promise.resolve(null),
    useSearXNG
      ? searchWeb(searchQuery, { maxResults: 5, maxImages: 5, includeImages })
      : Promise.resolve(null),
    useAcademicSources ? crossrefSearch(searchQuery, { maxResults: 3 }) : Promise.resolve(null),
    // Wikipedia is a high-quality factual source for all research queries, not just academic ones
    useWebSearch ? wikipediaSearch(searchQuery, { maxResults: 3 }) : Promise.resolve(null),
  ]);

  if (tavilyData?.results?.length) {
    const webContext = tavilyData.results.map(
      (r) => `[${r.title}](${r.url}): ${r.content}`
    );
    contextExcerpts = [...contextExcerpts, ...webContext];
  }
  if (searxngData?.results?.length) {
    const webContext = searxngData.results.map(
      (r) => `[${r.title}](${r.url}): ${r.content}`
    );
    contextExcerpts = [...contextExcerpts, ...webContext];
  }
  if (includeImages && searxngData?.images?.length) {
    const imageContext = searxngData.images
      .filter((img) => img.url)
      .slice(0, 8)
      .map((img) => `Image (${img.title || 'diagram'}): ${img.url}`);
    contextExcerpts = [...contextExcerpts, ...imageContext];
  }
  if (crossrefData?.results?.length) {
    const crossrefContext = crossrefData.results.map(
      (r) => `[${r.title}](${r.url}): ${r.content}`
    );
    contextExcerpts = [...contextExcerpts, ...crossrefContext];
  }
  if (wikipediaData?.results?.length) {
    const wikiContext = wikipediaData.results.map(
      (r) => `[${r.title}](${r.url}): ${r.content}`
    );
    contextExcerpts = [...contextExcerpts, ...wikiContext];
  }
  if (includeImages && tavilyData?.images?.length) {
    const imageContext = tavilyData.images
      .filter((img) => img.url)
      .slice(0, 8)
      .map((img) => `Image (${img.description || 'diagram'}): ${img.url}`);
    contextExcerpts = [...contextExcerpts, ...imageContext];
  }
  for (const [url, imgs] of Object.entries(urlImages)) {
    if (includeImages && imgs?.length) {
      contextExcerpts = [...contextExcerpts, `Images from ${url}: ${imgs.slice(0, 6).join(', ')}`];
    }
  }

  // Deduplicate context: drop excerpts whose leading content we've already seen.
  // This prevents the same fact appearing 3× from Tavily + Wikipedia + Crossref.
  {
    const seenKeys = new Set<string>();
    contextExcerpts = contextExcerpts.filter((excerpt) => {
      // Strip URL prefix "[Title](url): " to compare content, not source labels
      const content = excerpt.replace(/^\[.*?\]\(.*?\):\s*/, '').slice(0, 90).toLowerCase().trim();
      if (!content || seenKeys.has(content)) return false;
      seenKeys.add(content);
      return true;
    }).slice(0, 12); // Hard cap: 12 sources prevents context overflow on small models
  }

  const collectedImages: { url: string; title?: string }[] = [];
  if (includeImages) {
    if (searxngData?.images?.length) {
      for (const img of searxngData.images.slice(0, 6)) {
        if (img.url) collectedImages.push({ url: img.url, title: img.title });
      }
    }
    if (tavilyData?.images?.length) {
      for (const img of tavilyData.images.slice(0, 6)) {
        if (img.url) collectedImages.push({ url: img.url, title: img.description });
      }
    }
    for (const imgs of Object.values(urlImages)) {
      for (const url of (imgs ?? []).slice(0, 4)) {
        if (url) collectedImages.push({ url });
      }
    }
  }

  // Emit sources-found event so the UI can show what was retrieved
  if (useWebSearch) {
    const engines: string[] = [];
    if ((tavilyData?.results?.length ?? 0) > 0) engines.push('Tavily');
    if ((searxngData?.results?.length ?? 0) > 0) engines.push('SearXNG');
    if ((crossrefData?.results?.length ?? 0) > 0) engines.push('Crossref');
    if ((wikipediaData?.results?.length ?? 0) > 0) engines.push('Wikipedia');
    if (chunks.length > 0) engines.push('Documents');
    emit?.({ type: 'sources', count: contextExcerpts.length, engines });
  }

  const promptForPipeline =
    contextExcerpts.length > 0
      ? `Relevant context:\n${contextExcerpts.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}\n\nUser question: ${input.inputText}`
      : input.inputText;

  const hasSources = contextExcerpts.length > 0;
  const citationRule = hasSources
    ? `Cite every factual claim inline as [N] using the exact source number from the context above. Do not invent citation numbers. If a claim is not in the sources, either omit it or state it is from general knowledge.`
    : 'You have NO external sources for this query. Do NOT use [N] brackets or a References section. If uncertain about a specific fact, say so explicitly — never guess.';
  const accuracyRule = 'Be precise with names, dates, and numbers. When genuinely uncertain about a specific fact, write "I\'m not certain" rather than fabricating.';
  const mathRule = 'Render all math with LaTeX: inline as $formula$ and display equations as $$formula$$ on their own line.';
  const imageGuidance = includeImages
    ? 'Embed 1-2 relevant images from the context as `![descriptive caption](url)` where they materially improve understanding.'
    : 'Do not include markdown image syntax unless the user explicitly asks for visuals.';

  // Detect explicit requests for long-form output (essays, thorough explanations, histories, etc.)
  const LONG_FORM_PATTERN = /\b(thorough|comprehensive|detailed|in[- ]depth|extensive|complete|full|essay|explain\s+(in\s+detail|everything|fully)|history\s+of|overview\s+of|guide\s+to|write\s+(a\s+)?report)\b/i;
  const isLongForm = !isLikelyConversational && !isSimpleKnowledge && LONG_FORM_PATTERN.test(input.inputText);

  // Per-tier token budgets
  const maxTokensForQuery = isLikelyConversational ? 128 : isSimpleKnowledge ? 700 : isLongForm ? 2400 : 1400;

  // Source grounding instruction varies by whether we actually retrieved anything
  const sourceGrounding = hasSources
    ? ` You have ${contextExcerpts.length} verified web sources in the context below — ground every factual claim in them and cite with [N]. Prefer these sources over your training data for specific facts, figures, and dates.`
    : ' You have no external sources for this query — answer from well-established knowledge and clearly flag anything you are uncertain about.';

  const systemPrompt = isLikelyConversational
    ? 'You are a friendly assistant. Respond naturally in 1-2 sentences. No headers, no lists, no long explanations.'
    : isSimpleKnowledge
    ? `You are a knowledgeable and precise assistant.${hasConversationHistory ? ' This is part of an ongoing conversation — use the prior messages above for context when answering.' : ''} Answer directly and completely in 1-3 focused paragraphs calibrated to the question's complexity. ${mathRule} ${citationRule} ${accuracyRule} Never fabricate specific facts — state uncertainty explicitly. CRITICAL: Always complete every sentence — never stop mid-sentence.`
    : isLongForm
    ? `You are an expert encyclopedia writer producing a comprehensive reference article.${sourceGrounding} Write a thorough, well-structured article of 800–1500 words. Use ## section headers and flowing prose paragraphs. Cover the topic fully: history, context, key concepts, examples, and implications where relevant. ${mathRule} ${citationRule} ${accuracyRule} ${imageGuidance} CRITICAL: You MUST finish every sentence and complete the full article — never truncate mid-sentence or mid-section.`
    : `You are an expert research assistant and encyclopedia writer.${sourceGrounding} Structure your response like a precise Wikipedia article: open with a clear summary paragraph, then ## section headers for major aspects, write in flowing prose throughout. Calibrate length carefully: 150-300 words for focused factual questions, 400-750 words for complex or multi-part topics — never pad or repeat. ${mathRule} ${citationRule} ${accuracyRule} ${imageGuidance} CRITICAL: Always complete every sentence — never truncate mid-sentence.`;

  // Single candidate always — on a single Ollama GPU extra candidates queue sequentially.
  // Operators can override with CANDIDATE_COUNT env var for cloud deployments.
  const candidateCount = Math.min(3, Math.max(1, parseInt(process.env.CANDIDATE_COUNT ?? '1', 10) || 1));

  const generatingTier = isLikelyConversational ? 'conversational' : isSimpleKnowledge ? 'knowledge' : 'research';
  emit?.({ type: 'generating', tier: generatingTier });

  if (typeof input.improvedMode === 'boolean') {
    const mode = input.improvedMode ? 'improved' : 'baseline';
    const run_id = runIdFromLog(promptForPipeline, mode, runId);
    if (input.improvedMode) {
      const nCandidates = input.fast ? 1 : undefined;
      const result = await runImproved({
        prompt: promptForPipeline,
        systemPrompt,
        evalMode: false,
        baseSeed: runId,
        nCandidates,
        maxTokens: maxTokensForQuery,
        conversationHistory: input.conversationHistory,
      });
      const runRecord: RunRecord = {
        run_id,
        timestamp: new Date().toISOString(),
        mode: 'improved',
        inputs: { prompt: promptForPipeline, n_candidates: result.candidates.length },
        outputs: {
          final_answer: result.final_answer,
          candidates: result.candidates,
          judge: result.metadata.judge,
          verification: result.metadata.verification,
        },
        latency_ms: result.metadata.latencyMs,
      };
      appendRun(runRecord);
      const latencyMs = Date.now() - start;
      // Run verifiers on the chosen final answer so the reliability report is meaningful
      const improvedVerifications = [
        verifyArithmetic(result.final_answer),
        verifySafety(input.inputText, result.final_answer),
      ];
      const improvedWebSearchUsed =
        (tavilyData?.results?.length ?? 0) > 0 ||
        (searxngData?.results?.length ?? 0) > 0 ||
        (crossrefData?.results?.length ?? 0) > 0 ||
        (wikipediaData?.results?.length ?? 0) > 0;
      const reliability = buildReliabilityReport(
        chunks.length > 0 || improvedWebSearchUsed,
        improvedVerifications,
        undefined
      );
      await prisma.run.update({
        where: { id: runId },
        data: {
          finalAnswer: result.final_answer,
          latencyMs,
          reliability: reliability as object,
          ...(Object.keys(urlImages).length > 0 ? { urlImages: urlImages as object } : {}),
          ...(tavilyData ? { tavilySearchResults: tavilyData as object } : {}),
          ...(searxngData ? { searxngSearchResults: searxngData as object } : {}),
          ...(crossrefData ? { crossrefSearchResults: crossrefData as object } : {}),
          ...(wikipediaData ? { wikipediaSearchResults: wikipediaData as object } : {}),
        },
      });
      return { runId, finalAnswer: cleanModelOutput(result.final_answer), reliability, latencyMs, runTrace: runRecord, images: collectedImages.length ? collectedImages : undefined };
    } else {
      const result = await runBaseline({
        prompt: promptForPipeline,
        systemPrompt,
        baseSeed: runId,
        maxTokens: maxTokensForQuery,
        conversationHistory: input.conversationHistory,
      });
      const runRecord: RunRecord = {
        run_id,
        timestamp: new Date().toISOString(),
        mode: 'baseline',
        inputs: { prompt: promptForPipeline, seed: result.metadata.seed },
        outputs: { final_answer: result.final_answer, candidates: result.candidates },
        latency_ms: result.metadata.latencyMs,
      };
      appendRun(runRecord);
      const latencyMs = Date.now() - start;
      // Run verifiers on the chosen final answer so the reliability report is meaningful
      const baselineVerifications = [
        verifyArithmetic(result.final_answer),
        verifySafety(input.inputText, result.final_answer),
      ];
      const baselineWebSearchUsed =
        (tavilyData?.results?.length ?? 0) > 0 ||
        (searxngData?.results?.length ?? 0) > 0 ||
        (crossrefData?.results?.length ?? 0) > 0 ||
        (wikipediaData?.results?.length ?? 0) > 0;
      const reliability = buildReliabilityReport(
        chunks.length > 0 || baselineWebSearchUsed,
        baselineVerifications,
        undefined
      );
      await prisma.run.update({
        where: { id: runId },
        data: {
          finalAnswer: result.final_answer,
          latencyMs,
          reliability: reliability as object,
          ...(Object.keys(urlImages).length > 0 ? { urlImages: urlImages as object } : {}),
          ...(tavilyData ? { tavilySearchResults: tavilyData as object } : {}),
          ...(searxngData ? { searxngSearchResults: searxngData as object } : {}),
          ...(crossrefData ? { crossrefSearchResults: crossrefData as object } : {}),
          ...(wikipediaData ? { wikipediaSearchResults: wikipediaData as object } : {}),
        },
      });
      return { runId, finalAnswer: cleanModelOutput(result.final_answer), reliability, latencyMs, runTrace: runRecord, images: collectedImages.length ? collectedImages : undefined };
    }
  }

  const genResults = await generateCandidates(
    taskType,
    input.inputText,
    contextExcerpts,
    candidateCount,
    input.conversationHistory,
    maxTokensForQuery,
    systemPrompt  // Pass tier-specific prompt so all pipeline paths use the same instructions
  );

  const createdCandidates = await prisma.candidate.createManyAndReturn({
    data: genResults.map((g) => ({
      runId,
      modelName: g.config.model,
      promptHash: g.promptHash,
      outputText: g.output,
      tokenCounts: { prompt: g.tokenEstimate[0], completion: g.tokenEstimate[1] },
      latencyMs: g.latencyMs,
    })),
  });
  const candidateIds = createdCandidates.map((c) => c.id);

  const verificationRows: { candidateId: string; type: string; resultJson: object; passFail: boolean; notes: string | null }[] = [];
  const candidatesWithVerifications: {
    id: string;
    data: { modelName: string; promptHash: string; outputText: string; tokenCounts?: { prompt: number; completion: number }; latencyMs: number };
    verifications: VerificationResult[];
  }[] = [];

  for (let i = 0; i < genResults.length; i++) {
    const candId = candidateIds[i];
    const output = genResults[i].output;
    const calcResult = verifyArithmetic(output);
    const safetyResult = verifySafety(input.inputText, output);
    verificationRows.push(
      { candidateId: candId, type: calcResult.type, resultJson: calcResult.resultJson as object, passFail: calcResult.pass, notes: calcResult.notes ?? null },
      { candidateId: candId, type: safetyResult.type, resultJson: safetyResult.resultJson as object, passFail: safetyResult.pass, notes: safetyResult.notes ?? null }
    );
    const cand = createdCandidates[i];
    if (cand)
      candidatesWithVerifications.push({
        id: candId,
        data: {
          modelName: cand.modelName,
          promptHash: cand.promptHash ?? '',
          outputText: cand.outputText,
          tokenCounts: cand.tokenCounts as { prompt: number; completion: number } | undefined,
          latencyMs: cand.latencyMs ?? 0,
        },
        verifications: [calcResult, safetyResult],
      });
  }
  if (verificationRows.length > 0) {
    await prisma.verification.createMany({
      data: verificationRows,
    });
  }

  const singleCandidate = candidatesWithVerifications.length === 1;
  let chosenCandidateId: string;
  let finalAnswer: string;
  let chosenVerifications: VerificationResult[];

  if (singleCandidate) {
    chosenCandidateId = candidatesWithVerifications[0].id;
    finalAnswer = cleanModelOutput(candidatesWithVerifications[0].data.outputText);
    chosenVerifications = candidatesWithVerifications[0].verifications;
    await prisma.judgeDecision.create({
      data: {
        runId,
        chosenCandidateId,
        rubricScoresJson: {},
        rationaleText: 'Single candidate (no judge).',
      },
    });
  } else {
    const judgeOutput = await runJudge(
      input.inputText,
      contextExcerpts,
      candidatesWithVerifications,
      defaultLLM
    );
    await prisma.judgeDecision.create({
      data: {
        runId,
        chosenCandidateId: judgeOutput.chosenCandidateId,
        rubricScoresJson: judgeOutput.rubricScores as object,
        rationaleText: judgeOutput.rationale,
      },
    });
    chosenCandidateId = judgeOutput.chosenCandidateId;
    const chosenCandidate = await prisma.candidate.findUnique({
      where: { id: judgeOutput.chosenCandidateId },
    });
    finalAnswer = cleanModelOutput(chosenCandidate?.outputText ?? genResults[0]?.output ?? '');
    if (judgeOutput.finalAnswerEdit) finalAnswer = cleanModelOutput(judgeOutput.finalAnswerEdit);
    chosenVerifications =
      candidatesWithVerifications.find((c) => c.id === judgeOutput.chosenCandidateId)?.verifications ?? [];
  }
  const citationVerification = chosenVerifications.find((v) => v.type === 'citation');
  const citationResultsForReport: CitationVerificationResult[] =
    (citationVerification?.resultJson?.claims as CitationVerificationResult[]) ?? [];
  const webSearchUsed =
    (tavilyData?.results?.length ?? 0) > 0 ||
    (searxngData?.results?.length ?? 0) > 0 ||
    (crossrefData?.results?.length ?? 0) > 0 ||
    (wikipediaData?.results?.length ?? 0) > 0;
  const reliability = buildReliabilityReport(
    chunks.length > 0 || webSearchUsed,
    chosenVerifications,
    citationResultsForReport.length > 0 ? citationResultsForReport : undefined
  );

  const latencyMs = Date.now() - start;
  await prisma.run.update({
    where: { id: runId },
    data: {
      finalAnswer,
      reliability: reliability as object,
      latencyMs,
      costEstimate: null,
      ...(Object.keys(urlImages).length > 0 ? { urlImages: urlImages as object } : {}),
      ...(tavilyData ? { tavilySearchResults: tavilyData as object } : {}),
      ...(searxngData ? { searxngSearchResults: searxngData as object } : {}),
      ...(crossrefData ? { crossrefSearchResults: crossrefData as object } : {}),
      ...(wikipediaData ? { wikipediaSearchResults: wikipediaData as object } : {}),
    },
  });

  logger.info('Run completed', { runId, latencyMs, taskType });
  return { runId, finalAnswer, reliability, latencyMs, images: collectedImages.length ? collectedImages : undefined };
}
