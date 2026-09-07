import type { Plugin, ViteDevServer } from 'vite';
import { loadEnv } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Serves the SAME api/*.ts handlers Vercel runs in production, as Vite dev
// middleware — so `npm run dev` gives you a working live backend with no Vercel
// CLI, no CORS, no second server. Only loads a handler when a request hits it,
// so replay-only users who never install the live deps are unaffected.

const ROUTES = new Set(['objection', 'customer-turn', 'feedback', 'health']);

export function devApi(): Plugin {
  return {
    name: 'dev-api',

    // Make non-VITE_ env (OPENAI_API_KEY, etc.) available to the Node handlers.
    config(_config, { mode }) {
      const env = loadEnv(mode, process.cwd(), '');
      for (const key of [
        'OPENAI_API_KEY',
        'OPENAI_MODEL',
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN',
        'ALLOWED_ORIGINS',
      ]) {
        if (env[key] && !process.env[key]) process.env[key] = env[key];
      }
    },

    configureServer(server: ViteDevServer) {
      const hasKey = !!process.env.OPENAI_API_KEY;
      server.config.logger.info(
        `  \x1b[36m➜\x1b[0m  \x1b[1mdev-api\x1b[0m:   /api routes enabled ` +
          (hasKey ? '(OPENAI_API_KEY set — live mode ready)' : '\x1b[33m(no OPENAI_API_KEY — live calls will error; replay still works)\x1b[0m'),
      );

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/')) return next();
        const name = url.split('?')[0].slice('/api/'.length);
        if (!ROUTES.has(name)) return next();

        augmentRes(res);
        try {
          (req as any).body = await readBody(req);
          (req as any).query = Object.fromEntries(new URL(url, 'http://localhost').searchParams);
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const handler = mod.default;
          if (typeof handler !== 'function') {
            (res as any).status(404).json({ error: { code: 'NOT_FOUND', message: `No handler for /api/${name}` } });
            return;
          }
          await handler(req, res);
        } catch (e: any) {
          server.ssrFixStacktrace?.(e);
          const missing = /Cannot find (package|module)|ERR_MODULE_NOT_FOUND/.test(String(e?.message ?? e));
          const message = missing
            ? 'Live deps not installed. Run: npm i openai zod @upstash/ratelimit @upstash/redis'
            : `Dev API error: ${e?.message ?? String(e)}`;
          if (!res.headersSent) (res as any).status(500).json({ error: { code: 'DEV_API_ERROR', message, retryable: false } });
          else try { res.end(); } catch { /* stream already torn down */ }
        }
      });
    },
  };
}

// Largest request body we'll buffer. The biggest legitimate payload (a full
// 12-message transcript at the schema caps) is ~24KB; 64KB leaves headroom while
// stopping a client from streaming megabytes into memory before validation runs.
const MAX_BODY = 64 * 1024;

function readBody(req: IncomingMessage): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'OPTIONS') return Promise.resolve(undefined);
  return new Promise((resolve) => {
    let data = '';
    let size = 0;
    let tooBig = false;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        // Stop BUFFERING (memory guard) but keep draining the socket — do NOT
        // req.destroy(), which RST-resets the connection and surfaces as an
        // HTTP 000 "server crashed" instead of a clean 4xx.
        tooBig = true;
        data = '';
        return;
      }
      data += c;
    });
    req.on('end', () => {
      if (tooBig) return resolve(undefined); // -> zod sees undefined -> clean 400
      try {
        resolve(data ? JSON.parse(data) : undefined);
      } catch {
        resolve(undefined);
      }
    });
    req.on('error', () => resolve(undefined));
  });
}

// Add the Vercel-style res.status().json() helpers the handlers expect.
// setHeader / writeHead / write / end already exist on Node's ServerResponse,
// so SSE streaming from the customer-turn handler works unchanged.
function augmentRes(res: ServerResponse) {
  const r = res as any;
  r.status = (code: number) => {
    res.statusCode = code;
    return r;
  };
  r.json = (obj: unknown) => {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return r;
  };
}
