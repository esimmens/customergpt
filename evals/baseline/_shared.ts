/**
 * Shared, frozen infrastructure for the ORIGINAL-prompt baseline modules.
 * Self-contained: imports nothing from the live `api/` code, so production changes
 * can't leak into the baseline. Mirrors the original app's OpenAI setup, `tuning()`
 * helper, and emotion enum exactly.
 */
import { readFileSync } from 'node:fs';
import OpenAI from 'openai';

// Load OPENAI_API_KEY / OPENAI_MODEL from .env.local (harmless if already set).
try {
  for (const line of readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  /* env provided some other way */
}

export const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const isReasoning = /^(o\d|gpt-5)/.test(MODEL);
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// The original `tuning()` helper (one knob, two model families).
// NOTE: `reasoning_effort` is infrastructure, not prompt content — the frozen
// ORIGINAL prompts are untouched. It defaults to 'low' because that is the only
// value the whole gpt-5 line accepts (gpt-5-mini rejects 'none'; gpt-5.6-* reject
// 'minimal'), so the baseline keeps running as you change OPENAI_MODEL.
export function tuning(opts: {
  maxOut: number;
  temperature?: number;
  effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}) {
  return isReasoning
    ? { max_completion_tokens: opts.maxOut + 2500, reasoning_effort: opts.effort ?? 'low' }
    : { max_tokens: opts.maxOut, temperature: opts.temperature ?? 0.7 };
}

// Frozen copy of the original emotion enum + coercion.
export const EMOTIONS = [
  'INTEREST',
  'CONFUSION',
  'SKEPTICISM',
  'IMPATIENCE',
  'FRUSTRATION',
  'CONCERN',
  'EXCITEMENT',
  'NEUTRAL',
] as const;
export type Emotion = (typeof EMOTIONS)[number];
export const DEFAULT_EMOTION: Emotion = 'NEUTRAL';
export function coerceEmotion(value: unknown): Emotion {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if ((EMOTIONS as readonly string[]).includes(upper)) return upper as Emotion;
  }
  return DEFAULT_EMOTION;
}

export const clamp = (n: number, hi: number) => Math.max(0, Math.min(hi, Math.round(Number(n) || 0)));
export type Msg = { role: 'user' | 'assistant'; content: string };
