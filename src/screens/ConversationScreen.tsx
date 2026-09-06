import { useEffect, useRef } from 'react';
import { CharacterImage } from '../components/CharacterImage';
import { SpeechBubble, TypingBubble } from '../components/CustomerBubble';
import { TextSubmit } from '../components/TextSubmit';
import type { useConversation } from '../hooks/useConversation';

type Conv = ReturnType<typeof useConversation>;

const INSTRUCTION =
  "Try to overcome the customer's objections through persuasive arguments and product knowledge. You only have five turns, so make it count!";

export function ConversationScreen({ conv }: { conv: Conv }) {
  const { state, pendingRep, isEnding, canFeedback, sendRep, requestFeedback } = conv;

  // The customer's CURRENT line — one bubble at a time, replaced each turn.
  const customerLines = state.transcript.filter((l) => l.role === 'customer').map((l) => l.text);
  const lastCustomer = customerLines[customerLines.length - 1] ?? '';
  const prevCustomer = customerLines[customerLines.length - 2] ?? ''; // dimmed behind the end modal, for depth
  const bubbleText = state.streaming ? state.streamingText : lastCustomer;
  const showTyping = state.streaming && state.streamingText.length === 0;

  // a11y: when the closing dialog reveals "Get Feedback", move focus to it so a
  // keyboard/screen-reader user isn't stranded in the dimmed background.
  const ctaRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (canFeedback) ctaRef.current?.focus();
  }, [canFeedback]);

  return (
    <div className="screen screen--conversation">
      <header className="conversation__header">
        <p>{INSTRUCTION}</p>
      </header>

      {/* Single polite live region: announce each COMPLETED customer reply once
          (with its emotion) instead of letting the typewriter read it token-by-token. */}
      <div className="sr-only" aria-live="polite" role="status">
        {!state.streaming && lastCustomer ? `Customer (${state.emotion.toLowerCase()}): ${lastCustomer}` : ''}
      </div>

      <div className="conversation__stage">
        {isEnding && prevCustomer && (
          <div className="end-ghost" aria-hidden="true">
            {prevCustomer}
          </div>
        )}
        {!isEnding && (
          <>
            <div className="conversation__customer">
              <CharacterImage emotion={state.emotion} />
              <div className="speech-wrap" aria-hidden="true">
                {showTyping ? <TypingBubble /> : <SpeechBubble text={bubbleText} streaming={state.streaming} />}
              </div>
            </div>

            <div className="conversation__input">
              <TextSubmit onSubmit={sendRep} disabled={state.streaming} prefill={pendingRep} />
              {state.error && (
                <div className="error-bar" role="alert">
                  {state.error.message}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* End of conversation: dim everything, zoom the customer to center, overlay the closing box. */}
      {isEnding && (
        <div className="end-overlay" role="dialog" aria-modal="true" aria-label="The customer is wrapping up the conversation">
          <div className="end-character">
            <CharacterImage emotion={state.emotion} />
          </div>
          <div className={`end-bubble${state.streaming ? '' : ' end-bubble--done'}`} aria-hidden="true">
            {showTyping ? (
              <span className="end-typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </span>
            ) : (
              bubbleText
            )}
          </div>
          {canFeedback && (
            <button ref={ctaRef} className="btn end-cta" onClick={requestFeedback}>
              Get Feedback
            </button>
          )}
        </div>
      )}
    </div>
  );
}
