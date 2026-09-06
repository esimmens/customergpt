/**
 * Demo/smoke: exercise all three ORIGINAL LLM surfaces end-to-end.
 * Run:  npx vite-node evals/baseline/example.ts
 */
import { generateObjectionOriginal } from './originalObjection';
import { customerTurnOriginal } from './originalCustomerTurn';
import { scoreOriginal, type Msg } from './originalScorer';

const product = 'Residential solar panels';
const objectionType = 'The upfront cost is too high';

// 1) opening objection
const opening = await generateObjectionOriginal(product, objectionType);
console.log('=== 1. objection ===');
console.log(opening);

// 2) a customer reply to a rep line (turn 1), then a closing turn (turn 5)
const history: Msg[] = [{ role: 'assistant', content: opening.objection }];
const turn1 = await customerTurnOriginal(product, objectionType, [...history, { role: 'user', content: 'I hear you — most homeowners finance it with $0 down and their monthly payment is lower than their current electric bill.' }], 1);
console.log('\n=== 2a. customer turn (turn 1) ===');
console.log(turn1);
const closing = await customerTurnOriginal(product, objectionType, [...history, { role: 'user', content: 'I can email you a full breakdown with financing options and tax credits.' }], 5);
console.log('\n=== 2b. closing turn (turn 5 — should be a statement, never a question) ===');
console.log(closing);

// 3) feedback on a (weak) transcript
const transcript: Msg[] = [
  { role: 'assistant', content: 'Twenty grand out of pocket is just too much for us right now.' },
  { role: 'user', content: 'I understand, but it will pay off over a few years.' },
  { role: 'assistant', content: 'How long exactly?' },
  { role: 'user', content: 'Usually the payback period is about 2-4 years.' },
  { role: 'assistant', content: 'Can you send me the actual numbers?' },
  { role: 'user', content: 'Sure, ill email them over.' },
];
const fb = await scoreOriginal(product, objectionType, transcript);
console.log('\n=== 3. feedback ===');
console.log(JSON.stringify(fb, null, 2));
