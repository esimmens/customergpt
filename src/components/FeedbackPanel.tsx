import type { Scores } from '../lib/types';

export function FeedbackPanel({ title, body, icon }: { title: string; body: string; icon?: string }) {
  return (
    <div className="panel">
      {icon && <img className="panel__icon" src={icon} alt="" />}
      <div className="panel__text">
        <h3 className="panel__title">{title}</h3>
        <p className="panel__body">{body}</p>
      </div>
    </div>
  );
}

// The four rubric sub-scores the model returns — surfaced so the headline number
// is explainable instead of arbitrary.
const RUBRIC: { key: keyof Scores; label: string; max: number }[] = [
  { key: 'product_knowledge', label: 'Product knowledge', max: 30 },
  { key: 'customer_understanding', label: 'Customer understanding', max: 25 },
  { key: 'objection_handling', label: 'Objection handling', max: 25 },
  { key: 'communication', label: 'Communication', max: 20 },
];

export function ScoreBreakdown({ scores }: { scores: Scores }) {
  return (
    <div className="breakdown">
      {RUBRIC.map(({ key, label, max }) => {
        const val = scores[key];
        return (
          <div key={key} className="breakdown__row">
            <span className="breakdown__label">{label}</span>
            <span className="breakdown__bar">
              <span className="breakdown__fill" style={{ width: `${(val / max) * 100}%` }} />
            </span>
            <span className="breakdown__num">
              {val}/{max}
            </span>
          </div>
        );
      })}
    </div>
  );
}
