import type { TaskType } from './types';
import { completeWithModel, getOllamaUrls } from '@/lib/llm';
import { createHash } from 'crypto';

const IMAGE_INSTRUCTION = ` Use markdown images only when they materially improve the answer and the user is asking for visual information; otherwise, do not include images.`;
const SYSTEM_PROMPT_FULL = `You are an expert encyclopedia writer and accurate assistant. Answer each question at the depth it deserves: definitions and formulas in 1-3 concise paragraphs; complex topics (history, science, policy) in a well-structured article with ## headers and flowing prose. Never truncate — always complete your last sentence. Use LaTeX for math: inline $formula$, display $$formula$$. Only use [N] citation numbers when sources are explicitly provided in the context — never invent citations. Be precise with dates, names, and numbers; state uncertainty explicitly rather than guessing.` + IMAGE_INSTRUCTION;

function buildPrompt(
  taskType: TaskType,
  userInput: string,
  contextExcerpts: string[]
): string {
  const contextBlock =
    contextExcerpts.length > 0
      ? `Relevant context:\n${contextExcerpts.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}\n\n`
      : '';
  return `${contextBlock}User question: ${userInput}`;
}

export interface GenConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

/** Fallback max tokens used when run.ts does not pass a maxTokensOverride. */
const DEFAULT_CONFIGS: GenConfig[] = [
  { model: 'llama3.2', temperature: 0.3, maxTokens: 1200 },
  { model: 'qwen',     temperature: 0.35, maxTokens: 1200 },
  { model: 'mistral',  temperature: 0.3, maxTokens: 1200 },
  { model: 'phi',      temperature: 0.25, maxTokens: 1200 },
  { model: 'gemma2',   temperature: 0.3, maxTokens: 1200 },
];

export async function generateCandidates(
  taskType: TaskType,
  userInput: string,
  contextExcerpts: string[],
  count = 3,
  conversationHistory?: { role: string; content: string }[],
  maxTokensOverride?: number,
  systemPromptOverride?: string
): Promise<{ promptHash: string; config: GenConfig; output: string; latencyMs: number; tokenEstimate: [number, number] }[]> {
  const prompt = buildPrompt(taskType, userInput, contextExcerpts);
  const promptHash = createHash('sha256').update(prompt).digest('hex').slice(0, 16);
  const history = conversationHistory ?? [];
  // Use caller-supplied system prompt when available (tier-specific, source-aware)
  const systemPrompt = systemPromptOverride ?? SYSTEM_PROMPT_FULL;
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: prompt },
  ];
  const configs = DEFAULT_CONFIGS.slice(0, count);
  const ollamaUrls = getOllamaUrls();
  const results = await Promise.all(
    configs.map(async (config, i) => {
      const baseUrl = ollamaUrls.length > 0 ? ollamaUrls[i % ollamaUrls.length] : undefined;
      const maxTokens = maxTokensOverride ?? config.maxTokens;
      const start = Date.now();
      const output = await completeWithModel(
        config.model,
        messages,
        { temperature: config.temperature, maxTokens, baseUrl }
      );
      const latencyMs = Date.now() - start;
      const tokenEstimate: [number, number] = [
        Math.ceil(prompt.length / 4),
        Math.ceil(output.length / 4),
      ];
      return { promptHash, config, output, latencyMs, tokenEstimate };
    })
  );
  return results;
}
