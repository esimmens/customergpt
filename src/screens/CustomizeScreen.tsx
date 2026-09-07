import { useState, type KeyboardEvent } from 'react';
import { SAMPLES } from '../data/sampleIndex';
import type { Mode } from '../hooks/useConversation';

export function CustomizeScreen({
  onStart,
  error,
}: {
  onStart: (product: string, objectionType: string, mode: Mode, sampleId?: string) => void;
  error?: string;
}) {
  const [product, setProduct] = useState('');
  const [objectionType, setObjectionType] = useState('');
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);

  const canLive = product.trim().length > 0 && objectionType.trim().length > 0;
  const submitLive = () => {
    if (canLive) onStart(product, objectionType, 'live');
  };
  // Enter generates the live scenario — but only when both fields are filled (canLive).
  const onFieldKeyDown = (e: KeyboardEvent) => {
    // Ignore Enter that's committing an IME candidate (CJK input), not submitting.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') submitLive();
  };

  // Renders only the PANEL CONTENT — the split frame (background + presenter) is
  // owned by App so it stays mounted across the transition from the welcome screen.
  return (
    <div className="panel__content">
      <h1 className="screen__title">Set up your practice scenario</h1>

      {error && (
        <div className="error-bar" role="alert" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <label className="field">
        <span className="field__label">What product or service are you selling?</span>
        <input value={product} onChange={(e) => setProduct(e.target.value)} onKeyDown={onFieldKeyDown} placeholder="e.g. Solar panels" maxLength={100} />
      </label>

      <label className="field">
        <span className="field__label">What customer objection do you want to practice?</span>
        <input
          value={objectionType}
          onChange={(e) => setObjectionType(e.target.value)}
          onKeyDown={onFieldKeyDown}
          placeholder="e.g. The upfront cost is too high"
          maxLength={100}
        />
      </label>

      <button className="btn btn--primary btn--block" disabled={!canLive} onClick={submitLive}>
        Generate Scenario
      </button>

      <div className="divider"><span>or, see an example</span></div>

      <div className="sample-row">
        <select value={sampleId} onChange={(e) => setSampleId(e.target.value)} aria-label="Choose a sample scenario">
          {SAMPLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button className="btn btn--ghost" onClick={() => onStart('', '', 'replay', sampleId)}>
          View demo
        </button>
      </div>
    </div>
  );
}
