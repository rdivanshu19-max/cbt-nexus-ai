import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered when a descendant throws. Omit for a decorative subtree that should just disappear. */
  fallback?: ReactNode;
  /** Short name used in the console log so a crash is traceable to the subtree. */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render-time errors from a subtree so one broken component cannot
 * unmount the whole application.
 *
 * This matters twice over on the landing page: the 3D hero creates a WebGL
 * context, and on a device without WebGL (older Android, locked-down browser,
 * headless renderer) that throws during render. Without a boundary React tears
 * down the entire tree and the visitor gets a blank white page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

/** Last-resort screen shown when the application shell itself crashes. */
export const AppCrashFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-6">
    <div className="w-full max-w-md text-center">
      <img src="/logo.jpg" alt="CBT Nexus" className="mx-auto mb-5 h-12 w-12 rounded-xl ring-1 ring-border" />
      <h1 className="mb-2 text-2xl font-bold text-foreground">Something went wrong</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        The app hit an unexpected error while loading. Your saved tests and notes are safe — reload to
        continue.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Reload the page
      </button>
      <p className="mt-4 text-xs text-muted-foreground">
        Still stuck? Email us and mention the time it happened.
      </p>
    </div>
  </div>
);
