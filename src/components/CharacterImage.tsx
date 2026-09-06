import { useEffect, useState } from 'react';
import { emotionImage, type Emotion } from '../lib/emotions';

// Maps the validated emotion to the customer's character art. Until you drop your
// exported Storyline poses into /public/characters, it shows a labeled placeholder
// so the app still runs and you can see which emotion fired.
export function CharacterImage({ emotion }: { emotion: Emotion }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [emotion]);

  if (broken) {
    return (
      <div className="character character--placeholder" aria-label={`Customer looks ${emotion.toLowerCase()}`}>
        <span className="character__emotion">{emotion.toLowerCase()}</span>
        <span className="character__hint">add /public/characters/{emotion.toLowerCase()}.png</span>
      </div>
    );
  }
  return (
    <img
      className="character"
      src={emotionImage(emotion)}
      alt={`Customer looks ${emotion.toLowerCase()}`}
      onError={() => setBroken(true)}
    />
  );
}
