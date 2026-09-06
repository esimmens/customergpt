import type { VercelRequest, VercelResponse } from '@vercel/node';
import { openai, MODEL, tuning } from './_shared/openai';
import { TurnRequest, customerTurnSchema } from './_shared/schemas';
import { coerceEmotion, type Emotion } from './_shared/emotions';
import { customerSystemPrompt, closingSystemPrompt } from './_shared/prompts';
import { checkRate, assertSpendOk, recordSpend } from './_shared/guard';
import { jsonError, clientIp, applyCors, handleOptions } from './_shared/http';
import { decodeReply } from './_shared/sse';

export const config = { runtime: 'nodejs20.x', maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return jsonError(res, 'METHOD_NOT_ALLOWED');

  const rl = await checkRate(clientIp(req));
  if (!rl.success) return jsonError(res, 'RATE_LIMITED', { retryAfterMs: Math.max(0, rl.reset - Date.now()) });

  const parsed = TurnRequest.safeParse(req.body);
  if (!parsed.success) return jsonError(res, 'INVALID_REQUEST', { fields: parsed.error.flatten() });
  const { product, objectionType, messages, turn } = parsed.data;

  if (!(await assertSpendOk()).ok) return jsonError(res, 'SPEND_CAP_REACHED');

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 45_000);
  // Stop generating (and billing) the instant the client goes away — tab closed,
  // navigation, refresh, or a client-side fetch abort. Without this the handler
  // keeps draining the OpenAI stream to completion, paying for tokens no one
  // receives. `writableEnded` guards against the normal-completion 'close' (which
  // also fires right after res.end()).
  let clientGone = false;
  req.on('close', () => {
    if (!res.writableEnded) {
      clientGone = true;
      ac.abort();
    }
  });
  let buffer = '';
  let emotion: Emotion = 'NEUTRAL';
  let emotionSent = false;
  let emitted = 0;
  let replyClosed = false;
  let usage: any;

  try {
    const stream = await openai.chat.completions.create(
      {
        model: MODEL,
        stream: true,
        stream_options: { include_usage: true },
        ...tuning({ maxOut: 300, temperature: 0.8, effort: 'minimal' }),
        response_format: customerTurnSchema,
        messages: [
          { role: 'system', content: turn >= 5 ? closingSystemPrompt(product, objectionType) : customerSystemPrompt(product, objectionType) },
          ...messages,
        ],
      },
      { signal: ac.signal },
    );

    for await (const part of stream) {
      if (part.usage) usage = part.usage;
      const delta = part.choices?.[0]?.delta?.content ?? '';
      if (!delta) continue;
      // Once the reply's closing quote is seen we stop emitting tokens, but keep
      // draining the stream so the final include_usage-only chunk arrives — that
      // chunk is what feeds the spend cap. Breaking here (the old behavior)
      // recorded every conversation turn as $0.
      if (replyClosed) continue;
      buffer += delta;

      if (!emotionSent) {
        const m = buffer.match(/"emotion"\s*:\s*"([A-Za-z_]+)"/);
        if (m) {
          emotion = coerceEmotion(m[1]);
          emotionSent = true;
          send('meta', { turn, emotion });
        }
      }
      const { text, closed } = decodeReply(buffer);
      if (text.length > emitted) {
        send('token', { text: text.slice(emitted) });
        emitted = text.length;
      }
      if (closed) replyClosed = true;
    }

    clearTimeout(timeout);
    if (!emotionSent) send('meta', { turn, emotion });
    const final = safeParse(buffer);
    await recordSpend(usage);
    send('done', {
      reply: (final.reply ?? '').trim(),
      emotion: coerceEmotion(final.emotion ?? emotion),
      turn,
      finalTurn: turn >= 5,
      usage,
    });
    res.end();
  } catch (err: any) {
    clearTimeout(timeout);
    // Client already disconnected: we aborted upstream to stop billing; the socket
    // is gone, so there's nothing (and nowhere) to send.
    if (clientGone) return;
    console.error('[customer-turn] upstream error:', err);
    const code = err?.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_ERROR';
    send('error', { code, message: 'The customer stepped away for a moment. Try again.', retryable: true });
    res.end();
  }
}

function safeParse(s: string): { emotion?: string; reply?: string } {
  try {
    return JSON.parse(s);
  } catch {
    return { reply: decodeReply(s).text };
  }
}
