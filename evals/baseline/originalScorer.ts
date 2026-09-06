/**
 * BASELINE — the ORIGINAL feedback scorer, exactly as it was BEFORE any of the
 * scoring-quality work (product-specificity, strict calibration, BARS rubric) or
 * the security hardening (input fences, untrusted-data rules, thin-transcript gate,
 * language mirroring). The pre-tweak system-under-test for practicing LLM-output
 * evaluation. Frozen and self-contained (see ./_shared).
 */
import { openai, MODEL, tuning, clamp, type Msg } from './_shared';

export type { Msg };
export interface Feedback {
  performance: string;
  key_strengths: string;
  areas_to_improve: string;
  scores: { product_knowledge: number; customer_understanding: number; objection_handling: number; communication: number };
  total: number;
}

// ── the ORIGINAL system prompt (verbatim, pre-tweak) ──
export function originalFeedbackSystemPrompt(product: string, objectionType: string): string {
  return [
    'You are a supportive sales-enablement coach giving FORMATIVE feedback to a rep after an objection-handling roleplay.',
    `Product/service: ${product}. Objection topic: ${objectionType}.`,
    'The goal is to help the rep see what they did well and what to improve — this is coaching, not a graded exam.',
    'Tie every comment specifically to handling THIS objection. Be concrete and encouraging.',
    'Score with this rubric (the weights are a deliberate design choice): Product Knowledge /30, Customer Understanding /25, Objection Handling /25, Communication /20.',
    'The total is an intentionally rough read meant to prompt reflection, not a precise grade.',
  ].join(' ');
}

// ── the ORIGINAL transcript rendering + user message ──
export function renderTranscript(messages: Msg[]): string {
  return messages.map((m) => `${m.role === 'assistant' ? 'Customer' : 'Rep'}: ${m.content}`).join('\n');
}
export function originalUserMessage(messages: Msg[]): string {
  return `Here is the roleplay transcript to assess:\n\n${renderTranscript(messages)}`;
}

// ── the ORIGINAL output contract (OpenAI strict json_schema) ──
export const ORIGINAL_FEEDBACK_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'feedback',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['performance', 'key_strengths', 'areas_to_improve', 'scores', 'total'],
      properties: {
        performance: { type: 'string' },
        key_strengths: { type: 'string' },
        areas_to_improve: { type: 'string' },
        scores: {
          type: 'object',
          additionalProperties: false,
          required: ['product_knowledge', 'customer_understanding', 'objection_handling', 'communication'],
          properties: {
            product_knowledge: { type: 'integer', minimum: 0, maximum: 30 },
            customer_understanding: { type: 'integer', minimum: 0, maximum: 25 },
            objection_handling: { type: 'integer', minimum: 0, maximum: 25 },
            communication: { type: 'integer', minimum: 0, maximum: 20 },
          },
        },
        total: { type: 'integer', minimum: 0, maximum: 100 },
      },
    },
  },
};

// ── run the ORIGINAL scorer end-to-end (clamps sub-scores + recomputes total, as
//    the original app did in coerceFeedback) ──
export async function scoreOriginal(product: string, objectionType: string, messages: Msg[]): Promise<Feedback> {
  const r = await openai.chat.completions.create({
    model: MODEL,
    ...tuning({ maxOut: 900, temperature: 0.4, effort: 'minimal' }),
    response_format: ORIGINAL_FEEDBACK_SCHEMA as any,
    messages: [
      { role: 'system', content: originalFeedbackSystemPrompt(product, objectionType) },
      { role: 'user', content: originalUserMessage(messages) },
    ],
  });
  const f = JSON.parse(r.choices[0]?.message?.content || '{}');
  const scores = {
    product_knowledge: clamp(f.scores?.product_knowledge, 30),
    customer_understanding: clamp(f.scores?.customer_understanding, 25),
    objection_handling: clamp(f.scores?.objection_handling, 25),
    communication: clamp(f.scores?.communication, 20),
  };
  return {
    performance: String(f.performance ?? ''),
    key_strengths: String(f.key_strengths ?? ''),
    areas_to_improve: String(f.areas_to_improve ?? ''),
    scores,
    total: scores.product_knowledge + scores.customer_understanding + scores.objection_handling + scores.communication,
  };
}
