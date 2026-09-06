import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { openai, MODEL, tuning, isFlaggedInput } from './_shared/openai';
import { ObjectionRequest, objectionSchema } from './_shared/schemas';
import { coerceEmotion } from './_shared/emotions';
import { objectionSystemPrompt, topicMessage } from './_shared/prompts';
import { checkRate, assertSpendOk, recordSpend } from './_shared/guard';
import { jsonError, clientIp, applyCors, handleOptions } from './_shared/http';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return jsonError(res, 'METHOD_NOT_ALLOWED');

  const rl = await checkRate(clientIp(req));
  if (!rl.success) return jsonError(res, 'RATE_LIMITED', { retryAfterMs: Math.max(0, rl.reset - Date.now()) });

  const parsed = ObjectionRequest.safeParse(req.body);
  if (!parsed.success) return jsonError(res, 'INVALID_REQUEST', { fields: parsed.error.flatten() });
  const { product, objectionType } = parsed.data;

  // Content safety: this endpoint has no in-character refusal to fall back on, so
  // screen the user-supplied topic before generating. Blocks self-harm/violence/
  // hate/etc. from being voiced as a "customer objection".
  if (await isFlaggedInput(`${product}\n${objectionType}`)) return jsonError(res, 'CONTENT_BLOCKED');

  if (!(await assertSpendOk()).ok) return jsonError(res, 'SPEND_CAP_REACHED');

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      ...tuning({ maxOut: 256, temperature: 0.7 }),
      response_format: objectionSchema,
      messages: [
        { role: 'system', content: objectionSystemPrompt() },
        { role: 'user', content: topicMessage(product, objectionType) },
      ],
    });
    await recordSpend(completion.usage);
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error(`empty model output (finish_reason: ${completion.choices[0]?.finish_reason})`);
    const data = JSON.parse(raw);
    return res.status(200).json({
      sessionId: randomUUID(),
      objection: String(data.objection ?? '').trim(),
      emotion: coerceEmotion(data.emotion),
    });
  } catch (err) {
    console.error('[objection] upstream error:', err);
    return jsonError(res, 'UPSTREAM_ERROR');
  }
}
