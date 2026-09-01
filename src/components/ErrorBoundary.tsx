import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="error-boundary" role="alert">
        <p className="eyebrow">Something went wrong</p>
        <h1>This page could not be shown.</h1>
        <p>Refresh and try again. Your records on the server are unchanged.</p>
        <a className="button" href="/">
          Back to home
        </a>
      </main>
    );
  }
}
