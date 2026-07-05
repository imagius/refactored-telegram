import { EditorLayout } from './components/EditorLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <EditorLayout />
    </ErrorBoundary>
  );
}

export default App;