// Registry of canned replay scenarios in /public/samples/<id>.json.
// Add a few visibly different industries here to showcase that the engine generalizes.
export interface SampleMeta {
  id: string;
  label: string;
}

export const SAMPLES: SampleMeta[] = [
  { id: 'tesla-too-expensive', label: 'Tesla Model S — "Too expensive"' },
  { id: 'crm-already-have-one', label: 'B2B CRM — "We already have one"' },
  { id: 'gym-no-time', label: 'Gym membership — "No time"' },
];
