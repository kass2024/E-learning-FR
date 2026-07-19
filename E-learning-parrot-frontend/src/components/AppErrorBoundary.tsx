import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  return /dynamically imported module|loading chunk|failed to fetch/i.test(error.message);
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App failed to render", error, info);
  }

  handleReload = () => {
    sessionStorage.removeItem("parrot_chunk_reload_once");
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      const chunkError = isChunkLoadError(this.state.error);

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] px-6">
          <div className="max-w-md w-full rounded-xl border border-white/10 bg-[#232323] p-8 text-center shadow-xl">
            <h1 className="text-lg font-semibold text-white">
              {chunkError ? "Updating meeting room…" : "Something went wrong"}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {chunkError
                ? "The app was updated. Reload once to open your meeting."
                : "Try reloading the page. If this keeps happening, contact support."}
            </p>
            <button
              type="button"
              className="mt-6 w-full rounded-lg bg-[#0e72ed] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0b5fc7]"
              onClick={this.handleReload}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
