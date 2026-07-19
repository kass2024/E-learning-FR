import { useEffect, useState, type ReactNode } from "react";
import { Loader2, LayoutGrid, Mic, MicOff, Monitor, Video, VideoOff } from "lucide-react";

type ZoomClient = {
  mute?: (mute: boolean, userId?: number) => unknown;
  setViewType?: (view: "speaker" | "gallery" | "ribbon") => void;
  getMediaStream?: () => {
    muteAudio?: () => Promise<void>;
    unmuteAudio?: () => Promise<void>;
    startAudio?: () => Promise<void>;
    stopVideo?: () => Promise<void>;
    startVideo?: () => Promise<void>;
  } | null;
  getCurrentUser?: () => { userId?: number; muted?: boolean; bVideoOn?: boolean } | null;
};

export type MeetingViewMode = "speaker" | "gallery";

type Props = {
  client: ZoomClient | null;
  initialAudio?: boolean;
  initialVideo?: boolean;
  viewMode?: MeetingViewMode;
  onViewModeChange?: (mode: MeetingViewMode) => void;
};

function ToolbarButton({
  label,
  active = true,
  danger = false,
  disabled,
  loading,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`group flex min-w-[72px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 transition-colors disabled:opacity-40 ${
        danger
          ? "text-red-400 hover:bg-red-500/15"
          : active
            ? "text-zinc-100 hover:bg-white/10"
            : "text-red-300 hover:bg-red-500/15"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
          danger
            ? "border-red-500/40 bg-red-500/20 group-hover:bg-red-500/30"
            : active
              ? "border-white/10 bg-[#2d2d2d] group-hover:bg-[#3a3a3a]"
              : "border-red-500/40 bg-red-500/20 group-hover:bg-red-500/30"
        }`}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
      </span>
      <span className="text-[11px] font-medium leading-none">{label}</span>
    </button>
  );
}

export function MeetingMediaBar({
  client,
  initialAudio = true,
  initialVideo = true,
  viewMode = "gallery",
  onViewModeChange,
}: Props) {
  const [audioOn, setAudioOn] = useState(initialAudio);
  const [videoOn, setVideoOn] = useState(initialVideo);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAudioOn(initialAudio);
    setVideoOn(initialVideo);
  }, [initialAudio, initialVideo]);

  const setView = (mode: MeetingViewMode) => {
    try {
      client?.setViewType?.(mode);
    } catch {
      // ignore
    }
    onViewModeChange?.(mode);
  };

  const toggleAudio = async () => {
    if (!client || busy) return;
    setBusy(true);
    try {
      const nextMuted = audioOn;
      client.mute?.(nextMuted);
      const stream = client.getMediaStream?.();
      if (stream) {
        if (nextMuted) {
          await stream.muteAudio?.();
        } else {
          await stream.startAudio?.();
          await stream.unmuteAudio?.();
        }
      }
      setAudioOn((v) => !v);
    } finally {
      setBusy(false);
    }
  };

  const toggleVideo = async () => {
    if (!client || busy) return;
    setBusy(true);
    try {
      const stream = client.getMediaStream?.();
      if (!stream) return;
      if (videoOn) {
        await stream.stopVideo?.();
      } else {
        await stream.startVideo?.();
      }
      setVideoOn((v) => !v);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shrink-0 border-t border-white/10 bg-[#232323] px-4 py-2.5">
      <div className="mx-auto flex max-w-4xl flex-wrap items-end justify-center gap-1 sm:gap-2">
        <ToolbarButton
          label={audioOn ? "Mute" : "Unmute"}
          active={audioOn}
          danger={!audioOn}
          disabled={!client}
          loading={busy}
          onClick={() => void toggleAudio()}
        >
          {audioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </ToolbarButton>

        <ToolbarButton
          label={videoOn ? "Stop Video" : "Start Video"}
          active={videoOn}
          danger={!videoOn}
          disabled={!client}
          loading={busy}
          onClick={() => void toggleVideo()}
        >
          {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </ToolbarButton>

        <div className="mx-1 hidden h-10 w-px bg-white/10 sm:block" />

        <ToolbarButton
          label="Speaker"
          active={viewMode === "speaker"}
          disabled={!client}
          onClick={() => setView("speaker")}
        >
          <Monitor className="h-5 w-5" />
        </ToolbarButton>

        <ToolbarButton
          label="Gallery"
          active={viewMode === "gallery"}
          disabled={!client}
          onClick={() => setView("gallery")}
        >
          <LayoutGrid className="h-5 w-5" />
        </ToolbarButton>
      </div>
    </div>
  );
}
