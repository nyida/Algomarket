import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { executeRun, type PipelineProgressEvent } from '@/lib/pipeline/run';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const bodySchema = z.object({
  inputText: z.string().min(1).max(50000),
  urls: z.array(z.string().url()).optional(),
  attachmentIds: z.array(z.string()).optional(),
  attachments: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  conversationHistory: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
  improvedMode: z.boolean().optional(),
  fast: z.boolean().optional(),
});

function sseChunk(event: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { attachmentIds, attachments, ...rest } = parsed.data;
  const effectiveAttachmentIds = attachments?.map((a) => a.id) ?? attachmentIds ?? [];
  const attachmentNames = attachments
    ? Object.fromEntries(attachments.map((a) => [a.id, a.name]))
    : undefined;

  const stream = new ReadableStream({
    start(controller) {
      const emit = (event: PipelineProgressEvent) => {
        try { controller.enqueue(sseChunk(event)); } catch { /* stream closed */ }
      };

      executeRun(
        {
          ...rest,
          attachmentIds: effectiveAttachmentIds,
          attachmentNames,
          userId: session?.id,
          improvedMode: parsed.data.improvedMode,
          fast: parsed.data.fast,
        },
        emit
      )
        .then((result) => {
          try {
            controller.enqueue(sseChunk({ type: 'result', ...result }));
            controller.close();
          } catch { /* already closed */ }
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : 'Run failed';
          const isConfigError =
            msg.includes('DATABASE_URL') ||
            msg.includes('No LLM configured') ||
            msg.includes('No embed model') ||
            msg.includes('Ollama is not running') ||
            msg.includes('connection failed') ||
            msg.includes('API key invalid');
          const error = isConfigError ? `${msg} Visit /setup to configure.` : msg;
          try {
            controller.enqueue(sseChunk({ type: 'error', error }));
            controller.close();
          } catch { /* already closed */ }
        });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
