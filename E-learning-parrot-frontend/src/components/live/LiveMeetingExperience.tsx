import type { ZoomMeetingSdkAuth } from "@/api/axios";
import type { HostBranding } from "@/components/live/HostWaitingStage";
import type { ParticipantBranding } from "@/components/live/ParticipantWaitingStage";
import type { ZoomParticipant } from "@/components/live/zoomMeetingClient";
import type { MeetingShareDetails } from "@/lib/meetingShareDetails";
import type { ZoomClientBranding } from "@/lib/zoomClientBranding";
import {
  DailyMeetingRoom,
  type DailyHostControls,
  type DailyMeetingSdkAuth,
  type DailyRemoteParticipantSnapshot,
} from "@/components/live/DailyMeetingRoom";
import { ZoomMeetingExperience, type ZoomSdkView } from "@/components/live/ZoomMeetingExperience";
import type { MutableRefObject } from "react";

export type LiveMeetingProvider = "zoom" | "daily";

type Props = {
  provider?: LiveMeetingProvider | string | null;
  sdk: ZoomMeetingSdkAuth | DailyMeetingSdkAuth;
  meetingTitle: string;
  userName: string;
  avatarUrl?: string | null;
  isHost?: boolean;
  /** Public join URL shown/copied in Daily host chrome */
  shareUrl?: string | null;
  hostBranding?: HostBranding;
  participantBranding?: ParticipantBranding;
  clientBranding?: ZoomClientBranding | null;
  queueWaitingCount?: number;
  recording?: boolean;
  hostParticipantsOpen?: boolean;
  onHostParticipantsOpenChange?: (open: boolean) => void;
  onJoined?: () => void;
  onLeft?: () => void;
  onLeave?: () => void;
  onReconnect?: () => void;
  onJoinError?: (message: string) => void;
  onReadyChange?: (ready: boolean) => void;
  onParticipantRemoved?: (participant: ZoomParticipant) => void;
  onPrejoinCancel?: () => void;
  onToggleRecording?: (action: "start" | "stop", meta?: { clientHandled?: boolean }) => void;
  onOpenQueue?: () => void;
  leaveDashboardLabel?: string;
  fillContainer?: boolean;
  skipPrejoin?: boolean;
  meetingShare?: MeetingShareDetails | null;
  materialId?: number;
  hostEmail?: string;
  sdkView?: ZoomSdkView;
  hostControlsRef?: MutableRefObject<DailyHostControls | null>;
  onRemoteParticipantsChange?: (remotes: DailyRemoteParticipantSnapshot[]) => void;
};

function isDailySdk(sdk: ZoomMeetingSdkAuth | DailyMeetingSdkAuth): sdk is DailyMeetingSdkAuth {
  const daily = sdk as DailyMeetingSdkAuth;
  const joinUrl = String(daily.join_url || daily.room_url || "").trim();
  const token = String(daily.token || "").trim();
  return joinUrl.length > 0 && token.length > 0;
}

export function LiveMeetingExperience(props: Props) {
  const provider = (props.provider ?? "daily").toLowerCase();

  if (provider === "daily" && isDailySdk(props.sdk)) {
    const logoUrl =
      props.isHost || props.clientBranding?.institutionMode
        ? props.clientBranding?.logoUrl ??
          props.hostBranding?.avatarUrl ??
          props.participantBranding?.hostAvatarUrl
        : props.clientBranding?.logoUrl ?? null;
    const institutionName =
      props.isHost || props.clientBranding?.institutionMode
        ? props.clientBranding?.companyName ??
          props.hostBranding?.companyName ??
          props.participantBranding?.companyName
        : props.clientBranding?.companyName ?? undefined;

    return (
      <DailyMeetingRoom
        sdk={props.sdk}
        meetingTitle={props.meetingTitle}
        userName={
          props.isHost
            ? props.hostBranding?.name || props.clientBranding?.companyName || props.userName
            : props.userName
        }
        avatarUrl={
          props.isHost
            ? props.hostBranding?.avatarUrl || props.clientBranding?.logoUrl || props.avatarUrl
            : // Guests keep initials from their name/email — never inherit host institution logo.
              null
        }
        institutionName={institutionName}
        logoUrl={logoUrl}
        shareUrl={props.shareUrl}
        isHost={props.isHost}
        recording={props.recording}
        queueWaitingCount={props.queueWaitingCount}
        onToggleRecording={props.onToggleRecording}
        onOpenQueue={props.onOpenQueue}
        onPrejoinCancel={props.onPrejoinCancel}
        onJoined={() => {
          props.onReadyChange?.(true);
          props.onJoined?.();
        }}
        onCallEnded={() => {
          props.onReadyChange?.(false);
        }}
        onLeft={() => {
          props.onReadyChange?.(false);
          (props.onLeft ?? props.onLeave)?.();
        }}
        onJoinError={props.onJoinError}
        leaveDashboardLabel={
          props.leaveDashboardLabel ??
          (props.isHost ? "Back to dashboard" : "Back to waiting room")
        }
        hostControlsRef={props.hostControlsRef}
        onRemoteParticipantsChange={props.onRemoteParticipantsChange}
      />
    );
  }

  return <ZoomMeetingExperience {...props} sdk={props.sdk as ZoomMeetingSdkAuth} />;
}
