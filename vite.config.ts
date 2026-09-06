import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devApi } from './dev-api';

// `npm run dev` now serves both the SPA and the /api/*.ts handlers (via the
// devApi plugin) on one origin — so live mode works locally with just an
// OPENAI_API_KEY in .env.local, no Vercel CLI. Replay still works with no key.
export default defineConfig({
  plugins: [react(), devApi()],
  server: { port: 5173 },
  build: { outDir: 'dist' },
});
