import { useLocation } from "react-router-dom";
import { ZoomSdkStartingSpinner } from "@/components/live/ZoomSdkStartingSpinner";
import { HUB } from "@/lib/hubConfig";
import { useZoomLaunchPending } from "@/lib/zoomLaunchPending";

/** Spinner on the dashboard tab while a meeting opens in a new browser tab. */
export function ZoomLaunchBridge() {
  const pending = useZoomLaunchPending();
  const location = useLocation();

  const onDashboard =
    location.pathname.startsWith("/dashboard") ||
    location.pathname === "/login" ||
    location.pathname.startsWith("/login/");

  if (!pending || !onDashboard) return null;

  return (
    <ZoomSdkStartingSpinner
      active
      phase="preparing"
      isHost={pending.isHost ?? false}
      meetingTitle={pending.title}
      institutionName={pending.institutionName ?? HUB.company}
      logoUrl={pending.logoUrl}
      fullscreen
    />
  );
}
