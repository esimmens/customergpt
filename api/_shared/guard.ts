// Two independent demo-protection layers: a per-IP rate limit and a hard monthly
// USD spend cap. Both degrade gracefully when Upstash isn't configured (local dev):
// the rate limiter falls back to an in-memory bucket, and the spend cap relies on
// the OpenAI dashboard budget. Set UPSTASH_* in production for a durable cap.

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
// global bucket is the real backstop in front of the monthly spend cap.
const GLOBAL_MAX = Number(process.env.GLOBAL_RPM ?? '240');

export async function checkRate(ip: string) {
  const rl = await getLimiter();
  const perIp = rl ? await rl.limit(ip) : memLimit(ip, 20);
  if (!perIp.success) return perIp;
  const global = memLimit('__global__', GLOBAL_MAX);
  return global.success ? perIp : { success: false, reset: global.reset };
}

// Rough monthly spend counter. Increment by estimated USD after each call; check
// before each call. Uses Redis if present, else a process-local number.
let memSpend = 0;

// `??` only falls back on undefined/null — NOT on an empty string. A dashboard
// env var that exists but is blank yields Number('') === 0, which caps spend at
// $0 and bricks live mode with a misleading "out of budget" error before a single
// cent is spent. Parse defensively: anything non-finite or <= 0 uses the default.
export function resolveCap(raw: string | undefined, fallback = 5): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
const CAP = resolveCap(process.env.MONTHLY_USD_CAP);

// Approx prices ($/1M tokens), keyed by model prefix. completion_tokens already
// includes a reasoning model's hidden reasoning tokens, and those bill at the
// output rate — so estimateUsd() counts them correctly via completion_tokens.
// Verify current numbers at https://openai.com/api/pricing/.
const PRICES: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-5-nano': { in: 0.05, out: 0.4 },
  'gpt-5-mini': { in: 0.25, out: 2 },
  // gpt-5.6 line (Sol/Terra/Luna replaced the mini tier). These MUST be listed
  // explicitly: prefix matching would otherwise resolve 'gpt-5.6-luna' to the
  // 'gpt-5' flagship row and overestimate spend ~7x, tripping the cap early.
  'gpt-5.6-luna': { in: 0.2, out: 1.2 },
  'gpt-5.6-terra': { in: 2, out: 12 },
  'gpt-5.6-sol': { in: 5, out: 30 },
  'gpt-5': { in: 1.25, out: 10 },
};
// Longest matching prefix wins, so 'gpt-5-mini' beats 'gpt-5'.
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const matched =
  Object.keys(PRICES).sort((a, b) => b.length - a.length).find((k) => MODEL.startsWith(k)) ?? 'gpt-4o-mini';
const PRICE_IN = PRICES[matched].in / 1_000_000;
const PRICE_OUT = PRICES[matched].out / 1_000_000;
export function estimateUsd(usage?: { prompt_tokens?: number; completion_tokens?: number }) {
  if (!usage) return 0;
  return (usage.prompt_tokens ?? 0) * PRICE_IN + (usage.completion_tokens ?? 0) * PRICE_OUT;
}

export async function assertSpendOk(): Promise<{ ok: boolean }> {
  if (!HAS_REDIS) return { ok: memSpend < CAP };
  const { Redis } = await import('@upstash/redis');
  const redis = Redis.fromEnv();
  const key = `cgpt:spend:${new Date().toISOString().slice(0, 7)}`;
  const spent = Number((await redis.get<number>(key)) ?? 0);
  return { ok: spent < CAP };
}

export async function recordSpend(usage?: { prompt_tokens?: number; completion_tokens?: number }) {
  const usd = estimateUsd(usage);
  if (!HAS_REDIS) {
    memSpend += usd;
    return;
  }
  const { Redis } = await import('@upstash/redis');
  const redis = Redis.fromEnv();
  const key = `cgpt:spend:${new Date().toISOString().slice(0, 7)}`;
  await redis.incrbyfloat(key, usd);
}
