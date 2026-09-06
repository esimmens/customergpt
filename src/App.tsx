import { CustomizeScreen } from './screens/CustomizeScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { ConversationScreen } from './screens/ConversationScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';
import { ReplayBanner } from './components/ReplayBanner';
import { useConversation } from './hooks/useConversation';

export default function App() {
  const conv = useConversation();
  const { state, start, reset } = conv;

  return (
    <div className="app">
      <div className="stage">
        {state.mode === 'replay' && state.phase !== 'customize' && <ReplayBanner onRunLive={reset} dimmed={state.ending} />}

        {state.phase === 'customize' && <CustomizeScreen onStart={start} error={state.error?.message} />}
        {state.phase === 'loading' && <LoadingScreen label={state.loadingLabel} />}
        {state.phase === 'conversation' && <ConversationScreen conv={conv} />}
        {state.phase === 'feedback' && state.feedback && (
          <FeedbackScreen feedback={state.feedback} onRestart={reset} />
        )}
      </div>
    </div>
  );
}
