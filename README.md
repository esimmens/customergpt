# CustomerGPT — AI-generated sales-objection roleplay, at scale

> Sales-enablement teams hand-author one roleplay scenario for every product their
> reps sell. That doesn't scale. CustomerGPT generates a full, working
> objection-handling simulation from any `{ product, objection }` in seconds — so an
> instructional designer authors the **engine once** instead of a scenario every time.

A rep types a product and an objection, then practices against a live AI customer
that reacts with emotion turn by turn. At the end, an AI coach gives formative
feedback and a rough "Persuasion Power" read against a weighted rubric.

> Built originally as a Storyline proof-of-concept for a sales-enablement training
> team; rebuilt here as a React + serverless app.

## Try it in 10 seconds

- **Live demo:** _<your-vercel-url>_ — lands on a one-click "Watch a sample" so you
  see the whole flow with zero cost. Or type any product + objection to generate a live one.
- **60–90s video:** _<link>_ — generates three different scenarios back-to-back, then
  one full streamed conversation and the feedback dial.

## Run it locally

```bash
npm install
npm run dev          # http://localhost:5173 — replay mode, NO key needed
```

Replay mode plays bundled sample sessions and works fully offline. For live
generation — no Vercel CLI needed, the same `npm run dev` serves the `/api`
handlers via a Vite dev plugin:

```bash
npm i openai zod                # live deps (Upstash optional, for a durable spend cap)
cp .env.example .env.local      # add your OPENAI_API_KEY
npm run dev                     # SPA + /api on http://localhost:5173
```

(`npm run dev:live` runs the real Vercel runtime via `vercel dev` instead, if you
want to mirror the production deploy exactly. Production on Vercel uses the same
`api/*.ts` handlers — the dev plugin just serves them locally.)

## The problem and the users

- **Author / buyer:** the instructional designer or enablement lead. Their pain is
  authoring *at scale* — a scenario per product per objection doesn't fit a real catalog.
- **End user:** the sales rep, practicing a hard objection before a real call.
- **Old build:** an Articulate Storyline course + Heroku proxies that scraped the
  model's output with fragile in-band delimiters (`@ ~ ^ |`). One scenario was one
  hand-build.

## What changed, and why (the decisions)

| Then (Storyline) | Now (this repo) | Why |
|---|---|---|
| Authoring tool, 32 global variables | React (Vite + TS), a typed state machine | Reviewable, testable, real product code |
| Heroku + delimiter scraping | Serverless + OpenAI Structured Outputs (`strict` json_schema) | No regex, no leaked markers — the model returns typed objects |
| Dialogue rebuilt by string templating | A real `messages[]` array (system + alternating turns) | Correct multi-turn context; "stay in character" is structural |
| Key in client JS (a leaked `sk-…`) | Key server-side only, in an env var | The whole point of the proxy |
| Demo on free Heroku dynos | Vercel + a zero-cost replay fallback | A reviewer always sees it work |

## Architecture

![architecture](docs/architecture.svg)

Three serverless routes hold the key and call OpenAI:

- `POST /api/objection` — one-shot, returns the opening objection + emotion.
- `POST /api/customer-turn` — **SSE stream**; emits `meta` (emotion first), then
  `token` deltas, then `done`. The emotion drives the character expression the
  instant the bubble starts filling.
- `POST /api/feedback` — one-shot rubric: four sub-scores + a recomputed total.

Model: `gpt-4o-mini` by default — fast, cheap, no reasoning latency. The model
layer is one knob: set `OPENAI_MODEL` to a `gpt-5*` id and the handlers
automatically switch to reasoning params (`max_completion_tokens` +
`reasoning_effort`); classic models use `temperature` + `max_tokens`.

Demo protection: a per-IP rate limit, a hard monthly USD spend cap (Upstash Redis,
with an in-memory fallback), and the client-side sample-replay path as the default.

## The feedback is formative coaching, not a grade

The dial reads "Lost sale → Conversion." The rubric weights — Product Knowledge 30,
Customer Understanding 25, Objection Handling 25, Communication 20 — are a deliberate,
documented design choice. The score is an intentionally rough read to prompt
reflection; the four sub-scores are shown so the number is explainable, and the
client recomputes the total from them so model arithmetic can't desync the dial.

## Add your art

Drop your exported Storyline poses into `public/characters/` as
`presenter.png` and one file per emotion (`skepticism.png`, `interest.png`, …,
`neutral.png`). Until then the app shows a labeled placeholder so it still runs.

## What I'd do next

- An author dashboard to save and share generated scenarios — the real "at scale" surface.
- A small eval harness on the feedback rubric (scoring consistency + on-topic checks).
- Voice mode, branching difficulty, and analytics on which objections reps fail most.

## Stack

React · Vite · TypeScript · Vercel serverless · OpenAI (Structured Outputs) · Zod · Vitest
