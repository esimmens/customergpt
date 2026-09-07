# Baseline: the original prompts

A **frozen copy of all three original LLM surfaces** — the versions from *before*
any of the scoring-quality or security-hardening work in this project. Use them as
the systems-under-test for practicing LLM-output evaluation.

Everything here is **self-contained** — it imports nothing from the live `api/`
code (only `./_shared`), so later production changes can never leak into the
baseline.

## The three surfaces

| File | What it is | Key exports |
|------|-----------|-------------|
| `originalObjection.ts` | Opening-objection generator | `originalObjectionSystemPrompt`, `ORIGINAL_OBJECTION_SCHEMA`, `generateObjectionOriginal(product, objectionType)` |
| `originalCustomerTurn.ts` | Customer reply generator (turns 1-4 = persona prompt, turn 5 = closing/wrap-up prompt) | `originalCustomerSystemPrompt`, `originalClosingSystemPrompt`, `ORIGINAL_CUSTOMER_TURN_SCHEMA`, `customerTurnOriginal(product, objectionType, messages, turn)` |
| `originalScorer.ts` | Feedback scorer | `originalFeedbackSystemPrompt`, `originalUserMessage`, `ORIGINAL_FEEDBACK_SCHEMA`, `scoreOriginal(product, objectionType, messages)` |
| `_shared.ts` | Frozen infra: OpenAI client, `.env.local` loader, original `tuning()`, the emotion enum + `coerceEmotion` | — |

Each module exposes both the **raw prompt** (for tools like promptfoo/Braintrust
that call the model themselves) and a **runnable generator** (for direct/custom
eval loops).

### Deliberately EXCLUDED (everything added after the original)

- product-specificity instruction, strict calibration, the **BARS** rubric (feedback)
- input **fences** / untrusted-data rules / **content-safety moderation** (objection)
- **jailbreak** / character-lock hardening (customer turn)
- language-mirroring, the **thin-transcript gate**

So the baseline is intentionally lenient, generic, and un-hardened — the "before"
you evaluate and improve against.

## Run it

```bash
# demo all three surfaces (needs OPENAI_API_KEY / OPENAI_MODEL in ../../.env.local)
npx vite-node evals/baseline/example.ts
```

## Use it in an eval

```ts
// (a) direct — generate an output, then score it however you like
import { scoreOriginal } from './originalScorer';
const fb = await scoreOriginal(product, objection, transcript);

// (b) prompt-only — hand the exact prompt strings to promptfoo / Braintrust
import { originalFeedbackSystemPrompt, originalUserMessage } from './originalScorer';
const system = originalFeedbackSystemPrompt(product, objection);
const user = originalUserMessage(transcript);
```

## Notes

- **Model:** `_shared.ts` reads `OPENAI_MODEL` (defaults to `gpt-5.6-luna`, matching
  the live app, so a baseline-vs-current run is a prompt A/B rather than a model A/B).
  What is frozen here is the prompts, not the model. Pin it explicitly for
  reproducible evals.
- **Streaming:** the original customer-turn endpoint streamed over SSE; that's
  delivery-only, so `customerTurnOriginal` uses a plain completion to get the same
  final `{ emotion, reply }`.
- **`sessionId`:** the original objection endpoint also returned a random
  `sessionId` (app plumbing); it's omitted here since it's irrelevant to evals.
