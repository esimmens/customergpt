/**
 * BASELINE — the ORIGINAL opening-objection generator (verbatim, pre-tweak).
 * Generates the customer's first objection for a scenario. No input fences, no
 * content-safety moderation — this is the un-hardened original.
 */
import { openai, MODEL, tuning, coerceEmotion, EMOTIONS, type Emotion } from './_shared';

// ── the ORIGINAL system prompt ──
export function originalObjectionSystemPrompt(product: string, objectionType: string): string {
  return [
    'You are a realistic prospective customer in a sales-training simulation.',
    `A sales rep is trying to sell you: ${product}.`,
    `Voice a single opening objection of the type: "${objectionType}".`,
    'Make it ~2 sentences, first person, and highly personalized to the product so a bystander would immediately know what it refers to. Use natural customer language.',
    'Also pick your current emotion from the allowed list.',
  ].join(' ');
}

// ── the ORIGINAL output schema ──
export const ORIGINAL_OBJECTION_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'objection_gen',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['emotion', 'objection'],
      properties: {
        emotion: { type: 'string', enum: [...EMOTIONS] },
        objection: {
          type: 'string',
          description:
            "The customer's opening objection, ~2 sentences, first person, highly personalized to the product so a bystander would know what it refers to. No quotes, no emotion tag, no preamble.",
        },
      },
    },
  },
};

export async function generateObjectionOriginal(
  product: string,
  objectionType: string,
): Promise<{ emotion: Emotion; objection: string }> {
  const r = await openai.chat.completions.create({
    model: MODEL,
    ...tuning({ maxOut: 256, temperature: 0.7 }),
    response_format: ORIGINAL_OBJECTION_SCHEMA as any,
    messages: [{ role: 'system', content: originalObjectionSystemPrompt(product, objectionType) }],
  });
  const d = JSON.parse(r.choices[0]?.message?.content || '{}');
  return { emotion: coerceEmotion(d.emotion), objection: String(d.objection ?? '').trim() };
}
