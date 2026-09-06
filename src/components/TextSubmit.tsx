import { useEffect, useState } from 'react';

// "Type your response here" + Submit. In replay mode it's pre-filled with the
// canned rep line (via `prefill`) so the transcript reads coherently.
export function TextSubmit({
  onSubmit,
  disabled = false,
  prefill = '',
  placeholder = 'Type your response here',
  cta = 'Submit',
}: {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  prefill?: string;
  placeholder?: string;
  cta?: string;
}) {
  const [text, setText] = useState(prefill);
  useEffect(() => setText(prefill), [prefill]);

  const submit = () => {
    const value = text.trim();
    if (!value || disabled) return;
    onSubmit(value);
    setText('');
  };

  return (
    <div className="textsubmit">
      <textarea
        className="textsubmit__input"
        value={text}
        placeholder={placeholder}
        aria-label="Your response to the customer"
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // While an IME composition is active, Enter commits the candidate — it must
          // NOT submit a half-typed message (CJK/IME users). isComposing covers modern
          // browsers; keyCode 229 is the legacy Safari/older-engine signal.
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          // Enter submits; Shift+Enter inserts a newline (standard chat-input behavior).
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button className="btn btn--primary" onClick={submit} disabled={disabled || !text.trim()}>
        {cta}
      </button>
    </div>
  );
}
