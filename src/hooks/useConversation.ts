import { useCallback, useReducer, useRef } from 'react';
import { DEFAULT_EMOTION, type Emotion } from '../lib/emotions';
import type { Feedback, Message, Sample, TurnHandlers } from '../lib/types';
import { generateFeedback, generateObjection, loadSample, replayTurn, streamTurn } from '../lib/api';

export type Phase = 'welcome' | 'customize' | 'loading' | 'conversation' | 'feedback';
export type Mode = 'live' | 'replay';
export interface Line {
  role: 'customer' | 'rep';
  text: string;
}

interface State {
  phase: Phase;
  mode: Mode;
  product: string;
  objectionType: string;
  sessionId: string | null;
  messages: Message[]; // dialogue only (assistant=customer, user=rep); server adds the system prompt
  transcript: Line[];
  streamingText: string; // in-progress customer bubble
  emotion: Emotion;
  userTurns: number; // rep messages sent (cap 5)
  streaming: boolean;
  finalTurn: boolean;
  ending: boolean; // the closing turn has been sent — show the end modal (even mid-stream)
  feedback?: Feedback;
  loadingLabel: string;
  error?: { code: string; message: string };
}

const MAX_TURNS = 5;

export const initial: State = {
  phase: 'welcome',
  mode: 'replay',
  product: '',
  objectionType: '',
  sessionId: null,
  messages: [],
  transcript: [],
  streamingText: '',
  emotion: DEFAULT_EMOTION,
  userTurns: 0,
  streaming: false,
  finalTurn: false,
  ending: false,
  loadingLabel: 'Generating the scenario…',
};

type Action =
  | { t: 'BEGIN' }
  | { t: 'LOADING'; product: string; objectionType: string; mode: Mode }
  | { t: 'CONVERSATION'; sessionId: string | null; objection: string; emotion: Emotion }
  | { t: 'REP_SENT'; text: string; ending: boolean }
  | { t: 'META'; emotion: Emotion }
  | { t: 'TOKEN'; text: string }
  | { t: 'TURN_DONE'; reply: string; emotion: Emotion; finalTurn: boolean }
  | { t: 'ERROR'; code: string; message: string }
  | { t: 'SCORING' }
  | { t: 'START_FAILED'; message: string }
  | { t: 'FEEDBACK_FAILED'; message: string }
  | { t: 'FEEDBACK'; feedback: Feedback }
  | { t: 'CLEAR_ERROR' }
  | { t: 'RESET' };

export function reducer(s: State, a: Action): State {
  switch (a.t) {
    case 'BEGIN':
      return { ...s, phase: 'customize' };
    case 'LOADING':
      return { ...initial, phase: 'loading', loadingLabel: 'Generating the scenario…', mode: a.mode, product: a.product, objectionType: a.objectionType };
    case 'SCORING':
      // keep the conversation state — only show the loading screen while scoring
      return { ...s, phase: 'loading', loadingLabel: 'Scoring your conversation…', error: undefined };
    case 'START_FAILED':
      // a failed live start must NOT hang on the loading screen — return to customize
      return { ...initial, error: { code: 'START', message: a.message } };
    case 'FEEDBACK_FAILED':
      // stay on the conversation so the learner can retry "Get feedback"
      return { ...s, phase: 'conversation', error: { code: 'FEEDBACK', message: a.message } };
    case 'CONVERSATION':
      return {
        ...s,
        phase: 'conversation',
        sessionId: a.sessionId,
        emotion: a.emotion,
        messages: [{ role: 'assistant', content: a.objection }],
        transcript: [{ role: 'customer', text: a.objection }],
      };
    case 'REP_SENT':
      return {
        ...s,
        streaming: true,
        streamingText: '',
        error: undefined,
        ending: a.ending,
        userTurns: s.userTurns + 1,
        transcript: [...s.transcript, { role: 'rep', text: a.text }],
        messages: [...s.messages, { role: 'user', content: a.text }],
      };
    case 'META':
      return { ...s, emotion: a.emotion };
    case 'TOKEN':
      return { ...s, streamingText: s.streamingText + a.text };
    case 'TURN_DONE':
      return {
        ...s,
        streaming: false,
        streamingText: '',
        emotion: a.emotion,
        finalTurn: a.finalTurn,
        transcript: [...s.transcript, { role: 'customer', text: a.reply }],
        messages: [...s.messages, { role: 'assistant', content: a.reply }],
      };
    case 'ERROR':
      // Roll back the optimistic REP_SENT so the failed turn can be retried cleanly.
      // REP_SENT appended the rep line + a user message and bumped userTurns before
      // any customer reply arrived; ERROR fires before TURN_DONE, so the last
      // transcript/message entries are that dangling rep turn. Dropping them (and
      // clearing `ending`) returns the learner to the input to try again — otherwise
      // a failed FINAL turn dead-ends them (no retry: userTurns hit the cap, and no
      // feedback: finalTurn never got set), and a failed mid-turn desyncs history
      // into two user messages in a row.
      return {
        ...s,
        streaming: false,
        ending: false,
        userTurns: Math.max(0, s.userTurns - 1),
        transcript: s.transcript.slice(0, -1),
        messages: s.messages.slice(0, -1),
        error: { code: a.code, message: a.message },
      };
    case 'FEEDBACK':
      return { ...s, phase: 'feedback', feedback: a.feedback };
    case 'CLEAR_ERROR':
      return { ...s, error: undefined };
    case 'RESET':
      // Back to SETUP, not the welcome screen — the intro is first-run orientation,
      // not something to re-read every time you start another scenario.
      return { ...initial, phase: 'customize' };
  }
}

