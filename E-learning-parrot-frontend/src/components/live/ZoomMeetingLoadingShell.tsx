import { ZoomSdkStartingSpinner, type ZoomSdkStartingSpinnerProps } from "@/components/live/ZoomSdkStartingSpinner";
import type { ZoomSdkLoadingPhase } from "@/lib/zoomSdkLoadingMessages";

type Props = {
  label?: string;
  phase?: ZoomSdkLoadingPhase;
  isHost?: boolean;
  meetingTitle?: string | null;
  institutionName?: string | null;
  logoUrl?: string | null;
  fullscreen?: boolean;
};

/** Unified Zoom SDK loading UI — used by Suspense fallbacks and meeting shells. */
export function ZoomMeetingLoadingShell({
  label,
  phase = "loading-sdk",
  isHost,
  meetingTitle,
  institutionName,
  logoUrl,
  fullscreen = false,
}: Props) {
  const spinnerProps: ZoomSdkStartingSpinnerProps = {
    active: true,
    phase,
    isHost,
    meetingTitle: meetingTitle ?? label ?? undefined,
    institutionName,
    logoUrl,
    fullscreen,
  };

  return <ZoomSdkStartingSpinner {...spinnerProps} />;
}
