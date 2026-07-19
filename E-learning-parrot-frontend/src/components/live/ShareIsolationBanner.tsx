import { AlertTriangle } from "lucide-react";
import { isZoomScreenShareSupported } from "@/components/live/zoomMeetingClient";

type Props = {
  visible: boolean;
};

/** Shown when COOP/COEP headers are missing — screen share will stay black. */
export function ShareIsolationBanner({ visible }: Props) {
  if (!visible || isZoomScreenShareSupported()) return null;

  return (
    <div className="absolute inset-x-0 top-14 z-[25] flex justify-center px-3">
      <div className="flex max-w-xl items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-950/95 px-4 py-3 text-left shadow-lg">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="text-xs text-amber-100 sm:text-sm">
          <p className="font-semibold text-amber-50">Screen share cannot decode on this page</p>
          <p className="mt-1 text-amber-100/90">
            Restart the dev server and hard-refresh. In the console,{" "}
            <code className="rounded bg-black/30 px-1">window.crossOriginIsolated</code> must be{" "}
            <code className="rounded bg-black/30 px-1">true</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
