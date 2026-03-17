import type { CandidateData, VerificationResult, JudgeOutput } from './types';

export async function runJudge(
  userRequest: string,
  contextExcerpts: string[],
  candidates: { id: string; data: CandidateData; verifications: VerificationResult[] }[],
  llm: { complete: (messages: { role: string; content: string }[], opts?: { maxTokens?: number }) => Promise<string> }
): Promise<JudgeOutput> {
  const contextBlock =
    contextExcerpts.length > 0
      ? `Sources:\n${contextExcerpts.slice(0, 5).map((c, i) => `[${i + 1}] ${c.slice(0, 300)}`).join('\n')}`
      : 'No external sources were retrieved.';

  const candidatesBlock = candidates
    .map(
      (c, i) =>
        `=== Candidate ${i + 1} (id: ${c.id}) ===\n${c.data.outputText.slice(0, 1200)}\nVerifications: ${c.verifications.map((v) => `${v.type}:${v.pass ? 'pass' : 'FAIL'}`).join(', ')}`
    )
    .join('\n\n');

  const prompt = `You are an expert evaluator selecting the best AI-generated answer.

User question: "${userRequest.slice(0, 400)}"

${contextBlock}

${candidatesBlock}

Evaluate each candidate on:
- Factual accuracy (is every claim grounded in the sources or well-established fact?)
- Completeness (does it fully answer what was asked?)
- Source citation (are [N] references used correctly, not invented?)
- Clarity and structure (well-organized, concise, no padding or repetition?)

Choose the single best candidate. Prefer factual correctness and source grounding above all else.

Reply with JSON only, no extra text:
{"chosenId": "<id>", "rationale": "one sentence explaining the key reason this candidate is best", "finalAnswerEdit": null}`;

  const raw = await llm.complete(
    [
      { role: 'system', content: 'You are a strict JSON-only evaluator. Output valid JSON and nothing else.' },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 300 }
  );
  const parsed = parseJudgeResponse(raw, candidates.map((c) => c.id));
  return parsed;
}

function parseJudgeResponse(
  raw: string,
  candidateIds: string[]
): JudgeOutput {
  const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*$/g, '').trim();
  let obj: {
    chosenId?: string;
    scores?: Record<string, Record<string, number>>;
    rationale?: string;
    finalAnswerEdit?: string | null;
    uncertaintyNotes?: string;
  };
  try {
    obj = JSON.parse(cleaned) as typeof obj;
  } catch {
    return {
      chosenCandidateId: candidateIds[0],
      rubricScores: {},
      rationale: 'Parse error: ' + raw.slice(0, 200),
      uncertaintyNotes: 'Could not parse judge output',
    };
  }
  const chosenId = obj.chosenId && candidateIds.includes(obj.chosenId) ? obj.chosenId : candidateIds[0];
  const rubricScores: Record<string, number> = {};
  if (obj.scores && obj.scores[chosenId]) {
    const s = obj.scores[chosenId];
    rubricScores.correctness = s.correctness ?? 5;
    rubricScores.completeness = s.completeness ?? 5;
    rubricScores.instructionFollowing = s.instructionFollowing ?? 5;
    rubricScores.uncertaintyCalibration = s.uncertaintyCalibration ?? 5;
  }
  return {
    chosenCandidateId: chosenId,
    rubricScores,
    rationale: obj.rationale ?? 'No rationale',
    finalAnswerEdit: obj.finalAnswerEdit ?? undefined,
    uncertaintyNotes: obj.uncertaintyNotes,
  };
}
