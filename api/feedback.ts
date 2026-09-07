import type { VercelRequest, VercelResponse } from '@vercel/node';
import { openai, MODEL, tuning } from './_shared/openai.js';
import { FeedbackRequest, feedbackSchema } from './_shared/schemas.js';
import { feedbackSystemPrompt, fenced } from './_shared/prompts.js';
import { checkRate } from './_shared/guard.js';
import { jsonError, clientIp, applyCors, handleOptions } from './_shared/http.js';

export const config = { runtime: 'nodejs' };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n || 0)));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return jsonError(res, 'METHOD_NOT_ALLOWED');

  const rl = await checkRate(clientIp(req));
  if (!rl.success) return jsonError(res, 'RATE_LIMITED', { retryAfterMs: Math.max(0, rl.reset - Date.now()) });

  const parsed = FeedbackRequest.safeParse(req.body);
  if (!parsed.success) return jsonError(res, 'INVALID_REQUEST', { fields: parsed.error.flatten() });
  const { product, objectionType, messages } = parsed.data;

  // Scoring integrity: if the rep barely said anything, don't let the model
  // hallucinate strengths and hand out an inflated score (testers got 70+ for a
  // single period). Short-circuit to an honest low score — also saves a call.
  const repText = messages.filter((m) => m.role === 'user').map((m) => m.content).join(' ').replace(/\s+/g, ' ').trim();
  if (repText.length < 20) return res.status(200).json(thinTranscriptFeedback());

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      ...tuning({ maxOut: 900, effort: 'low' }),
      response_format: feedbackSchema,
      messages: [
        { role: 'system', content: feedbackSystemPrompt(product, objectionType) },
        { role: 'user', content: `Assess this roleplay transcript:\n\n${fenced('TRANSCRIPT', transcript(messages))}` },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error(`empty model output (finish_reason: ${completion.choices[0]?.finish_reason})`);
    const f = JSON.parse(raw);
    const scores = {
      product_knowledge: clamp(f.scores?.product_knowledge, 0, 30),
      customer_understanding: clamp(f.scores?.customer_understanding, 0, 25),
      objection_handling: clamp(f.scores?.objection_handling, 0, 25),
      communication: clamp(f.scores?.communication, 0, 20),
    };
    const total = scores.product_knowledge + scores.customer_understanding + scores.objection_handling + scores.communication;
    return res.status(200).json({
      performance: String(f.performance ?? ''),
      key_strengths: String(f.key_strengths ?? ''),
      areas_to_improve: String(f.areas_to_improve ?? ''),
      scores,
      total,
    });
  } catch (err) {
    console.error('[feedback] upstream error:', err);
    return jsonError(res, 'UPSTREAM_ERROR');
  }
}

// Returned when the rep contributed too little to assess — honest, low, and
// encouraging, with the same shape the client expects (total = sum of scores).
function thinTranscriptFeedback() {
  const scores = { product_knowledge: 4, customer_understanding: 3, objection_handling: 3, communication: 3 };
  return {
    performance:
      "There wasn't enough from you in this conversation to assess your objection-handling. Give it another go and really engage with the customer's concern.",
    key_strengths: 'You started the exercise — that’s the first step. Next time, respond to the objection in your own words.',
    areas_to_improve:
      'Acknowledge the objection, ask a clarifying question, and make a specific case for the product across a few turns so there’s something to coach on.',
    scores,
    total: scores.product_knowledge + scores.customer_understanding + scores.objection_handling + scores.communication,
  };
}

function transcript(messages: { role: string; content: string }[]): string {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'assistant' ? 'Customer' : 'Rep'}: ${m.content}`)
    .join('\n');
}
