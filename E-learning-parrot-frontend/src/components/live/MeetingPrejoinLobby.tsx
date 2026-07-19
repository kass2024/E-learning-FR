import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, Loader2 } from "lucide-react";

type Props = {
  displayName?: string;
  onJoin: (options: { audio: boolean; video: boolean }) => void;
  joining?: boolean;
};

function PrejoinControl({
  label,
  active,
  danger,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 disabled:opacity-40"
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
          danger
            ? "border-red-500/50 bg-red-500/20 text-red-300 group-hover:bg-red-500/30"
            : "border-white/10 bg-[#2d2d2d] text-zinc-100 group-hover:bg-[#3a3a3a]"
        }`}
      >
        {children}
      </span>
      <span className={`text-[11px] font-medium ${active ? "text-zinc-300" : "text-red-300"}`}>{label}</span>
    </button>
  );
}

export function MeetingPrejoinLobby({ displayName, onJoin, joining = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const startPreview = async () => {
      setPreviewError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        stream.getAudioTracks().forEach((track) => {
          track.enabled = audioOn;
        });
        stream.getVideoTracks().forEach((track) => {
          track.enabled = videoOn;
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setPreviewReady(true);
      } catch {
        if (!cancelled) {
          setPreviewError("Camera or microphone access was blocked. You can still join and use in-meeting controls.");
          setPreviewReady(false);
        }
      }
    };

    void startPreview();

    return () => {
      cancelled = true;
      stopPreview();
    };
  }, [stopPreview]);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = audioOn;
    });
  }, [audioOn]);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = videoOn;
    });
  }, [videoOn]);

  const handleJoin = () => {
    stopPreview();
    onJoin({ audio: audioOn, video: videoOn });
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
      <div className="space-y-1 text-center">
        <p className="text-xl font-semibold text-white">Ready to join?</p>
        {displayName && <p className="text-sm text-zinc-400">Joining as {displayName}</p>}
      </div>

      <div className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
        {videoOn && previewReady ? (
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover [transform:scaleX(-1)]" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#2d2d2d]">
            {previewError ? (
              <p className="max-w-sm px-6 text-center text-sm text-amber-200/80">{previewError}</p>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#3a3a3a]">
                <VideoOff className="h-8 w-8 text-zinc-500" />
              </div>
            )}
          </div>
        )}
        {!videoOn && previewReady && <video ref={videoRef} autoPlay playsInline muted className="hidden" />}
      </div>

      <div className="flex flex-wrap items-end justify-center gap-6">
        <PrejoinControl
          label={audioOn ? "Mute" : "Unmute"}
          active={audioOn}
          danger={!audioOn}
          disabled={joining}
          onClick={() => setAudioOn((v) => !v)}
        >
          {audioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </PrejoinControl>

        <PrejoinControl
          label={videoOn ? "Stop Video" : "Start Video"}
          active={videoOn}
          danger={!videoOn}
          disabled={joining}
          onClick={() => setVideoOn((v) => !v)}
        >
          {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </PrejoinControl>
      </div>

      <button
        type="button"
        className="rounded-lg bg-[#0e72ed] px-12 py-3 text-base font-semibold text-white transition-colors hover:bg-[#0b5fc7] disabled:opacity-60"
        onClick={handleJoin}
        disabled={joining}
      >
        {joining ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Joining…
          </span>
        ) : (
          "Join"
        )}
      </button>

      <p className="max-w-md text-center text-xs text-zinc-500">
        After joining, use the Zoom toolbar at the bottom for mute, video, participants, chat, screen share, and leave.
      </p>
    </div>
  );
}
