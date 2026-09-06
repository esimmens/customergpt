import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { EMOTIONS } from '../src/lib/emotions';
import { SAMPLES } from '../src/data/sampleIndex';
import type { Sample } from '../src/lib/types';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'public', 'samples');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe('replay sample fixtures', () => {
  it('every sample in the registry has a matching JSON file', () => {
    for (const meta of SAMPLES) expect(files).toContain(`${meta.id}.json`);
  });

  it.each(files)('%s is well-formed', (file) => {
    const s: Sample = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    expect(s.exchanges.length).toBeGreaterThan(0);
    expect(s.exchanges.length).toBeLessThanOrEqual(5);
    expect((EMOTIONS as readonly string[]).includes(s.openingEmotion)).toBe(true);
    for (const ex of s.exchanges) {
      expect((EMOTIONS as readonly string[]).includes(ex.emotion)).toBe(true);
      expect(ex.reply.trim().length).toBeGreaterThan(0);
    }
    const { scores, total } = s.feedback;
    expect(scores.product_knowledge + scores.customer_understanding + scores.objection_handling + scores.communication).toBe(total);
  });
});
