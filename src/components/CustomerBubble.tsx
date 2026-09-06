// The customer's CURRENT line — one large speech bubble shown beside the
// character, replaced each turn (not a scrolling chat log). The tail points
// toward the character on the right.
export function SpeechBubble({ text, streaming = false }: { text: string; streaming?: boolean }) {
  return (
    <div className="speech-bubble">
      {text}
      {streaming && <span className="speech-bubble__caret" aria-hidden="true" />}
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="speech-bubble speech-bubble--typing" aria-label="Customer is responding">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  );
}
