# CustomerGPT — AI-generated sales-objection practice

**Live demo:** https://customergpt-nu.vercel.app

> CustomerGPT turns any `{ product, objection }` into an interactive sales roleplay. Instead of authoring a separate simulation for every scenario, an instructional designer builds the simulation engine once and lets AI generate the conversation at runtime.

A sales rep enters a product and objection, responds in their own words, and practices against an AI customer that reacts turn by turn. After the conversation, an AI coach provides formative feedback using a weighted sales rubric.

Originally built as an Articulate Storyline proof of concept for a sales-enablement training team; rebuilt here as a React + serverless app.

---

## The problem

Traditional branching simulations work well when the number of scenarios is small. But as products, objections, and learner responses multiply, authoring each path by hand becomes difficult to maintain.

CustomerGPT replaces that model with a reusable generative system:

```text
{ product, objection }
        ↓
AI simulation engine
        ↓
customer conversation
        ↓
AI coaching feedback
```

Unlike most elearning exercises, the learner is not selecting from predefined responses. The customer reacts to the evolving conversation.

---

## Key design decisions

| Original prototype                           | Rebuild                               | Why                                                  |
| -------------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Articulate Storyline + 32 global variables   | React, Vite, TypeScript + typed state | Easier to test, extend, and review                   |
| Model output parsed with custom delimiters   | OpenAI Structured Outputs             | Predictable typed responses instead of parsing prose |
| Dialogue reconstructed with string templates | Real `messages[]` history             | Preserves multi-turn context                         |
| Client-side model access                     | Server-side API routes                | Keeps credentials out of the browser                 |

A few additional choices were intentional:

* **Streaming:** customer text arrives progressively so the interaction feels responsive.
* **Emotion metadata first:** the character expression updates before the response finishes rendering.
* **Client-side score calculation:** the model returns rubric sub-scores; the application calculates the weighted total itself.

---

## Architecture

Three serverless routes handle the AI workflow:

### `POST /api/objection`

Generates the opening customer objection and emotional state.

### `POST /api/customer-turn`

Streams the customer's next response with Server-Sent Events:

```text
meta → token → token → ... → done
```

The `meta` event contains the customer's emotion, followed by streamed text deltas.

### `POST /api/feedback`

Receives the completed conversation and returns structured coaching feedback and four rubric scores.

The model is configurable with:

```text
OPENAI_MODEL
```

The default is `gpt-5.6-luna`; set `OPENAI_MODEL` to move to a newer one. The app
targets reasoning models only, so there is no legacy branch to maintain: these models
take `max_completion_tokens` + `reasoning_effort` and reject `temperature` outright.
Their hidden reasoning tokens also bill against the output ceiling, so a shared helper
adds headroom — without it the visible response can come back empty with
`finish_reason: "length"`.

---

## Feedback design

The final screen includes an overall indicator of persuasiveness plus four rubric dimensions:

| Dimension              | Weight |
| ---------------------- | -----: |
| Product Knowledge      |    30% |
| Customer Understanding |    25% |
| Objection Handling     |    25% |
| Communication          |    20% |

The score is intended as formative coaching.

The model returns the four sub-scores and qualitative feedback. The application then calculates the weighted total, keeping the overall result consistent with the visible components.

### Why BARS

Each dimension is scored against a **behaviorally anchored rating scale (BARS)** rather than a bare numeric range. Every band carries a written description of what performance at that level actually looks like, so the model matches observed behavior to an anchor instead of choosing a number in the abstract.

This replaced a flat rubric after measuring both against a fixed set of transcripts: strong, weak, and deliberately lopsided ones (heavy on product facts but deaf to the customer's stated worry, and the reverse). The anchored version pushed strong and weak conversations further apart and cut correlation between the four dimensions from 0.76 to 0.61 — less halo effect, where a single good impression lifts every score at once.

---

## Demo safeguards

The public demo includes:

* per-IP rate limiting, plus a global ceiling across all callers
* Upstash Redis for a limit that survives cold starts
* an in-memory local fallback
* bundled replay sessions

Spending is capped by a hard usage limit on the OpenAI account rather than by an
in-app counter, which is authoritative and can't drift from real billing.

Replay mode is available without an API key and works offline.

---

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

For live generation:

```bash
cp .env.example .env.local
```

Add `OPENAI_API_KEY` to `.env.local`, then run:

```bash
npm run dev
```

The Vite development server serves both the SPA and local `/api` handlers.

To run against the Vercel development runtime instead:

```bash
npm run dev:live
```

---

## What I'd build next

### Retrieval-augmented product knowledge

Add a RAG layer so simulations can use an organization's actual sales and product material as context, such as:

* product documentation
* competitor comparisons
* FAQs

This would let the simulated customer respond with product-specific context and give the coaching model a stronger basis for evaluating whether a rep's claims were accurate.

### Evals

Build an evaluation harness for the coaching layer, focusing on:

* scoring consistency
* alignment with rubric definitions
* sensitivity to stronger and weaker responses
* hallucinated or unsupported feedback.

### Learning analytics

Aggregate practice data to identify:

* objections reps struggle with most
* products associated with weaker product-knowledge scores
* recurring communication or objection-handling weaknesses
* improvement across repeated attempts

---

## Stack

React · Vite · TypeScript · Vercel Serverless · OpenAI API · Structured Outputs · Zod · Vitest
