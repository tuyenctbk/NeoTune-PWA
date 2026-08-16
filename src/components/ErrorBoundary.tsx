import React from 'react';
import { Radio, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      localStorage.removeItem('neotune_theme');
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0A050E] text-white flex flex-col items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#16101f] border border-purple-500/30 shadow-2xl shadow-purple-900/40 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 mx-auto flex items-center justify-center">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-wide">
                NeoTune Audio Stream
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                An unexpected interface issue occurred. Your saved stations, favorites, and settings are safe.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-left font-mono text-[11px] text-zinc-400 break-all max-h-24 overflow-y-auto">
                <span className="text-rose-400 font-bold">Error: </span>
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload NeoTune</span>
              </button>

              <button
                onClick={this.handleResetStorage}
                className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-medium text-xs border border-white/10 transition-all cursor-pointer"
              >
                <span>Reset Cache & Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
