import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-factorio-bg p-8">
          <div className="max-w-2xl rounded-lg border border-factorio-red bg-factorio-panel p-6">
            <h1 className="mb-4 text-xl font-bold text-factorio-red">Something went wrong</h1>
            <pre className="overflow-auto text-sm text-factorio-text">
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="mt-4 rounded border border-factorio-border bg-factorio-bg px-4 py-2 text-sm text-factorio-text-bright hover:bg-factorio-border"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}