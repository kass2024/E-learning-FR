import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle, ChevronDown, Loader2, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingProfileAvatar } from "@/components/live/MeetingProfileAvatar";
import { resolveZoomBrandingLogoUrl } from "@/lib/zoomAvatars";
import { useMediaDevices, type MediaDevicePreferences } from "@/hooks/useMediaDevices";

type Props = {
  meetingTitle: string;
  userName: string;
  avatarUrl?: string | null;
  institutionName?: string | null;
  logoUrl?: string | null;
  isHost?: boolean;
  onJoin: (preferences: MediaDevicePreferences) => void;
  onCancel?: () => void;
};

export function ZoomPrejoinLobby({
  meetingTitle,
  userName,
  avatarUrl,
  institutionName,
  logoUrl,
  isHost = false,
  onJoin,
  onCancel,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const media = useMediaDevices();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (media.previewStream && media.videoOn) {
      video.srcObject = media.previewStream;
      void video.play().catch(() => undefined);
    } else {
      video.srcObject = null;
    }
  }, [media.previewStream, media.videoOn]);

  const handleJoin = () => {
    media.stopPreview();
    onJoin(media.buildPreferences());
  };

  const showVideoPreview = media.videoOn && media.previewStream && media.hasCamera;
  const resolvedLogo = resolveZoomBrandingLogoUrl(logoUrl);
  const previewAvatarUrl = resolvedLogo ?? avatarUrl;
  const headerLabel = institutionName?.trim() || meetingTitle;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-[#121212] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(14,114,237,0.28), transparent 55%)",
        }}
      />
      <div className="relative z-10 flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#1f1f1f]/95 px-4 py-2.5 backdrop-blur-sm pt-[max(0.625rem,env(safe-area-inset-top))]">
        {resolvedLogo ? (
          <img
            className="h-7 w-7 shrink-0 rounded-full object-cover bg-[#2d2d2d]"
            src={resolvedLogo}
            alt=""
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#0e72ed] text-[10px] font-bold">zm</span>
        )}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{headerLabel}</span>
          <span className="block text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            {isHost ? "Host prejoin" : "Waiting room · check mic & camera"}
          </span>
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center p-3 sm:p-8">
        <div className="w-full max-w-3xl">
          <div className="relative overflow-hidden rounded-xl bg-[#2d2d2d] shadow-2xl sm:rounded-2xl">
            <div className="relative flex aspect-video w-full items-center justify-center bg-[#1f1f1f]">
              {media.loading ? (
                <Loader2 className="h-10 w-10 animate-spin text-[#0e72ed]" />
              ) : showVideoPreview ? (
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[#3a3a3a] bg-[#3a3a3a] sm:h-36 sm:w-36">
                    <MeetingProfileAvatar
                      name={userName}
                      avatarUrl={previewAvatarUrl}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {!media.hasCamera && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      No camera connected
                    </p>
                  )}
                </div>
              )}

              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3 rounded-xl bg-black/70 px-3 py-2 backdrop-blur-sm">
                <PreviewToggle
                  active={media.audioOn}
                  label="Audio"
                  onClick={() => media.setAudioOn((v) => !v)}
                  iconOn={<Mic className="h-5 w-5" />}
                  iconOff={<MicOff className="h-5 w-5" />}
                  warn={!media.hasMicrophone}
                  level={media.audioOn ? media.audioLevel : 0}
                />
                <PreviewToggle
                  active={media.videoOn && media.hasCamera}
                  label="Video"
                  onClick={() => media.hasCamera && media.setVideoOn((v) => !v)}
                  iconOn={<Video className="h-5 w-5" />}
                  iconOff={<VideoOff className="h-5 w-5" />}
                  warn={!media.hasCamera}
                />
              </div>
            </div>

            <div className="space-y-4 bg-white p-4 text-zinc-900 sm:p-5">
              {media.permissionError && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{media.permissionError}</p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <DeviceSelect
                  icon={<Mic className="h-4 w-4 text-zinc-500" />}
                  label="Microphone"
                  value={media.audioInputId}
                  disabled={!media.hasMicrophone}
                  onChange={media.setAudioInputId}
                  options={media.devices.audioInputs.map((d, i) => ({
                    value: d.deviceId,
                    label: media.deviceLabel(d, `Microphone ${i + 1}`),
                  }))}
                  emptyLabel="No microphone found"
                />
                <DeviceSelect
                  icon={<Video className="h-4 w-4 text-zinc-500" />}
                  label="Camera"
                  value={media.videoInputId}
                  disabled={!media.hasCamera}
                  onChange={media.setVideoInputId}
                  options={media.devices.videoInputs.map((d, i) => ({
                    value: d.deviceId,
                    label: media.deviceLabel(d, `Camera ${i + 1}`),
                  }))}
                  emptyLabel="No camera connected"
                />
              </div>

              {media.devices.audioOutputs.length > 0 && (
                <DeviceSelect
                  icon={<Mic className="h-4 w-4 text-zinc-500" />}
                  label="Speaker"
                  value={media.audioOutputId}
                  onChange={media.setAudioOutputId}
                  options={media.devices.audioOutputs.map((d, i) => ({
                    value: d.deviceId,
                    label: media.deviceLabel(d, `Speaker ${i + 1}`),
                  }))}
                  emptyLabel="Default speaker"
                />
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div>
                  <p className="text-sm font-medium text-zinc-800">{userName}</p>
                  <p className="text-xs text-zinc-500">{isHost ? "Host" : "Participant"}</p>
                </div>
                <div className="flex gap-2">
                  {onCancel && (
                    <Button type="button" variant="outline" className="h-10" onClick={onCancel}>
                      Back
                    </Button>
                  )}
                  <Button
                    type="button"
                    className="h-10 min-w-[120px] bg-[#0e72ed] px-6 hover:bg-[#0b5fc7]"
                    onClick={handleJoin}
                  >
                    {!media.hasCamera ? "Join without camera" : "Join"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewToggle({
  active,
  label,
  onClick,
  iconOn,
  iconOff,
  warn,
  level = 0,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  iconOn: ReactNode;
  iconOff: ReactNode;
  warn?: boolean;
  level?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-16 flex-col items-center gap-1 rounded-lg px-2 py-1.5 transition-colors ${
        active ? "text-white" : "text-zinc-400"
      }`}
    >
      <span
        className={`relative flex h-10 w-10 items-center justify-center rounded-full ${
          active ? "bg-[#3a3a3a]" : "bg-[#2d2d2d] text-red-400"
        }`}
      >
        {active ? iconOn : iconOff}
        {warn && (
          <span className="absolute -right-0.5 -top-0.5 rounded-full bg-amber-500 p-0.5 text-black">
            <AlertTriangle className="h-2.5 w-2.5" />
          </span>
        )}
      </span>
      <span className="text-[10px]">{label}</span>
      {active && level > 0.05 && (
        <span className="flex h-1 w-10 overflow-hidden rounded-full bg-black/40">
          <span className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${level * 100}%` }} />
        </span>
      )}
    </button>
  );
}

function DeviceSelect({
  icon,
  label,
  value,
  onChange,
  options,
  emptyLabel,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  emptyLabel: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-600">{icon}{label}</span>
      <div className="relative">
        <select
          value={value}
          disabled={disabled || options.length === 0}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-zinc-300 bg-white px-3 pr-8 text-sm text-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
        >
          {options.length === 0 ? (
            <option value="">{emptyLabel}</option>
          ) : (
            options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      </div>
    </label>
  );
}
