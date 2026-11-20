import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected application error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#07090E] p-6">
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#0C101B] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              NEXA Calculator encountered a rendering error
            </h1>
            <p className="text-sm text-rose-500 font-mono">{this.state.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium cursor-pointer"
            >
              Recover Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
