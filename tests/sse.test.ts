import { describe, it, expect } from 'vitest';
import { decodeReply } from '../api/_shared/sse';

// The customer-turn endpoint streams a JSON object and incrementally decodes the
// "reply" string for the token stream. These lock in correct escape handling so a
// reply with accents/emoji/control chars doesn't surface as mojibake mid-stream.

describe('decodeReply', () => {
  it('decodes a complete reply and reports closed', () => {
    expect(decodeReply('{"emotion":"NEUTRAL","reply":"hello there"}')).toEqual({ text: 'hello there', closed: true });
  });

  it('streams a partial reply (not yet closed)', () => {
    expect(decodeReply('{"emotion":"NEUTRAL","reply":"hel')).toEqual({ text: 'hel', closed: false });
  });

  it('returns empty before the reply key appears', () => {
    expect(decodeReply('{"emotion":"NEU').text).toBe('');
  });

  it('decodes \\uXXXX escapes (the mojibake fix)', () => {
    expect(decodeReply('{"reply":"caf\\u00e9"}')).toEqual({ text: 'café', closed: true });
    expect(decodeReply('{"reply":"\\u201cpremium\\u201d"}').text).toBe('“premium”');
  });

  it('decodes surrogate pairs (emoji) by concatenating halves', () => {
    expect(decodeReply('{"reply":"hi \\ud83d\\ude00"}').text).toBe('hi 😀');
  });

  it('decodes \\b \\f \\n \\t and escaped quotes/backslashes', () => {
    expect(decodeReply('{"reply":"a\\nb\\tc\\"d\\\\e"}').text).toBe('a\nb\tc"d\\e');
    expect(decodeReply('{"reply":"x\\by\\fz"}').text).toBe('x\by\fz');
  });

  it('waits when an escape or \\u sequence is split across chunks', () => {
    // backslash is the last char so far — must not emit a stray char
    expect(decodeReply('{"reply":"caf\\').text).toBe('caf');
    // \u with only 2 of 4 hex digits — wait for the rest
    expect(decodeReply('{"reply":"caf\\u00').text).toBe('caf');
  });
});
