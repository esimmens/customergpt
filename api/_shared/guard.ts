// Abuse protection: a per-IP rate limit plus a global ceiling. Degrades gracefully
// when Upstash isn't configured (local dev) by falling back to an in-memory bucket.
// Set UPSTASH_* in production for a limit that survives cold starts.
//
// Cost is NOT capped here — the hard limit lives in the OpenAI dashboard, which is
// authoritative and cannot drift from real billing the way a local estimate would.

let ratelimit: { limit: (key: string) => Promise<{ success: boolean; reset: number }> } | null = null;

const HAS_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

async function getLimiter() {
  if (!HAS_REDIS) return null;
  if (ratelimit) return ratelimit;
  const { Ratelimit } = await import('@upstash/ratelimit');
  const { Redis } = await import('@upstash/redis');
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(20, '60 s'),
    prefix: 'cgpt',
  });
  return ratelimit;
}

// In-memory fallback (per serverless instance — best-effort only).
const buckets = new Map<string, { count: number; reset: number }>();
function memLimit(key: string, max: number, windowMs = 60_000) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { success: true, reset: now + windowMs };
  }
  b.count += 1;
  return { success: b.count <= max, reset: b.reset };
}

// Aggregate ceiling across ALL callers in a window. The per-IP limit is only a
// courtesy throttle — the client IP is ultimately forgeable (see http.ts), so a
// single attacker rotating it could otherwise get unlimited throughput. This
// global bucket is what actually bounds total throughput against the API.
const GLOBAL_MAX = Number(process.env.GLOBAL_RPM ?? '240');

export async function checkRate(ip: string) {
  const rl = await getLimiter();
  const perIp = rl ? await rl.limit(ip) : memLimit(ip, 20);
  if (!perIp.success) return perIp;
  const global = memLimit('__global__', GLOBAL_MAX);
  return global.success ? perIp : { success: false, reset: global.reset };
}
