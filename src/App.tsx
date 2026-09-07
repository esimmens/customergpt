import { WelcomeScreen } from './screens/WelcomeScreen';
import { CustomizeScreen } from './screens/CustomizeScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { ConversationScreen } from './screens/ConversationScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';
import { ReplayBanner } from './components/ReplayBanner';
import { useConversation } from './hooks/useConversation';

export default function App() {
  const conv = useConversation();
  const { state, begin, start, reset } = conv;

  // The replay banner belongs to an in-progress sample run — not to the intro or
  // the setup screen (mode defaults to 'replay', so both must be excluded).
  const showReplayBanner =
    state.mode === 'replay' && state.phase !== 'welcome' && state.phase !== 'customize';

  // Welcome and setup share one frame. It is rendered HERE, once, so the
  // background and the presenter <img> stay mounted across the transition —
  // rendering the frame inside each screen made React tear down the image and
  // build a new node, which flashed the character for a frame on "Get Started".
  const isSplit = state.phase === 'welcome' || state.phase === 'customize';

  return (
    <div className="app">
      <div className="stage">
        {showReplayBanner && <ReplayBanner onRunLive={reset} dimmed={state.ending} />}

        {isSplit && (
          <div className="screen screen--split">
            <div className="screen__art">
              <img
                className="presenter"
                src="/characters/presenter.png"
                alt=""
                onError={(e) => ((e.currentTarget.style.display = 'none'))}
              />
            </div>
            <div className="screen__panel">
              {state.phase === 'welcome' ? (
                <WelcomeScreen onBegin={begin} />
              ) : (
                <CustomizeScreen onStart={start} error={state.error?.message} />
              )}
            </div>
          </div>
        )}

        {state.phase === 'loading' && <LoadingScreen label={state.loadingLabel} />}
        {state.phase === 'conversation' && <ConversationScreen conv={conv} />}
        {state.phase === 'feedback' && state.feedback && (
          <FeedbackScreen feedback={state.feedback} onRestart={reset} />
        )}
      </div>
    </div>
  );
}
