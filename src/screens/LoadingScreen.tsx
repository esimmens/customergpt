export function LoadingScreen({ label = 'Generating the scenario…' }: { label?: string }) {
  return (
    <div className="screen screen--center">
      <div className="spinner" aria-hidden="true" />
      <p className="loading__label">{label}</p>
    </div>
  );
}
