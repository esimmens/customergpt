// The single source of truth for emotions on the client. The server keeps its
// own copy in api/_shared/emotions.ts (separate bundle), validated identically.
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

// Never trust a raw model/string value — coerce to a known enum, default NEUTRAL.
export function coerceEmotion(value: unknown): Emotion {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if ((EMOTIONS as readonly string[]).includes(upper)) return upper as Emotion;
  }
  return DEFAULT_EMOTION;
}

// Maps an emotion to its character art in /public/characters. Drop your exported
// Storyline poses there (interest.png, skepticism.png, …, neutral.png).
export function emotionImage(emotion: Emotion): string {
  return `/characters/${emotion.toLowerCase()}.png`;
}
