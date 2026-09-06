import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jsonError } from './_shared/http';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Match the other routes' method contract instead of answering any verb.
  if (req.method !== 'GET') return jsonError(res, 'METHOD_NOT_ALLOWED');
  res.status(200).json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY });
}
