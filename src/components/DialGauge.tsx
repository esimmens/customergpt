// Semicircular "Lost Sale → Conversion" gauge. The needle points to the
// Persuasion Power score (0–100). Pure SVG, no deps.
export function DialGauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const cx = 110;
  const cy = 110;
  const r = 90;
  // 180° (left, Lost Sale) → 0° (right, Conversion)
  const angle = Math.PI * (1 - v / 100);
  const nx = cx + r * 0.82 * Math.cos(angle);
  const ny = cy - r * 0.82 * Math.sin(angle);

  const arc = (from: number, to: number, color: string) => {
    const a0 = Math.PI * (1 - from / 100);
    const a1 = Math.PI * (1 - to / 100);
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    return <path d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`} stroke={color} strokeWidth={20} fill="none" />;
  };

  return (
    <div className="dial">
      <svg viewBox="0 0 220 140" width="100%" role="img" aria-label={`Persuasion Power ${v} out of 100`}>
        {arc(0, 33, '#e24b4a')}
        {arc(33, 50, '#ef9f27')}
        {arc(50, 67, '#c0dd97')}
        {arc(67, 100, '#1d9e75')}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#2b7fc4" strokeWidth={4} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={8} fill="#2b7fc4" />
      </svg>
      <div className="dial__labels">
        <span>Lost sale</span>
        <span>Conversion</span>
      </div>
      <div className="dial__score">
        Persuasion power: <strong>{v}%</strong>
      </div>
    </div>
  );
}
