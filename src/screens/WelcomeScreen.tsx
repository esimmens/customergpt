import { useState } from 'react';

// Screen 1 — WHY / WHAT. Its only job is orientation: what this is and what will
// happen. Setup instructions deliberately live on the next screen so each screen
// does one job.
//
// Renders only the PANEL CONTENT — the split frame (background + presenter) is
// owned by App so it stays mounted across the transition to setup.
export function WelcomeScreen({ onBegin }: { onBegin: () => void }) {
  const [leaving, setLeaving] = useState(false);

  // Fade this content out, then advance. The frame doesn't move and the next
  // screen's content fades in, so the two cross-fade inside a static layout.
  const handleBegin = () => {
    if (leaving) return; // ignore a second click mid-fade
    setLeaving(true);
    setTimeout(onBegin, 200); // matches panelOut in theme.css
  };

  return (
    <div className={`panel__content${leaving ? ' panel__content--leaving' : ''}`}>
      <h1 className="screen__title screen__title--hero">AI Customer Objection Simulator</h1>

      <p className="welcome__lead">
        Practice handling realistic customer objections in a dynamic conversation with an AI customer.
      </p>
      <p className="welcome__sub">
        The customer will respond based on what you say. When the conversation ends, you’ll receive
        personalized, AI-generated feedback on your approach.
      </p>

      <button className="btn btn--primary btn--block" onClick={handleBegin}>
        Get Started
      </button>
    </div>
  );
}
