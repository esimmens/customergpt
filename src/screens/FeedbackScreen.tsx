import { DialGauge } from '../components/DialGauge';
import { FeedbackPanel, ScoreBreakdown } from '../components/FeedbackPanel';
import type { Feedback } from '../lib/types';

export function FeedbackScreen({ feedback, onRestart }: { feedback: Feedback; onRestart: () => void }) {
  return (
    <div className="screen screen--feedback">
      <div className="feedback__top">
        <div className="feedback__performance">
          <h2 className="screen__title">Feedback</h2>
          <p>
            <strong>Your performance:</strong> {feedback.performance}
          </p>
        </div>
        <div className="feedback__dial">
          <DialGauge value={feedback.total} />
          <ScoreBreakdown scores={feedback.scores} />
        </div>
      </div>

      <div className="feedback__panels">
        <FeedbackPanel title="Key strengths" body={feedback.key_strengths} icon="/icons/handshake.png" />
        <FeedbackPanel title="Areas to improve" body={feedback.areas_to_improve} icon="/icons/wrench.png" />
      </div>

      <div className="feedback__actions">
        <button className="btn btn--primary" onClick={onRestart}>
          Try another scenario
        </button>
      </div>
    </div>
  );
}
