// Shown during a canned sample so a reviewer always knows what they're seeing,
// with a one-click path to run a live scenario.
export function ReplayBanner({ onRunLive, dimmed = false }: { onRunLive: () => void; dimmed?: boolean }) {
  return (
    <div className={`replay-banner${dimmed ? ' replay-banner--dim' : ''}`}>
      <span>Scripted sample — no API used.</span>
      <button className="btn btn--ghost" onClick={onRunLive}>
        Try live version
      </button>
    </div>
  );
}
