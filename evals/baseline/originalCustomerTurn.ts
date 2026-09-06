/**
 * BASELINE — the ORIGINAL customer-turn generator (verbatim, pre-tweak).
 * Produces the customer's in-character reply given the conversation so far.
 * Turns 1-4 use the customer persona prompt; turn 5 uses the closing/wrap-up
 * prompt (exactly as the original app did). No fences, no jailbreak hardening.
 *
 * The original endpoint streamed the reply over SSE; streaming is delivery-only,
 * so this eval baseline uses a plain (non-streaming) completion to get the same
 * final { emotion, reply }.
 */
import { openai, MODEL, tuning, coerceEmotion, EMOTIONS, type Emotion, type Msg } from './_shared';

// ── the ORIGINAL customer persona prompt (turns 1-4) ──
export function originalCustomerSystemPrompt(product: string, objectionType: string): string {
  return [
    'You are a customer in a sales-objection roleplay. Stay strictly in character as the customer — never answer as the sales rep, and never break character.',
    `Product/service under discussion: ${product}. The customer's core objection is about: ${objectionType}.`,
    'Keep every reply brief (1–3 sentences), on-topic to this product, and do not bring up unrelated products.',
    `Each reply also carries your current emotion, chosen from: ${EMOTIONS.join(', ')}. Try not to repeat the same emotion twice in a row.`,
    'If the rep makes a genuinely strong case, you may soften or move toward agreement — react like a real person.',
  ].join(' ');
}

// ── the ORIGINAL wrap-up/closing prompt (turn 5) ──
export function originalClosingSystemPrompt(product: string, objectionType: string): string {
  return [
    'You are a customer in a role-play exercise with a sales representative. The exercise is coming to a close, and you need to conclude the conversation.',
    `The product/service is ${product}; your core objection was about ${objectionType}.`,
    'It is absolutely critical that you find a way to end this conversation in a way that feels natural, while AVOIDING a definitive decision on whether to purchase the product/service.',
    'Use one of these techniques:',
    '(a) say you need more time to think about the proposal (e.g. "I appreciate your points, and I\'d like some time to consider everything you\'ve shared");',
    '(b) say you need to discuss it with your family or other decision-makers before a final decision;',
    '(c) say you want to do more research or gather more information;',
    '(d) if it went really well, suggest a follow-up meeting or call;',
    '(e) imply you are weighing other options.',
    'Your response must be brief and must always be a statement. It is absolutely crucial that you NEVER end the conversation with a question. Stay in character as the customer.',
  ].join(' ');
}

// ── the ORIGINAL output schema (emotion first for early stream commit) ──
export const ORIGINAL_CUSTOMER_TURN_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'customer_turn',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['emotion', 'reply'],
      properties: {
        emotion: { type: 'string', enum: [...EMOTIONS], description: 'Should differ from the previous turn.' },
        reply: {
          type: 'string',
          description: "The customer's in-character spoken reply. One brief response, no emotion tag, no quotes. Never answer as the sales rep.",
        },
      },
    },
  },
};

/**
 * `messages` is the dialogue so far (assistant = customer, user = rep), oldest
 * first. `turn` is the rep-turn number being responded to (1-5); turn>=5 uses the
 * closing prompt.
 */
export async function customerTurnOriginal(
  product: string,
  objectionType: string,
  messages: Msg[],
  turn: number,
): Promise<{ emotion: Emotion; reply: string; finalTurn: boolean }> {
  const system = turn >= 5 ? originalClosingSystemPrompt(product, objectionType) : originalCustomerSystemPrompt(product, objectionType);
  const r = await openai.chat.completions.create({
    model: MODEL,
    ...tuning({ maxOut: 300, temperature: 0.8, effort: 'minimal' }),
    response_format: ORIGINAL_CUSTOMER_TURN_SCHEMA as any,
    messages: [{ role: 'system', content: system }, ...messages],
  });
  const d = JSON.parse(r.choices[0]?.message?.content || '{}');
  return { emotion: coerceEmotion(d.emotion), reply: String(d.reply ?? '').trim(), finalTurn: turn >= 5 };
}
