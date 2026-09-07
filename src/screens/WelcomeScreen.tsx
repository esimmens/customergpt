import { useState } from 'react';

// Screen 1 — WHY / WHAT. Its only job is orientation: what this is and what will
// happen. Setup instructions deliberately live on the next screen so each screen
// does one job.
export function WelcomeScreen({ onBegin }: { onBegin: () => void }) {
  const [leaving, setLeaving] = useState(false);

  // Fade the panel out before advancing. The next screen shares this exact
  // background and presenter, so only the text cross-fades — the layout never
  // jumps and the white stage behind never flashes through.
  const handleBegin = () => {
    if (leaving) return; // ignore a second click mid-fade
    setLeaving(true);
    setTimeout(onBegin, 200); // matches the panelOut duration in theme.css
  };

  return (
    <div className="screen screen--split">
      <div className="screen__art">
        <img
          className="presenter"
          src="/characters/presenter.png"
          alt=""
          onError={(e) => ((e.currentTarget.style.display = 'none'))}
        />
      </div>
      <div className={`screen__panel${leaving ? ' screen__panel--leaving' : ''}`}>
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
    </div>
  );
}
