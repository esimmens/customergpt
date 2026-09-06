import { describe, it, expect } from 'vitest';
import { coerceFeedback } from '../src/lib/api';
import type { Feedback } from '../src/lib/types';

const base: Feedback = {
  performance: 'p',
  key_strengths: 's',
  areas_to_improve: 'a',
  scores: { product_knowledge: 22, customer_understanding: 20, objection_handling: 19, communication: 15 },
  total: 999, // deliberately wrong
};

describe('coerceFeedback', () => {
  it('recomputes total from sub-scores, ignoring model arithmetic drift', () => {
    expect(coerceFeedback(base).total).toBe(76);
  });

  it('clamps each sub-score to its rubric maximum', () => {
    const out = coerceFeedback({
      ...base,
      scores: { product_knowledge: 999, customer_understanding: -5, objection_handling: 25, communication: 40 },
    });
    expect(out.scores).toEqual({
      product_knowledge: 30,
      customer_understanding: 0,
      objection_handling: 25,
      communication: 20,
    });
    expect(out.total).toBe(75);
  });
});
