// Server copy of the emotion enum — the single source of truth for validation.
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
