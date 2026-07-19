import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Circle,
  DoorOpen,
  Grid3X3,
  LayoutGrid,
  Link2,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  PhoneOff,
  Shield,
  Smile,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { MeetingDeviceMenu } from "@/components/live/MeetingDeviceMenu";
import {
  anyoneIsSharing,
  canUseScreenShare,
  clickSdkButton,
  endOrLeaveMeeting,
  isComputerAudioConnected,
  localUserIsSharing,
  openSdkReactions,
  openSdkSecurity,
  participantVideoOn,
  readCurrentZoomUser,
  setSdkCloudRecording,
  setSdkMeetingLocked,
  setSdkMuteAll,
  toggleSdkMute,
  toggleSdkShare,
  toggleSdkVideo,
  type CloudRecordingState,
  type ZoomEmbeddedClient,
} from "@/components/live/zoomMeetingClient";
import { useMeetingMicLevel } from "@/hooks/useMeetingMicLevel";

type Props = {
  client: ZoomEmbeddedClient;
  isHost?: boolean;
  participantCount: number;
  waitingRoomCount?: number;
  recordingState?: CloudRecordingState;
  meetingLocked?: boolean;
  audioInputId?: string;
  videoInputId?: string;
  audioOutputId?: string;
  viewMode: "speaker" | "gallery";
  onToggleView: () => void;
  onOpenParticipants: () => void;
  onOpenInvite?: () => void;
  autoAdmitEnabled?: boolean;
  autoAdmitBusy?: boolean;
  onToggleAutoAdmit?: (enabled: boolean) => void;
  onMeetingLockedChange?: (locked: boolean) => void;
  onLeave: () => void;
};