export function useConversation() {
  const [state, dispatch] = useReducer(reducer, initial);
  const sampleRef = useRef<Sample | null>(null);
  // Synchronous re-entry guard. `state.streaming` only flips on the next render,
  // so a rapid double-click/double-Enter in the SAME tick would pass the streaming
  // check twice and fire two concurrent turns (garbled, interleaved output). A ref
  // updates immediately, so the second call bails before starting another turn.
  const busyRef = useRef(false);
  // Generation counter for cancelation. Every turn captures the current runId;
  // resetting or starting a new scenario bumps it (and aborts/clears the producer),
  // so a late callback from an abandoned replay typewriter or live fetch can't
  // dispatch a stray line into the next conversation.
  const runIdRef = useRef(0);
  const cancelRef = useRef<(() => void) | null>(null);
  const scoringRef = useRef(false); // re-entry guard for "Get Feedback"

  const cancelInFlight = useCallback(() => {
    runIdRef.current += 1; // invalidate any pending callbacks from the old run
    busyRef.current = false;
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);

  // Build turn handlers scoped to one runId — they no-op if a newer run has started.
  const makeHandlers = useCallback((run: number): TurnHandlers => {
    return {
      onMeta: (e) => { if (runIdRef.current === run) dispatch({ t: 'META', emotion: e.emotion }); },
      onToken: (text) => { if (runIdRef.current === run) dispatch({ t: 'TOKEN', text }); },
      onDone: (d) => {
        if (runIdRef.current !== run) return;
        busyRef.current = false;
        dispatch({ t: 'TURN_DONE', reply: d.reply, emotion: d.emotion, finalTurn: d.finalTurn });
      },
      onError: (e) => {
        if (runIdRef.current !== run) return;
        busyRef.current = false;
        dispatch({ t: 'ERROR', code: e.code, message: e.message });
      },
    };
  }, []);

  const start = useCallback(
    async (product: string, objectionType: string, mode: Mode, sampleId?: string) => {
      cancelInFlight(); // kill any leftover producer from a previous scenario
      dispatch({ t: 'LOADING', product, objectionType, mode });
      try {
        if (mode === 'replay') {
          const sample = await loadSample(sampleId ?? 'tesla-too-expensive');
          sampleRef.current = sample;
          dispatch({ t: 'CONVERSATION', sessionId: null, objection: sample.objection, emotion: sample.openingEmotion });
        } else {
          const r = await generateObjection(product, objectionType);
          sampleRef.current = null;
          dispatch({ t: 'CONVERSATION', sessionId: r.sessionId, objection: r.objection, emotion: r.emotion });
        }
      } catch (e: any) {
        dispatch({ t: 'START_FAILED', message: e?.message ?? 'Could not start the scenario.' });
      }
    },
    [cancelInFlight],
  );

  const sendRep = useCallback(
    (text: string) => {
      if (busyRef.current || state.streaming || state.userTurns >= MAX_TURNS || !text.trim()) return;
      busyRef.current = true;
      const run = (runIdRef.current += 1); // claim this run; cancels any prior one
      const on = makeHandlers(run);
      const turn = state.userTurns + 1;
      const exchangesLen = state.mode === 'replay' && sampleRef.current ? sampleRef.current.exchanges.length : MAX_TURNS;
      // Is this the closing turn? Know it NOW so the wrap-up streams inside the end
      // modal — not first in the normal view and then again in the modal.
      const isLast = turn >= MAX_TURNS || turn >= exchangesLen;
      dispatch({ t: 'REP_SENT', text, ending: isLast });
      if (state.mode === 'replay' && sampleRef.current) {
        const ex = sampleRef.current.exchanges[state.userTurns]; // 0-indexed
        if (ex) cancelRef.current = replayTurn(ex, turn, isLast, on);
        else on.onDone({ reply: '…', emotion: 'NEUTRAL', finalTurn: true });
      } else {
        const ac = new AbortController();
        cancelRef.current = () => ac.abort();
        void streamTurn(
          {
            sessionId: state.sessionId ?? '',
            product: state.product,
            objectionType: state.objectionType,
            messages: [...state.messages, { role: 'user', content: text }],
            turn,
          },
          on,
          ac.signal,
        );
      }
    },
    [state.streaming, state.userTurns, state.mode, state.sessionId, state.product, state.objectionType, state.messages, makeHandlers],
  );

  const requestFeedback = useCallback(async () => {
    if (scoringRef.current) return; // ignore a double-click (would double-bill live feedback)
    scoringRef.current = true;
    dispatch({ t: 'SCORING' });
    try {
      const fb =
        state.mode === 'replay' && sampleRef.current
          ? sampleRef.current.feedback
          : await generateFeedback(state.sessionId ?? '', state.product, state.objectionType, state.messages);
      dispatch({ t: 'FEEDBACK', feedback: fb });
    } catch (e: any) {
      dispatch({ t: 'FEEDBACK_FAILED', message: e?.message ?? 'Could not generate feedback.' });
    } finally {
      scoringRef.current = false;
    }
  }, [state.mode, state.sessionId, state.messages, state.product, state.objectionType]);

  const begin = useCallback(() => dispatch({ t: 'BEGIN' }), []);

  const reset = useCallback(() => {
    cancelInFlight(); // stop any in-flight typewriter / live stream before resetting
    sampleRef.current = null;
    dispatch({ t: 'RESET' });
  }, [cancelInFlight]);

  const pendingRep =
    state.mode === 'replay' && sampleRef.current ? sampleRef.current.exchanges[state.userTurns]?.rep ?? '' : '';

  return {
    state,
    pendingRep,
    maxTurns: MAX_TURNS,
    isEnding: state.ending,
    canFeedback: state.finalTurn && !state.streaming,
    begin,
    start,
    sendRep,
    requestFeedback,
    reset,
  };
}
