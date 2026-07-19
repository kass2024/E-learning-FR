import { useEffect, useMemo, useRef, useState } from "react";
import "@/components/live/zoomClientMeeting.css";
import type { ZoomMeetingSdkAuth } from "@/api/axios";
import {
  isZoomClientMeetingJoined,
  resetZoomClientSession,
  startZoomClientMeeting,
} from "@/lib/zoomClientSession";
import {
  defaultMainPlatformClientBranding,
  isZoomNativePrejoinVisible,
  resolveZoomClientBrandingFromStage,
  startZoomClientBranding,
  stopZoomClientBranding,
  type ZoomClientBranding,
} from "@/lib/zoomClientBranding";
import { ZoomClientBrandOverlay } from "@/components/live/ZoomClientBrandOverlay";
import { ZoomClientPrejoinOverlay } from "@/components/live/ZoomClientPrejoinOverlay";
import { ZoomSdkStartingSpinner } from "@/components/live/ZoomSdkStartingSpinner";
import { warnIfScreenShareUnsupported } from "@/components/live/zoomMeetingClient";
import type { HostBranding } from "@/components/live/HostWaitingStage";
import type { ParticipantBranding } from "@/components/live/ParticipantWaitingStage";
import { Button } from "@/components/ui/button";

type Props = {
  sdk: ZoomMeetingSdkAuth;
  isHost: boolean;
  clientBranding?: ZoomClientBranding | null;
  hostBranding?: HostBranding;
  participantBranding?: ParticipantBranding;
  onJoined?: () => void;
  onJoinError?: (message: string) => void;
  onReadyChange?: (ready: boolean) => void;
  meetingTitle?: string;
};

function setClientMeetingBodyClass(active: boolean) {
  document.documentElement.classList.toggle("zoom-client-meeting-active", active);
  document.body.classList.toggle("zoom-client-meeting-active", active);
}

export function ZoomClientMeeting({
  sdk,
  isHost,
  clientBranding,
  hostBranding,
  participantBranding,
  onJoined,
  onJoinError,
  onReadyChange,
  meetingTitle,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [nativePrejoinVisible, setNativePrejoinVisible] = useState(false);
  const joinedRef = useRef(false);
  const onJoinedRef = useRef(onJoined);
  const onJoinErrorRef = useRef(onJoinError);
  const onReadyChangeRef = useRef(onReadyChange);
  const sessionKey = `${sdk.meeting_number}:${sdk.signature}:${isHost ? "host" : "guest"}`;

  useEffect(() => {
    onJoinedRef.current = onJoined;
  }, [onJoined]);
  useEffect(() => {
    onJoinErrorRef.current = onJoinError;
  }, [onJoinError]);
  useEffect(() => {
    onReadyChangeRef.current = onReadyChange;
  }, [onReadyChange]);

  const stageBranding = isHost ? hostBranding : participantBranding;
  const resolvedClientBranding = useMemo(
    () =>
      clientBranding ??
      resolveZoomClientBrandingFromStage(stageBranding, isHost) ??
      defaultMainPlatformClientBranding(),
    [clientBranding, stageBranding, isHost],
  );

  const brandingKey = `${resolvedClientBranding.companyName}|${resolvedClientBranding.logoUrl ?? ""}|${resolvedClientBranding.institutionMode}`;

  useEffect(() => {
    onReadyChangeRef.current?.(false);
  }, [sessionKey]);

  useEffect(() => {
    return startZoomClientBranding(resolvedClientBranding);
  }, [brandingKey, resolvedClientBranding]);

  useEffect(() => {
    const syncPrejoin = () => setNativePrejoinVisible(isZoomNativePrejoinVisible());
    syncPrejoin();

    const root = document.getElementById("zmmtg-root");
    const observer = root
      ? new MutationObserver(syncPrejoin)
      : null;
    if (root && observer) {
      observer.observe(root, { childList: true, subtree: true, characterData: true });
    }

    const interval = window.setInterval(syncPrejoin, 350);
    return () => {
      observer?.disconnect();
      window.clearInterval(interval);
    };
  }, [sessionKey]);

  useEffect(() => {
    let cancelled = false;
    joinedRef.current = false;
    setJoined(false);
    setError(null);
    setClientMeetingBodyClass(true);
    warnIfScreenShareUnsupported();

    const run = async () => {
      try {
        await startZoomClientMeeting(sdk, isHost);
        if (cancelled) return;
        joinedRef.current = true;
        setJoined(true);
        onReadyChangeRef.current?.(true);
        onJoinedRef.current?.();
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to join the Zoom meeting.";
        setError(message);
        onJoinErrorRef.current?.(message);
      }
    };

    void run();

    return () => {
      cancelled = true;
      stopZoomClientBranding();
      if (!joinedRef.current && !isZoomClientMeetingJoined()) {
        setClientMeetingBodyClass(false);
        resetZoomClientSession(true);
      }
    };
  }, [sessionKey, sdk, isHost]);

  if (error) {
    return (
      <div className="zoom-client-meeting-loading px-6 text-center" style={{ pointerEvents: "auto" }}>
        <p className="max-w-md text-sm text-red-300">{error}</p>
        <Button
          type="button"
          className="mt-4 bg-[#0e72ed] hover:bg-[#0b5fc7]"
          onClick={() => window.location.reload()}
        >
          Try again
        </Button>
      </div>
    );
  }

  /* Smart spinner while joining; brand badge after join. */
  return (
    <>
      <ZoomSdkStartingSpinner
        active={!joined && !error && !nativePrejoinVisible}
        phase="joining"
        isHost={isHost}
        meetingTitle={meetingTitle}
        institutionName={resolvedClientBranding.companyName}
        logoUrl={resolvedClientBranding.logoUrl}
        fullscreen
      />
      <ZoomClientPrejoinOverlay
        branding={resolvedClientBranding}
        active={nativePrejoinVisible && !joined}
      />
      <ZoomClientBrandOverlay
        branding={resolvedClientBranding}
        active={joined || nativePrejoinVisible}
      />
    </>
  );
}
