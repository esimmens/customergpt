import { z } from 'zod';
import { EMOTIONS } from './emotions.js';

// ── Input validation (Zod) — the INPUT contract ──
// .trim() runs before .min(1) so whitespace-only input is rejected (it otherwise
// passed and billed an upstream call). .strict() rejects unknown keys instead of
// silently stripping them. The client never sends a `system` role — the server
// owns the system prompt — so accepting one would only let a learner smuggle
// instructions into the model; the role enum is restricted to user/assistant.
const Text = (max: number) => z.string().trim().min(1).max(max);

export const ObjectionRequest = z
  .object({
    product: Text(100),
    objectionType: Text(100),
  })
  .strict();

const Message = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: Text(2000),
  })
  .strict();

export const TurnRequest = z
  .object({
    sessionId: z.string().uuid(),
    product: Text(100),
    objectionType: Text(100),
    messages: z.array(Message).min(1).max(12),
    turn: z.number().int().min(1).max(5),
  })
  .strict();

export const FeedbackRequest = z
  .object({
    sessionId: z.string().uuid(),
    product: Text(100),
    objectionType: Text(100),
    messages: z.array(Message).min(1).max(12),
  })
  .strict();

// ── Output contracts (OpenAI Structured Outputs, strict json_schema) ──
// These replace the legacy in-band @ ~ ^ | delimiter scraping entirely.
export const objectionSchema = {
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

// emotion is property #1 so strict-mode ordering commits it early in the stream.
export const customerTurnSchema = {
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

export const feedbackSchema = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'feedback',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['performance', 'key_strengths', 'areas_to_improve', 'scores', 'total'],
      properties: {
        performance: { type: 'string', description: "'Your Performance' panel. 2–3 sentences, second person, formative and encouraging, tied to the specific objection." },
        key_strengths: { type: 'string', description: "'Key Strengths' panel. 2–3 sentences, concrete things the rep did well." },
        areas_to_improve: { type: 'string', description: "'Areas To Improve' panel. 1–2 sentences, specific and actionable, tied to the objection." },
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
        total: { type: 'integer', minimum: 0, maximum: 100, description: 'Sum of the four sub-scores. The client recomputes this as a guard.' },
      },
    },
  },
};
