import type { VercelRequest, VercelResponse } from '@vercel/node';

// Uniform error envelope the frontend's toError() understands.
const STATUS: Record<string, number> = {
  METHOD_NOT_ALLOWED: 405,
  INVALID_REQUEST: 400,
  CONTENT_BLOCKED: 400,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  UPSTREAM_TIMEOUT: 504,
};

export function jsonError(res: VercelResponse, code: string, extra: Record<string, unknown> = {}) {
  const status = STATUS[code] ?? 500;
  const retryable = code === 'RATE_LIMITED' || code === 'UPSTREAM_ERROR' || code === 'UPSTREAM_TIMEOUT';
  return res.status(status).json({ error: { code, message: messageFor(code), retryable, ...extra } });
}

export function messageFor(code: string): string {
  switch (code) {
    case 'METHOD_NOT_ALLOWED': return 'Use POST for this endpoint.';
    case 'INVALID_REQUEST': return 'That request was malformed.';
    case 'CONTENT_BLOCKED': return 'That topic can’t be used for a roleplay. Try a product and an everyday sales objection.';
    case 'RATE_LIMITED': return 'A bit fast — try again in a moment.';
    case 'UPSTREAM_TIMEOUT': return 'The API took too long to respond. Try again.';
    case 'UPSTREAM_ERROR': return 'There was a problem with the API. Try again.';
    default: return 'Something went wrong.';
  }
}

const pick = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? '';

// The rate-limit key. The leftmost X-Forwarded-For hop is CLIENT-CONTROLLED and
// trivially forged/prepended, so a single attacker can mint unlimited buckets by
// rotating it. Behind Vercel, `x-real-ip` / `x-vercel-forwarded-for` are set by
// the platform and are the trustworthy client identity. We prefer those; only if
// neither exists do we fall back to XFF, and then to the LAST hop (set by our own
// proxy) rather than the spoofable first one. Pair with the global cap in guard.ts
// so even a forged key can't exceed the aggregate ceiling.
export function clientIp(req: VercelRequest): string {
  const realIp = pick(req.headers['x-real-ip']).trim();
  if (realIp) return realIp;
  const vercel = pick(req.headers['x-vercel-forwarded-for']).split(',')[0].trim();
  if (vercel) return vercel;
  const hops = pick(req.headers['x-forwarded-for']).split(',').map((s) => s.trim()).filter(Boolean);
  if (hops.length) return hops[hops.length - 1];
  return req.socket?.remoteAddress || 'unknown';
}

const ALLOWED = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',');
export function applyCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method !== 'OPTIONS') return false;
  applyCors(req, res);
  res.status(204).end();
  return true;
}
