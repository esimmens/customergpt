import { coerceEmotion } from './emotions';
import type {
  Feedback,
  Message,
  ObjectionResponse,
  Sample,
  SampleExchange,
  Scores,
  TurnHandlers,
} from './types';

// ─────────────────────────── shared guards ───────────────────────────
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.round(Number.isFinite(n) ? n : 0)));

// Recompute total from the sub-scores so model arithmetic drift can't desync the dial.
export function coerceFeedback(f: Feedback): Feedback {
  const s: Scores = {
    product_knowledge: clamp(f.scores.product_knowledge, 0, 30),
    customer_understanding: clamp(f.scores.customer_understanding, 0, 25),
    objection_handling: clamp(f.scores.objection_handling, 0, 25),
    communication: clamp(f.scores.communication, 0, 20),
  };
  const total = s.product_knowledge + s.customer_understanding + s.objection_handling + s.communication;
  return { ...f, scores: s, total };
}

// ─────────────────────────── LIVE mode ───────────────────────────
export async function generateObjection(
  product: string,
  objectionType: string,
): Promise<ObjectionResponse> {
  const res = await fetch('/api/objection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product, objectionType }),
  });
  if (!res.ok) throw await toError(res);
  const data = await readJson(res);
  return { ...data, emotion: coerceEmotion(data.emotion) };
}

// In plain `vite` dev there is no /api server, so the request can resolve with
// non-JSON (an HTML fallback). Turn that into a clear, friendly error.
async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    throw {
      code: 'NO_BACKEND',
      message: 'The live backend isn’t running. Use “Watch a sample”, or start it with `npm run dev:live` and an API key.',
    };
  }
}

export async function generateFeedback(
  sessionId: string,
  product: string,
  objectionType: string,
  messages: Message[],
): Promise<Feedback> {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, product, objectionType, messages }),
  });
  if (!res.ok) throw await toError(res);
  return coerceFeedback(await readJson(res));
}

// Streamed customer turn. Emits meta → token* → done via the shared handler shape.
export async function streamTurn(
  body: { sessionId: string; product: string; objectionType: string; messages: Message[]; turn: number },
  on: TurnHandlers,
  signal?: AbortSignal,
): Promise<void> {
  // Any throw in here (fetch reject when offline, a mid-stream read error, etc.)
  // MUST become an onError — otherwise the caller's streaming/busy state is never
  // cleared and the UI hangs on the typing indicator with no way to recover.
  try {
    const res = await fetch('/api/customer-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok || !res.body) {
      const err = await toError(res);
      return on.onError({ code: err.code, message: err.message });
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const frames = buf.split('\n\n');
      buf = frames.pop() ?? '';
      for (const frame of frames) emitFrame(frame, on);
    }
    if (buf.trim()) emitFrame(buf, on);
  } catch {
    // An intentional cancel (reset / new scenario aborts the request) is not an
    // error — swallow it. Anything else is a real failure to surface.
    if (signal?.aborted) return;
    on.onError({
      code: 'NETWORK',
      message: 'The live backend isn’t reachable. Use “View demo”, or run `npm run dev:live` with an API key.',
    });
  }
}

function emitFrame(frame: string, on: TurnHandlers): void {
  const event = frame.match(/^event: (.+)$/m)?.[1];
  const raw = frame.match(/^data: (.+)$/m)?.[1];
  if (!event || !raw) return;
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }
  if (event === 'meta') on.onMeta({ turn: data.turn, emotion: coerceEmotion(data.emotion) });
  else if (event === 'token') on.onToken(String(data.text ?? ''));
  else if (event === 'done')
    on.onDone({ reply: data.reply, emotion: coerceEmotion(data.emotion), finalTurn: !!data.finalTurn });
  else if (event === 'error') on.onError({ code: data.code ?? 'ERROR', message: data.message ?? 'Something went wrong.' });
}

async function toError(res: Response): Promise<{ code: string; message: string }> {
  try {
    const body = await res.json();
    if (body?.error) return body.error;
  } catch {
    /* fall through */
  }
  if (res.status === 402) return { code: 'SPEND_CAP_REACHED', message: 'Live demo paused — try “Watch a sample”.' };
  if (res.status === 429) return { code: 'RATE_LIMITED', message: 'A bit fast — give it a moment, or try “Watch a sample”.' };
  return { code: 'NETWORK', message: 'The live backend isn’t reachable. Use “Watch a sample”, or run `npm run dev:live` with an API key.' };
}

// ─────────────────────────── REPLAY mode (no network) ───────────────────────────
// Fakes the token stream with a typewriter so the SAME components render it.
const TYPE_MS = 28;

// Returns a cancel function that stops the typewriter — so a reset or a new
// scenario can kill an in-flight replay before its onDone fires a stray line
// into the next conversation's state.
export function replayTurn(
  exchange: SampleExchange,
  turn: number,
  finalTurn: boolean,
  on: TurnHandlers,
): () => void {
  on.onMeta({ turn, emotion: exchange.emotion });
  const tokens = exchange.reply.split(/(\s+)/).filter(Boolean);
  let i = 0;
  const id = setInterval(() => {
    if (i >= tokens.length) {
      clearInterval(id);
      on.onDone({ reply: exchange.reply, emotion: exchange.emotion, finalTurn });
      return;
    }
    on.onToken(tokens[i++]);
  }, TYPE_MS);
  return () => clearInterval(id);
}

export async function loadSample(id: string): Promise<Sample> {
  const res = await fetch(`/samples/${id}.json`);
  if (!res.ok) throw new Error(`Sample not found: ${id}`);
  const sample: Sample = await res.json();
  sample.feedback = coerceFeedback(sample.feedback);
  return sample;
}
