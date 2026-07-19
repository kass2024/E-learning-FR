import { Suspense, lazy, useMemo, useState } from "react";

import { useSearchParams } from "react-router-dom";

import { ZoomPrejoinLobby } from "@/components/live/ZoomPrejoinLobby";

import { ZoomMeetingLoadingShell } from "@/components/live/ZoomMeetingLoadingShell";

import { ZoomClientMeeting } from "@/components/live/ZoomClientMeeting";

import type { HostBranding } from "@/components/live/HostWaitingStage";

import type { ParticipantBranding } from "@/components/live/ParticipantWaitingStage";

import type { ZoomParticipant } from "@/components/live/zoomMeetingClient";

import type { MediaDevicePreferences } from "@/hooks/useMediaDevices";

import type { MeetingShareDetails } from "@/lib/meetingShareDetails";

import type { ZoomMeetingSdkAuth } from "@/api/axios";

import type { ZoomClientBranding } from "@/lib/zoomClientBranding";



/** Client View = full Zoom Web Client (default). Component View = embeddable custom UI. */

export type ZoomSdkView = "client" | "component";

const EmbeddedZoomMeeting = lazy(() =>
  import("@/components/live/EmbeddedZoomMeeting").then((m) => ({ default: m.EmbeddedZoomMeeting })),
);

type Props = {

  sdk: ZoomMeetingSdkAuth;

  meetingTitle: string;

  userName: string;

  avatarUrl?: string | null;

  isHost?: boolean;

  hostBranding?: HostBranding;

  participantBranding?: ParticipantBranding;

  clientBranding?: ZoomClientBranding | null;

  queueWaitingCount?: number;

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

  fillContainer?: boolean;

  skipPrejoin?: boolean;

  meetingShare?: MeetingShareDetails | null;

  materialId?: number;

  hostEmail?: string;

  /** Default client. Use component for custom embedded UI (?view=component). */

  sdkView?: ZoomSdkView;

};



export function ZoomMeetingExperience({

  sdk,

  meetingTitle,

  userName,

  avatarUrl,

  isHost = false,

  hostBranding,

  participantBranding,

  clientBranding,

  queueWaitingCount = 0,

  hostParticipantsOpen = false,

  onHostParticipantsOpenChange,

  onJoined,

  onLeft,

  onLeave,

  onReconnect,

  onJoinError,

  onReadyChange,

  onParticipantRemoved,

  onPrejoinCancel,

  fillContainer = true,

  skipPrejoin,

  meetingShare = null,

  materialId,

  hostEmail = "",

  sdkView: sdkViewProp,

}: Props) {

  const [searchParams] = useSearchParams();

  const sdkView: ZoomSdkView = useMemo(() => {

    if (sdkViewProp) return sdkViewProp;

    const q = searchParams.get("view")?.toLowerCase();

    if (q === "component" || q === "embed") return "component";

    return "client";

  }, [sdkViewProp, searchParams]);



  const useClientView = sdkView === "client";

  const resolvedSkipPrejoin = skipPrejoin ?? useClientView;



  const [phase, setPhase] = useState<"prejoin" | "meeting">(resolvedSkipPrejoin ? "meeting" : "prejoin");

  const [devicePreferences, setDevicePreferences] = useState<MediaDevicePreferences | null>(null);



  if (phase === "prejoin") {

    const prejoinLogo =
      clientBranding?.logoUrl ??
      hostBranding?.avatarUrl ??
      participantBranding?.hostAvatarUrl;
    const prejoinInstitution =
      clientBranding?.companyName ??
      hostBranding?.companyName ??
      participantBranding?.companyName;

    return (

      <ZoomPrejoinLobby

        meetingTitle={meetingTitle}

        userName={userName}

        avatarUrl={avatarUrl}

        institutionName={prejoinInstitution}

        logoUrl={prejoinLogo}

        isHost={isHost}

        onJoin={(preferences) => {

          setDevicePreferences(preferences);

          setPhase("meeting");

        }}

        onCancel={onPrejoinCancel}

      />

    );

  }



  if (useClientView) {

    return (

      <ZoomClientMeeting
        key={`${sdk.meeting_number}-${sdk.signature}-${isHost && sdk.role === 1 ? "host" : "guest"}`}
        sdk={sdk}
        isHost={isHost && sdk.role === 1}
        clientBranding={clientBranding}
        hostBranding={hostBranding}
        participantBranding={participantBranding}
        meetingTitle={meetingTitle}

        onJoined={onJoined}

        onJoinError={onJoinError}

        onReadyChange={onReadyChange}

      />

    );

  }



  return (

    <Suspense
      fallback={
        <ZoomMeetingLoadingShell
          phase="loading-sdk"
          isHost={isHost}
          meetingTitle={meetingTitle}
          institutionName={clientBranding?.companyName ?? hostBranding?.companyName}
          logoUrl={clientBranding?.logoUrl ?? hostBranding?.avatarUrl}
        />
      }
    >
      <EmbeddedZoomMeeting

        key={`${sdk.meeting_number}-${devicePreferences?.audioInputId ?? "default"}`}

        sdk={sdk}

        meetingTitle={meetingTitle}

        isHost={isHost}

        hostBranding={hostBranding}

        participantBranding={participantBranding}

        queueWaitingCount={queueWaitingCount}

        hostParticipantsOpen={hostParticipantsOpen}

        onHostParticipantsOpenChange={onHostParticipantsOpenChange}

        devicePreferences={devicePreferences ?? undefined}

        onJoined={onJoined}

        onLeft={onLeft}

        onLeave={onLeave}

        onReconnect={onReconnect}

        onJoinError={onJoinError}

        onReadyChange={onReadyChange}

        onParticipantRemoved={onParticipantRemoved}

        fillContainer={fillContainer}

        meetingShare={meetingShare}

        materialId={materialId}

        hostEmail={hostEmail}

      />

    </Suspense>

  );

}


