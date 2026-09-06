import { describe, it, expect } from 'vitest';
import { reducer, initial } from '../src/hooks/useConversation';

// Build a live-conversation state after `n` fully-completed turns.
function afterTurns(n: number) {
  let s = reducer(initial, { t: 'LOADING', product: 'CRM', objectionType: 'price', mode: 'live' });
  s = reducer(s, { t: 'CONVERSATION', sessionId: 'sid', objection: 'too pricey', emotion: 'SKEPTICISM' });
  for (let i = 1; i <= n; i++) {
    s = reducer(s, { t: 'REP_SENT', text: `rep ${i}`, ending: i >= 5 });
    s = reducer(s, { t: 'TURN_DONE', reply: `cust ${i}`, emotion: 'CONCERN', finalTurn: i >= 5 });
  }
  return s;
}
const last = <T,>(a: T[]) => a[a.length - 1];

describe('conversation reducer — ERROR rolls back the failed turn (no dead-end)', () => {
  it('drops the dangling rep turn so a mid-conversation failure can be retried without desyncing history', () => {
    let s = afterTurns(1);
    const before = { userTurns: s.userTurns, tx: s.transcript.length, msgs: s.messages.length };
    s = reducer(s, { t: 'REP_SENT', text: 'rep 2', ending: false }); // optimistic send
    expect(s.userTurns).toBe(before.userTurns + 1);
    s = reducer(s, { t: 'ERROR', code: 'UPSTREAM_ERROR', message: 'oops' });
    expect(s.streaming).toBe(false);
    expect(s.userTurns).toBe(before.userTurns); // rolled back
    expect(s.transcript.length).toBe(before.tx); // dangling rep line dropped
    expect(s.messages.length).toBe(before.msgs); // dangling user message dropped
    expect(last(s.messages).role).toBe('assistant'); // ends on a customer reply, not a lone user msg
    expect(s.error?.code).toBe('UPSTREAM_ERROR');
  });

  it('a failed FINAL turn does not dead-end: turn count drops below the cap and the end modal closes', () => {
    let s = afterTurns(4); // next send is the 5th/final turn
    s = reducer(s, { t: 'REP_SENT', text: 'rep 5', ending: true });
    expect(s.userTurns).toBe(5);
    expect(s.ending).toBe(true);
    s = reducer(s, { t: 'ERROR', code: 'UPSTREAM_TIMEOUT', message: 'slow' });
    expect(s.userTurns).toBe(4); // < MAX_TURNS(5) -> sendRep guard now allows a retry
    expect(s.ending).toBe(false); // end modal closes -> input view returns
    expect(s.finalTurn).toBe(false);
  });

  it('retrying the final turn after a failure reaches finalTurn, so feedback becomes available', () => {
    let s = afterTurns(4);
    s = reducer(s, { t: 'REP_SENT', text: 'rep 5', ending: true });
    s = reducer(s, { t: 'ERROR', code: 'UPSTREAM_ERROR', message: 'oops' });
    s = reducer(s, { t: 'REP_SENT', text: 'rep 5 again', ending: true }); // retry
    s = reducer(s, { t: 'TURN_DONE', reply: 'final reply', emotion: 'SKEPTICISM', finalTurn: true });
    expect(s.finalTurn).toBe(true); // canFeedback = finalTurn && !streaming
    expect(s.streaming).toBe(false);
    expect(last(s.messages).content).toBe('final reply');
  });
});