export function ZoomMeetingToolbar({
  client,
  isHost = false,
  participantCount,
  waitingRoomCount = 0,
  recordingState = "Stopped",
  meetingLocked = false,
  audioInputId,
  videoInputId,
  audioOutputId,
  viewMode,
  onToggleView,
  onOpenParticipants,
  onOpenInvite,
  autoAdmitEnabled = false,
  autoAdmitBusy = false,
  onToggleAutoAdmit,
  onMeetingLockedChange,
  onLeave,
}: Props) {
  const [muted, setMuted] = useState(true);
  const [audioConnected, setAudioConnected] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [localSharing, setLocalSharing] = useState(false);
  const [remoteSharing, setRemoteSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const screenShareSupported = canUseScreenShare();

  const { level: micLevel, pulseSpeaking } = useMeetingMicLevel({
    enabled: audioConnected,
    muted,
    deviceId: audioInputId,
  });

  const sync = useCallback(() => {
    const me = readCurrentZoomUser(client);
    if (!me) return;
    setMuted(Boolean(me.muted));
    setAudioConnected(isComputerAudioConnected(me));
    setVideoOn(participantVideoOn(me));
    setLocalSharing(localUserIsSharing(client));
    setRemoteSharing(anyoneIsSharing(client) && !localUserIsSharing(client));
  }, [client]);

  useEffect(() => {
    sync();
    const t = window.setInterval(sync, 900);
    return () => window.clearInterval(t);
  }, [sync]);

  useEffect(() => {
    const onSpeaker = (payload: Array<{ userId?: number }>) => {
      const me = readCurrentZoomUser(client);
      if (!me || !payload?.length) return;
      if (payload[0].userId === me.userId && !me.muted) {
        pulseSpeaking(0.92);
      }
    };
    client.on?.("active-speaker", onSpeaker);
    client.on?.("audio_active_speaker", onSpeaker);
    return () => {
      client.off?.("active-speaker", onSpeaker);
      client.off?.("audio_active_speaker", onSpeaker);
    };
  }, [client, pulseSpeaking]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      window.setTimeout(sync, 500);
    } finally {
      window.setTimeout(() => setBusy(false), 250);
    }
  };

  const handleShareToggle = () => {
    if (remoteSharing || busy) return;
    setBusy(true);
    void toggleSdkShare(client, localSharing)
      .then(() => sync())
      .finally(() => setBusy(false));
  };

  const handleEnd = () => {
    void run(async () => {
      await endOrLeaveMeeting(client, isHost);
      onLeave();
    });
  };

  const handleRecordingToggle = () => {
    void run(async () => {
      if (recordingState === "Recording") {
        await setSdkCloudRecording(client, "stop");
      } else {
        await setSdkCloudRecording(client, "start");
      }
    });
  };

  const handleLockToggle = () => {
    void run(async () => {
      const next = !meetingLocked;
      const ok = await setSdkMeetingLocked(client, next);
      if (ok) onMeetingLockedChange?.(next);
    });
  };

  const handleMuteAll = () => {
    void run(async () => {
      await setSdkMuteAll(client, true);
    });
  };

  const isRecording = recordingState === "Recording" || recordingState === "Paused";
  const peopleBadge =
    waitingRoomCount > 0
      ? String(waitingRoomCount)
      : participantCount > 0
        ? String(participantCount)
        : undefined;
  const peopleBadgeClass = waitingRoomCount > 0 ? "bg-amber-500" : "bg-[#0e72ed]";

  const handleAudioToggle = () => {
    void run(async () => {
      const isUnmuted = await toggleSdkMute(client);
      setMuted(!isUnmuted);
      setAudioConnected(isUnmuted || audioConnected);
    });
  };

  const displayLevel = muted ? 0 : micLevel;
  const activeBars = Math.ceil(Math.min(1, displayLevel) * 7);

  return (
    <footer className="zoom-meeting-toolbar shrink-0 border-t border-white/10 bg-[#232323]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-end justify-between gap-1 overflow-x-auto px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 sm:px-4 [&::-webkit-scrollbar]:hidden">
        <div className="flex shrink-0 items-end gap-0.5 sm:gap-2">
          <ToolbarControl
            label={muted ? "Unmute" : "Mute"}
            active={!muted && audioConnected}
            danger={muted || !audioConnected}
            disabled={busy}
            onClick={handleAudioToggle}
            deviceMenu={
              <MeetingDeviceMenu
                kind="audio-input"
                label="Audio"
                selectedId={audioInputId}
                disabled={busy}
              />
            }
            icon={muted || !audioConnected ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          >
            <AudioLevelMeter activeBars={activeBars} muted={muted} />
          </ToolbarControl>

          <ToolbarControl
            label="Video"
            active={videoOn}
            danger={!videoOn}
            disabled={busy}
            onClick={() => void run(async () => setVideoOn(await toggleSdkVideo()))}
            deviceMenu={
              <MeetingDeviceMenu
                kind="video-input"
                label="Video"
                selectedId={videoInputId}
                disabled={busy}
              />
            }
            icon={videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          />
        </div>

        <div className="flex shrink-0 items-end gap-0.5 sm:gap-1">
          {isHost && onToggleAutoAdmit ? (
            <ToolbarIcon
              label={autoAdmitEnabled ? "Auto-enter on" : "Auto-enter off"}
              active={autoAdmitEnabled}
              onClick={() => onToggleAutoAdmit(!autoAdmitEnabled)}
              disabled={autoAdmitBusy}
              className={autoAdmitEnabled ? "text-emerald-300" : ""}
            >
              <DoorOpen className="h-5 w-5" />
            </ToolbarIcon>
          ) : null}

          <ToolbarIcon
            label="People"
            onClick={onOpenParticipants}
            badge={peopleBadge}
            badgeClassName={peopleBadgeClass}
          >
            <Users className="h-5 w-5" />
          </ToolbarIcon>

          <ToolbarIcon label="Chat" onClick={() => void clickSdkButton(["chat", "open chat"])}>
            <MessageSquare className="h-5 w-5" />
          </ToolbarIcon>

          {isHost && onOpenInvite ? (
            <ToolbarIcon label="Invite" onClick={onOpenInvite}>
              <Link2 className="h-5 w-5" />
            </ToolbarIcon>
          ) : null}

          {isHost ? (
            <ToolbarIcon
              label={isRecording ? "Stop rec" : "Record"}
              active={isRecording}
              onClick={handleRecordingToggle}
              disabled={busy}
              className={isRecording ? "text-red-400" : ""}
            >
              <Circle className={`h-5 w-5 ${isRecording ? "fill-red-500 text-red-500" : ""}`} />
            </ToolbarIcon>
          ) : null}

          {screenShareSupported && (
          <ToolbarIcon
            label={localSharing ? "Stop" : remoteSharing ? "Presenting" : "Share"}
            active={localSharing || remoteSharing}
            onClick={handleShareToggle}
            disabled={busy || remoteSharing}
            className={remoteSharing ? "opacity-80" : ""}
          >
            <MonitorUp className="h-5 w-5" />
          </ToolbarIcon>
          )}

          <ToolbarIcon label="React" onClick={() => void openSdkReactions()}>
            <Smile className="h-5 w-5" />
          </ToolbarIcon>

          {isHost ? (
            <>
              <ToolbarIcon label="Mute all" onClick={handleMuteAll} disabled={busy}>
                <MicOff className="h-5 w-5" />
              </ToolbarIcon>
              <ToolbarIcon
                label={meetingLocked ? "Unlock" : "Lock"}
                active={meetingLocked}
                onClick={handleLockToggle}
                disabled={busy}
              >
                {meetingLocked ? <Lock className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
              </ToolbarIcon>
            </>
          ) : null}

          <ToolbarIcon
            label={viewMode === "gallery" ? "Speaker" : "Gallery"}
            onClick={onToggleView}
          >
            {viewMode === "gallery" ? <LayoutGrid className="h-5 w-5" /> : <Grid3X3 className="h-5 w-5" />}
          </ToolbarIcon>

          {isHost ? (
            <ToolbarIcon label="More" onClick={() => void openSdkSecurity()}>
              <MoreHorizontal className="h-5 w-5" />
            </ToolbarIcon>
          ) : null}
        </div>

        <div className="flex shrink-0 items-end pl-1">
          <button
            type="button"
            onClick={handleEnd}
            className="flex min-w-[56px] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-red-950/40 sm:min-w-[72px] sm:px-3"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-md shadow-red-900/30">
              <PhoneOff className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-medium text-red-400">{isHost ? "End" : "Leave"}</span>
          </button>
        </div>
      </div>
    </footer>
  );
}

function AudioLevelMeter({ activeBars, muted }: { activeBars: number; muted: boolean }) {
  return (
    <div
      className={`mt-1 flex h-4 items-end gap-[2px] rounded px-1 ${muted ? "opacity-40" : ""}`}
      aria-hidden
    >
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded-sm transition-all duration-75 ${
            !muted && i <= activeBars
              ? i >= 6
                ? "bg-amber-400"
                : i >= 4
                  ? "bg-emerald-400"
                  : "bg-emerald-500"
              : "bg-zinc-600"
          }`}
          style={{ height: 3 + i * 1.6 }}
        />
      ))}
    </div>
  );
}

function ToolbarControl({
  label,
  icon,
  active,
  danger,
  disabled,
  onClick,
  deviceMenu,
  children,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  deviceMenu?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 transition-colors hover:bg-white/5 disabled:opacity-50 ${
            danger ? "text-red-400" : "text-zinc-200"
          }`}
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              danger ? "bg-red-600/90 text-white" : "bg-[#3a3a3a]"
            } ${active ? "ring-2 ring-emerald-500/60" : ""}`}
          >
            {icon}
          </span>
          {children}
        </button>
        {deviceMenu}
      </div>
      <span className="text-[10px] text-zinc-400">{label}</span>
    </div>
  );
}

function ToolbarIcon({
  label,
  children,
  onClick,
  active,
  disabled,
  badge,
  badgeClassName = "bg-[#0e72ed]",
  className = "",
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
  badgeClassName?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-zinc-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50 ${className} ${
        active ? "text-[#6db3ff]" : ""
      }`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3a3a3a]">{children}</span>
      <span className="text-[10px] leading-none text-zinc-400">{label}</span>
      {badge && (
        <span
          className={`absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ${badgeClassName}`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
