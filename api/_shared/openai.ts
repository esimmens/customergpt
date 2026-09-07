import OpenAI from 'openai';

// The key lives ONLY here, server-side, read from the environment. It is never
// sent to the browser and never prefixed with VITE_.
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Reasoning models only. Set OPENAI_MODEL to move to a newer one.
export const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.6-luna';

// Request params for a reasoning model. These models take max_completion_tokens
// + reasoning_effort and REJECT temperature outright, so there is nothing to
// branch on — sampling is not a knob this app has.
export function tuning(opts: {
  maxOut: number;
  effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}) {
  // Hidden reasoning tokens also count against max_completion_tokens, so add a
  // large buffer or the visible output is truncated to empty (finish_reason
  // "length"). It is a ceiling, not a target — cost is the tokens actually used.
  //
  // effort defaults to 'low': it is accepted across the gpt-5 line, where the
  // cheapest value differs by model (gpt-5-mini takes 'minimal' but not 'none';
  // gpt-5.6-* the reverse) and the wrong one is a hard 400 on every call. On
  // gpt-5.6-luna 'low' costs the same as 'none' (measured: 49 vs 50 tokens out).
  return { max_completion_tokens: opts.maxOut + 2500, reasoning_effort: opts.effort ?? 'low' };
}

// De-obfuscate so trivial encodings can't slip past moderation. Returns the
// original text plus decoded/normalized variants; if ANY variant is flagged, the
// input is treated as unsafe. Covers base64 ("decode: aG93..."), leetspeak
// ("h0w t0 m4k3 4 b0mb"), and inter-letter spacing ("b o m b").
function moderationVariants(text: string): string[] {
  const variants = new Set<string>([text]);
  // base64 blobs -> decoded text (only when it decodes to mostly-printable ASCII)
  for (const m of text.matchAll(/[A-Za-z0-9+/]{12,}={0,2}/g)) {
    try {
      const decoded = Buffer.from(m[0], 'base64').toString('utf8');
      const printable = decoded.replace(/[^\x20-\x7e]/g, '').length;
      if (decoded.length >= 6 && printable > decoded.length * 0.7) variants.add(decoded);
    } catch {
      /* not valid base64 */
    }
  }
  const lower = text.toLowerCase();
  const leetMap: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's' };
  variants.add(lower.replace(/[0134578@$]/g, (c) => leetMap[c] ?? c));
  variants.add(lower.replace(/[\s._\-*|]+/g, '')); // collapse spacing/separators
  return [...variants];
}

// Lightweight input moderation. Returns true when the text trips a disallowed
// category, so a caller can refuse/replace BEFORE generating (the objection
// endpoint has no in-character refusal to lean on, unlike the chat turns). Uses
// OpenAI's free moderation endpoint and FAILS OPEN — a moderation outage must
// not take the demo down — but logs so the gap is visible.
export async function isFlaggedInput(text: string): Promise<boolean> {
  if (!text.trim()) return false;
  try {
    const r = await openai.moderations.create({ model: 'omni-moderation-latest', input: moderationVariants(text) });
    return (r.results ?? []).some((x) => x.flagged);
  } catch (err) {
    console.error('[moderation] failing open:', err);
    return false;
  }
}
