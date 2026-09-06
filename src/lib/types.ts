import type { Emotion } from './emotions';

export type Role = 'system' | 'user' | 'assistant';
export interface Message {
  role: Role;
  content: string;
}

export interface Scores {
  product_knowledge: number; // 0–30
  customer_understanding: number; // 0–25
  objection_handling: number; // 0–25
  communication: number; // 0–20
}

export interface Feedback {
  performance: string;
  key_strengths: string;
  areas_to_improve: string;
  scores: Scores;
  total: number; // 0–100, recomputed client-side as the sum of scores
}

// ── Wire shapes ──
export interface ObjectionResponse {
  sessionId: string;
  objection: string;
  emotion: Emotion;
}

// Callback shape shared by BOTH the live SSE reader and the replay player, so the
// UI renders identically in either mode.
export interface TurnHandlers {
  onMeta: (e: { turn: number; emotion: Emotion }) => void;
  onToken: (text: string) => void;
  onDone: (d: { reply: string; emotion: Emotion; finalTurn: boolean }) => void;
  onError: (e: { code: string; message: string }) => void;
}

// ── Replay (canned) scenarios in /public/samples ──
export interface SampleExchange {
  rep: string; // the rep's line for this turn (pre-filled in replay)
  emotion: Emotion; // the customer's emotion for the reply
  reply: string; // the customer's reply
}
export interface Sample {
  id: string;
  label: string;
  product: string;
  objectionType: string;
  objection: string; // opening customer objection
  openingEmotion: Emotion;
  exchanges: SampleExchange[]; // up to 5
  feedback: Feedback;
}
