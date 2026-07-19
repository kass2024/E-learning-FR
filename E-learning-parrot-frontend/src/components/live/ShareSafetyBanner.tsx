import { Monitor, X } from "lucide-react";

type Props = {
  visible: boolean;
  isLocalSharer: boolean;
  onDismiss?: () => void;
};

/**
 * Host-only tip while sharing. Viewers rely on the Zoom SDK's native
 * "You are viewing …'s screen" banner so we don't duplicate it.
 */
export function ShareSafetyBanner({ visible, isLocalSharer, onDismiss }: Props) {
  if (!visible || !isLocalSharer) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-[15] flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-lg items-center gap-2.5 rounded-full border border-white/10 bg-[#232323]/95 px-4 py-2 shadow-lg backdrop-blur-sm">
        <Monitor className="h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-xs text-zinc-200 sm:text-sm">
          Share a <span className="font-medium text-white">specific window</span> (slides, browser tab, app) — not{" "}
          <span className="font-medium text-white">Entire Screen</span> — or viewers see duplicated mirrors. Never share
          this meeting tab.
        </p>
        {onDismiss && (
          <button
            type="button"
            className="shrink-0 rounded-full p-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
