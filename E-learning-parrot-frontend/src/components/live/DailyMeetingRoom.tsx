import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import DailyIframe, { type DailyCall, type DailyParticipant } from "@daily-co/daily-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  Check,
  ChevronUp,
  Circle,
  Copy,
  Hand,
  Info,
  LayoutDashboard,
  Loader2,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  RefreshCw,
  Square,
  Timer,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ZoomPrejoinLobby } from "@/components/live/ZoomPrejoinLobby";
import { MeetingProfileAvatar } from "@/components/live/MeetingProfileAvatar";
import { SpeakingWaveOverlay } from "@/components/live/SpeakingWaveOverlay";
import { AudioLevelIndicator } from "@/components/live/AudioLevelIndicator";
import { MeetingEngagementPanel } from "@/components/live/MeetingEngagementPanel";
import {
  expireSpeakingTimers,
  fetchSpeakingTimer,
  type StageMember,
} from "@/lib/meetingEngagementApi";
import type { MediaDevicePreferences } from "@/hooks/useMediaDevices";
import { resolvePublicJoinUrl } from "@/lib/publicJoinUrl";
import { resolveZoomBrandingLogoUrl } from "@/lib/zoomAvatars";
import { LOGO, logoUrl } from "@/lib/brandLogo";
import { HUB } from "@/lib/hubConfig";
import {
  canAdminParticipants,
  canSendMedia,
  resolveMeetingMode,
  resolveMeetingRole,
  toDailyCanSendUpdate,
  type DailySdkPermissions,
  type DailySendPermission,
  type MeetingMode,
  type MeetingRole,
  type SpeakingState,
} from "@/lib/meetingPermissions";
import {
  approveMeetingSpeaking,
  cancelMeetingHand,
  denyMeetingHand,
  fetchPendingHands,
  leaveMeetingModeration,
  raiseMeetingHand,
  revokeMeetingSpeaking,
  type HandRaiseRow,
} from "@/lib/meetingModerationApi";

export type DailyMeetingSdkAuth = {
  join_url?: string | null;
  room_url?: string | null;
  token?: string | null;
  room_name?: string | null;
  role?: number;
  user_name?: string | null;
  meeting_role?: MeetingRole | string | null;
  meeting_mode?: MeetingMode | string | null;
  permissions?: DailySdkPermissions | null;
};

export type DailyRemoteParticipantSnapshot = {
  sessionId: string;
  userName: string;
  audio: boolean;
  video: boolean;
};

export type DailyHostControls = {
  muteByName: (userName: string) => boolean;
  stopVideoByName: (userName: string) => boolean;
  removeByName: (userName: string) => boolean;
  findByName: (userName: string) => DailyRemoteParticipantSnapshot | null;
  listRemotes: () => DailyRemoteParticipantSnapshot[];
};

type ChatMessage = {
  id: string;
  from: string;
  text: string;
  at: number;
  local?: boolean;
};

type Props = {
  sdk: DailyMeetingSdkAuth;
  meetingTitle: string;
  userName?: string;
  avatarUrl?: string | null;
  institutionName?: string | null;
  logoUrl?: string | null;
  shareUrl?: string | null;
  isHost?: boolean;
  recording?: boolean;
  queueWaitingCount?: number;
  onJoined?: () => void;
  onLeft?: () => void;
  onCallEnded?: () => void;
  onJoinError?: (message: string) => void;
  onPrejoinCancel?: () => void;
  onToggleRecording?: (action: "start" | "stop", meta?: { clientHandled?: boolean }) => void;
  onOpenQueue?: () => void;
  leaveDashboardLabel?: string;
  hostControlsRef?: MutableRefObject<DailyHostControls | null>;
  onRemoteParticipantsChange?: (remotes: DailyRemoteParticipantSnapshot[]) => void;
};

let dailyLifecycle: Promise<void> = Promise.resolve();

function runDailyLifecycle<T>(task: () => Promise<T>): Promise<T> {
  const next = dailyLifecycle.then(task, task);
  dailyLifecycle = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function resolveJoinUrl(sdk: DailyMeetingSdkAuth): string {
  return String(sdk.join_url || sdk.room_url || "").trim();
}

function resolveToken(sdk: DailyMeetingSdkAuth): string {
  return String(sdk.token || "").trim();
}

function isAppShareUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || /daily\.co/i.test(trimmed)) return false;
  if (typeof window === "undefined") return trimmed.startsWith("/");
  try {
    const resolved = resolvePublicJoinUrl(trimmed);
    if (!resolved || /daily\.co/i.test(resolved)) return false;
    return new URL(resolved, window.location.origin).origin === window.location.origin;
  } catch {
    return trimmed.startsWith("/");
  }
}

export function buildDailyPrebuiltUrl(joinUrl: string, token: string, userName?: string): string {
  try {
    const url = new URL(joinUrl);
    url.searchParams.set("t", token);
    if (userName) url.searchParams.set("userName", userName);
    return url.toString();
  } catch {
    const sep = joinUrl.includes("?") ? "&" : "?";
    const name = userName ? `&userName=${encodeURIComponent(userName)}` : "";
    return `${joinUrl}${sep}t=${encodeURIComponent(token)}${name}`;
  }
}

async function destroyDailySingleton(): Promise<void> {
  try {
    const existing = typeof DailyIframe.getCallInstance === "function" ? DailyIframe.getCallInstance() : null;
    if (!existing) return;
    try {
      await existing.leave();
    } catch {
      // ignore
    }
    try {
      await existing.destroy();
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

/** Dynamic gallery columns for 1…N participants (Zoom-like). */
function galleryGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 9) return "grid-cols-2 md:grid-cols-3";
  if (count <= 16) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5";
}

function BrandTile({
  name,
  logo,
  label,
  compact = false,
}: {
  name: string;
  logo?: string | null;
  label?: string;
  compact?: boolean;
}) {
  const resolved = resolveZoomBrandingLogoUrl(logo) || (logo === null ? null : logoUrl(LOGO.src));
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] px-3 text-center">
      <div
        className={`overflow-hidden rounded-full border-4 border-[#3a3a3a] bg-[#2d2d2d] ${
          compact ? "h-16 w-16 sm:h-20 sm:w-20" : "h-24 w-24 sm:h-32 sm:w-32"
        }`}
      >
        <MeetingProfileAvatar
          name={name}
          avatarUrl={resolved}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className={`truncate font-semibold text-white ${compact ? "text-sm" : "text-base sm:text-lg"}`}>{name}</p>
        {label ? <p className="text-[11px] text-zinc-400">{label}</p> : null}
      </div>
    </div>
  );
}

function MicLevelBars({ level, muted }: { level: number; muted: boolean }) {
  const activeBars = muted ? 0 : Math.ceil(Math.min(1, Math.max(0, level)) * 5);
  return (
    <div className="mt-0.5 flex h-3 items-end gap-[2px]" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-[2px] rounded-sm transition-all duration-75 ${
            !muted && i <= activeBars ? "bg-emerald-400" : "bg-zinc-600"
          }`}
          style={{ height: 3 + i * 1.4 }}
        />
      ))}
    </div>
  );
}

function DailyDeviceMenu({
  kind,
  selectedId,
  devices,
  disabled,
  onSelect,
}: {
  kind: "audio" | "video";
  selectedId: string;
  devices: MediaDeviceInfo[];
  disabled?: boolean;
  onSelect: (deviceId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || devices.length === 0}
        onClick={() => setOpen((v) => !v)}
        className="rounded p-0.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 disabled:opacity-40"
        aria-label={kind === "audio" ? "Choose microphone" : "Choose camera"}
        title={devices.length === 0 ? `No ${kind === "audio" ? "microphone" : "camera"} found` : undefined}
      >
        <ChevronUp className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute bottom-full left-1/2 z-[220] mb-2 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-[#2a2a2a] py-1 shadow-xl">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {kind === "audio" ? "Microphone" : "Camera"}
          </p>
          {devices.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-400">No devices found</p>
          ) : (
            devices.map((device, index) => {
              const name =
                device.label?.trim() ||
                `${kind === "audio" ? "Microphone" : "Camera"} ${index + 1}`;
              const selected = device.deviceId === selectedId;
              return (
                <button
                  key={device.deviceId || `${kind}-${index}`}
                  type="button"
                  onClick={() => {
                    onSelect(device.deviceId);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {selected ? <Check className="h-3 w-3 text-emerald-400" /> : null}
                  </span>
                  <span className="truncate">{name}</span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

function ControlButton({
  label,
  active,
  danger,
  onClick,
  children,
  badge,
  disabled,
  deviceMenu,
  meter,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
  badge?: number;
  disabled?: boolean;
  deviceMenu?: ReactNode;
  meter?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-end gap-0.5">
        <button
          type="button"
          title={label}
          disabled={disabled}
          onClick={onClick}
          className={`relative flex h-11 min-w-[3rem] flex-col items-center justify-center gap-0.5 rounded-lg px-2.5 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            danger
              ? "bg-red-600 text-white hover:bg-red-500"
              : active
                ? "bg-[#0e72ed] text-white hover:bg-[#0b5fc7]"
                : "bg-[#3a3a3a] text-zinc-100 hover:bg-[#4a4a4a]"
          }`}
        >
          {children}
          {meter}
          <span className="leading-none">{label}</span>
          {typeof badge === "number" && badge > 0 ? (
            <span className="absolute -right-1 -top-1 rounded-full bg-[#0e72ed] px-1.5 py-0.5 text-[9px] font-semibold text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </button>
        {deviceMenu}
      </div>
    </div>
  );
}

/**
 * Zoom-style Daily room: device prejoin, dynamic multi-participant gallery,
 * and full meeting controls (mic/cam/share/participants/chat/info/record).
 */
export function DailyMeetingRoom({
  sdk,
  meetingTitle,
  userName: userNameProp,
  avatarUrl,
  institutionName,
  logoUrl: logoUrlProp,
  shareUrl,
  isHost = false,
  recording = false,
  queueWaitingCount = 0,
  onJoined,
  onLeft,
  onCallEnded,
  onJoinError,
  onPrejoinCancel,
  onToggleRecording,
  onOpenQueue,
  leaveDashboardLabel = "Back to dashboard",
  hostControlsRef,
  onRemoteParticipantsChange,
}: Props) {
  const { toast } = useToast();
  const callRef = useRef<DailyCall | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const remoteAudioEls = useRef<Record<string, HTMLAudioElement>>({});
  const joinedRef = useRef(false);
  const intentionalLeaveRef = useRef(false);
  const joinArgsRef = useRef({ joinUrl: "", token: "", displayName: "", devicePreferences: null as MediaDevicePreferences | null });
  const onJoinedRef = useRef(onJoined);
  const onLeftRef = useRef(onLeft);
  const onCallEndedRef = useRef(onCallEnded);
  const onJoinErrorRef = useRef(onJoinError);
  onJoinedRef.current = onJoined;
  onLeftRef.current = onLeft;
  onCallEndedRef.current = onCallEnded;
  onJoinErrorRef.current = onJoinError;

  const joinUrl = resolveJoinUrl(sdk);
  const token = resolveToken(sdk);
  const displayName =
    String(userNameProp || sdk.user_name || "").trim() ||
    (isHost ? String(institutionName || HUB.name).trim() || "Host" : "Participant");
  // Host chrome/branding logo — never apply this to a guest's own tile (that swaps profiles).
  const institutionLogo = resolveZoomBrandingLogoUrl(logoUrlProp) || logoUrl(LOGO.src);
  const selfAvatar = isHost
    ? resolveZoomBrandingLogoUrl(avatarUrl) || institutionLogo
    : resolveZoomBrandingLogoUrl(avatarUrl) || null;
  const brandLogo = institutionLogo;
  const roomName = String(sdk.room_name || "").trim();
  const meetingRole = resolveMeetingRole(sdk);
  const meetingMode = resolveMeetingMode(sdk);
  const trustedHost = isHost || meetingRole === "host" || meetingRole === "moderator";
  // Always prefer Daily room name so host + guests share one moderation key.
  const meetingKey = useMemo(() => {
    if (roomName) return roomName;
    const fromUrl = String(joinUrl || "").match(/daily\.co\/([^/?#]+)/i);
    if (fromUrl?.[1]) return decodeURIComponent(fromUrl[1]);
    try {
      const path = new URL(joinUrl).pathname.split("/").filter(Boolean).pop();
      if (path) return decodeURIComponent(path);
    } catch {
      // ignore
    }
    return joinUrl;
  }, [roomName, joinUrl]);
  const trustedHostRef = useRef(trustedHost);
  const meetingKeyRef = useRef(meetingKey);
  const speakingGrantActiveRef = useRef(false);
  const localSessionIdRef = useRef<string | null>(null);
  trustedHostRef.current = trustedHost;
  meetingKeyRef.current = meetingKey;

  const copyTarget = useMemo(() => {
    const preferred = resolvePublicJoinUrl(shareUrl);
    return isAppShareUrl(preferred) ? preferred : "";
  }, [shareUrl]);

  const [phase, setPhase] = useState<"prejoin" | "meeting" | "left">("prejoin");
  const [devicePreferences, setDevicePreferences] = useState<MediaDevicePreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [remoteScreen, setRemoteScreen] = useState<{ sessionId: string; name: string } | null>(null);
  const [recordingOn, setRecordingOn] = useState(recording);
  const [remotes, setRemotes] = useState<DailyParticipant[]>([]);
  const [panel, setPanel] = useState<"none" | "people" | "chat" | "info" | "hands" | "engage">("none");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [audioTrackEpoch, setAudioTrackEpoch] = useState(0);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [localPermissions, setLocalPermissions] = useState<DailySdkPermissions | null>(
    sdk.permissions ?? null,
  );
  const [speakingState, setSpeakingState] = useState<SpeakingState>(
    trustedHost ? "approved" : "listening",
  );
  const [pendingHands, setPendingHands] = useState<HandRaiseRow[]>([]);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const [approvalBanner, setApprovalBanner] = useState<string | null>(null);
  const [speakingSecondsLeft, setSpeakingSecondsLeft] = useState<number | null>(null);
  const [speakDurationSec, setSpeakDurationSec] = useState(120);
  const [stageOrder, setStageOrder] = useState<StageMember[]>([]);
  const desiredMicRef = useRef(false);
  const desiredCamRef = useRef(false);

  const audioAllowed = trustedHost || canSendMedia(localPermissions, "audio") || speakingState === "approved" || speakingState === "speaking";
  const videoAllowed = trustedHost || canSendMedia(localPermissions, "video");
  const screenAllowed = trustedHost || canSendMedia(localPermissions, "screenVideo");
  const micLocked = !trustedHost && !audioAllowed;
  const camLocked = !trustedHost && !videoAllowed;
  const handRaised = speakingState === "hand_raised";

  const hasMicrophone = audioInputs.length > 0;
  const hasCamera = videoInputs.length > 0;
  const localSpeaking = micOn && localAudioLevel > 0.06;
  const screenActive = sharing || Boolean(remoteScreen);

  joinArgsRef.current = { joinUrl, token, displayName, devicePreferences };

  useEffect(() => {
    setRecordingOn(recording);
  }, [recording]);

  const refreshDevices = async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const mics = list.filter((d) => d.kind === "audioinput");
      const cams = list.filter((d) => d.kind === "videoinput");
      setAudioInputs(mics);
      setVideoInputs(cams);
      setSelectedAudioId((prev) => prev || mics[0]?.deviceId || "");
      setSelectedVideoId((prev) => prev || cams[0]?.deviceId || "");
      return { mics, cams };
    } catch {
      setAudioInputs([]);
      setVideoInputs([]);
      return { mics: [] as MediaDeviceInfo[], cams: [] as MediaDeviceInfo[] };
    }
  };

  useEffect(() => {
    if (phase !== "meeting") return;
    void refreshDevices();
    const onChange = () => void refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", onChange);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", onChange);
  }, [phase]);

  // Local mic level — Web Audio from the live track is authoritative for guest unmute.
  // Daily's local-audio-level observer often stays at 0 for mid-call webinar grants.
  useEffect(() => {
    if (phase !== "meeting" || !micOn) {
      setLocalAudioLevel(0);
      const call = callRef.current;
      try {
        if (call?.isLocalAudioLevelObserverRunning?.()) call.stopLocalAudioLevelObserver();
      } catch {
        // ignore
      }
      return;
    }

    let raf = 0;
    let ctx: AudioContext | null = null;
    let stopped = false;
    let retryTimer: number | null = null;
    let dailyPeak = 0;
    let webAudioActive = false;
    const call = callRef.current;

    const onDailyLevel = (ev: { audioLevel?: number }) => {
      if (stopped) return;
      const raw = Number(ev?.audioLevel ?? 0);
      dailyPeak = Math.max(dailyPeak * 0.85, Math.min(1, Math.max(0, raw) * 1.35));
      // Only paint Daily levels when Web Audio is not yet attached.
      if (!webAudioActive) {
        setLocalAudioLevel(dailyPeak);
      }
    };

    const stopWebAudio = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      webAudioActive = false;
      if (ctx) {
        void ctx.close();
        ctx = null;
      }
    };

    const localAudioTrack = (): MediaStreamTrack | null => {
      const audio = callRef.current?.participants()?.local?.tracks?.audio as
        | { persistentTrack?: MediaStreamTrack; track?: MediaStreamTrack; state?: string }
        | undefined;
      const track = audio?.persistentTrack || audio?.track || null;
      return track && track.readyState !== "ended" ? track : null;
    };

    const beginWebAudioMetering = (track: MediaStreamTrack) => {
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return false;
        stopWebAudio();
        ctx = new Ctor();
        if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);

        const source = ctx.createMediaStreamSource(new MediaStream([track]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.28;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        webAudioActive = true;

        const tick = () => {
          if (stopped) return;
          if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => undefined);
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i += 1) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          const webLevel = Math.min(1, rms * 4.8);
          setLocalAudioLevel(Math.max(webLevel, dailyPeak * 0.5));
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return true;
      } catch {
        webAudioActive = false;
        return false;
      }
    };

    const startWebAudioWithRetry = (attempt = 0) => {
      if (stopped) return;
      const track = localAudioTrack();
      if (track && beginWebAudioMetering(track)) return;
      // Guests who unmute after raise-hand may need several seconds for the track.
      if (attempt < 100) {
        retryTimer = window.setTimeout(() => startWebAudioWithRetry(attempt + 1), 100);
      }
    };

    // Prefer Web Audio immediately; Daily observer is a secondary signal only.
    startWebAudioWithRetry();

    void (async () => {
      if (!call?.startLocalAudioLevelObserver) return;
      try {
        if (!call.isLocalAudioLevelObserverRunning?.()) {
          await call.startLocalAudioLevelObserver(80);
        }
        if (stopped) return;
        call.on("local-audio-level", onDailyLevel);
        try {
          const seed = Number(call.getLocalAudioLevel?.() ?? 0);
          if (seed > 0) {
            dailyPeak = Math.min(1, seed * 1.35);
            if (!webAudioActive) setLocalAudioLevel(dailyPeak);
          }
        } catch {
          // ignore
        }
      } catch {
        // Web Audio retry path already running.
      }
    })();

    return () => {
      stopped = true;
      if (retryTimer != null) window.clearTimeout(retryTimer);
      stopWebAudio();
      try {
        (call as { off?: (event: string, handler: (ev: { audioLevel?: number }) => void) => void })?.off?.(
          "local-audio-level",
          onDailyLevel,
        );
        if (call?.isLocalAudioLevelObserverRunning?.()) call.stopLocalAudioLevelObserver();
      } catch {
        // ignore
      }
    };
  }, [phase, micOn, audioTrackEpoch, selectedAudioId]);

  // Re-bind video / screen tracks after gallery tiles mount / remotes change.
  useEffect(() => {
    if (phase !== "meeting") return;
    const call = callRef.current;
    if (!call) return;
    const all = call.participants();
    const local = all.local;
    if (local?.video && local.tracks?.video?.persistentTrack && localVideoRef.current) {
      localVideoRef.current.srcObject = new MediaStream([local.tracks.video.persistentTrack]);
      void localVideoRef.current.play().catch(() => undefined);
    }

    const attachScreen = (p: DailyParticipant | undefined) => {
      const track = p?.tracks?.screenVideo?.persistentTrack;
      if (!track || !screenVideoRef.current) return;
      screenVideoRef.current.srcObject = new MediaStream([track]);
      void screenVideoRef.current.play().catch(() => undefined);
    };

    if (sharing && local?.screen) attachScreen(local);
    if (remoteScreen) {
      const remote = all[remoteScreen.sessionId] as DailyParticipant | undefined;
      attachScreen(remote);
    }

    remotes.forEach((p) => {
      const el = remoteVideoRefs.current[p.session_id];
      const track = p.tracks?.video?.persistentTrack;
      if (el && track && p.video) {
        el.srcObject = new MediaStream([track]);
        void el.play().catch(() => undefined);
      }
    });
  }, [phase, remotes, camOn, sharing, remoteScreen]);

  const participantCount = remotes.length + 1;
  const compactTiles = participantCount > 4;

  const copyJoinLink = async () => {
    if (!copyTarget) return;
    try {
      await navigator.clipboard.writeText(copyTarget);
      toast({ title: "Copied", description: "Meeting join link copied." });
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: "Could not copy the join link." });
    }
  };

  const goToLeftScreen = () => {
    setPhase("left");
    setLoading(false);
    setRemotes([]);
    setPanel("none");
    setSharing(false);
    setRemoteScreen(null);
    setLocalAudioLevel(0);
    Object.values(remoteAudioEls.current).forEach((el) => {
      try {
        el.pause();
        el.srcObject = null;
      } catch {
        // ignore
      }
    });
    remoteAudioEls.current = {};
    onCallEndedRef.current?.();
  };

  const leaveMeeting = async () => {
    intentionalLeaveRef.current = true;
    const call = callRef.current;
    const sessionId = localSessionId || call?.participants()?.local?.session_id;
    if (meetingKey && sessionId) {
      void leaveMeetingModeration({
        meeting_key: meetingKey,
        daily_session_id: String(sessionId),
      }).catch(() => undefined);
    }
    callRef.current = null;
    if (call) {
      try {
        await call.leave();
      } catch {
        // ignore
      }
      try {
        await call.destroy();
      } catch {
        // ignore
      }
    }
    goToLeftScreen();
  };

  useEffect(() => {
    if (phase !== "meeting" || !devicePreferences) return;

    let cancelled = false;
    intentionalLeaveRef.current = false;

    const fail = (message: string) => {
      if (cancelled) return;
      setError(message);
      setLoading(false);
      onJoinErrorRef.current?.(message);
    };

    const args = joinArgsRef.current;
    const joinUrlNow = args.joinUrl;
    const tokenNow = args.token;
    const nameNow = args.displayName;
    const prefs = args.devicePreferences;
    if (!joinUrlNow || !tokenNow || !prefs) {
      fail("Daily join details incomplete.");
      return () => {
        cancelled = true;
      };
    }

    setError(null);
    setLoading(true);
    joinedRef.current = false;
    desiredCamRef.current = Boolean(prefs.startWithVideo);
    desiredMicRef.current = Boolean(prefs.startWithAudio);
    setCamOn(desiredCamRef.current);
    setMicOn(desiredMicRef.current);
    if (prefs.audioInputId) setSelectedAudioId(prefs.audioInputId);
    if (prefs.videoInputId) setSelectedVideoId(prefs.videoInputId);

    const syncParticipants = (call: DailyCall) => {
      const all = call.participants();
      const list = Object.values(all).filter((p) => p && !p.local) as DailyParticipant[];
      setRemotes(list);

      const local = all.local;
      if (local) {
        setSharing(Boolean(local.screen));
        if (local.session_id) {
          const sid = String(local.session_id);
          localSessionIdRef.current = sid;
          setLocalSessionId(sid);
        }
        const perms = (local as { permissions?: DailySdkPermissions }).permissions;
        if (perms) {
          setLocalPermissions((prev) => {
            // Keep host-granted audio while Daily's participant permissions lag behind.
            if (
              speakingGrantActiveRef.current &&
              !canSendMedia(perms, "audio") &&
              !canAdminParticipants(perms) &&
              (canSendMedia(prev, "audio") || prev?.canSend === true)
            ) {
              return { ...perms, canSend: prev?.canSend ?? (["audio"] as DailySendPermission[]) };
            }
            return perms;
          });
          const maySendAudio = canSendMedia(perms, "audio") || canAdminParticipants(perms) || speakingGrantActiveRef.current;
          if (!maySendAudio && !trustedHost) {
            // Keep host-approved speaking state while Daily permissions catch up.
            // Do not force-mute during an active speaking grant (timer / raise-hand accept).
            setSpeakingState((prev) => {
              if (prev === "hand_raised" || prev === "approved" || prev === "speaking") return prev;
              if (speakingGrantActiveRef.current) return "approved";
              return "listening";
            });
            if (local.audio && !speakingGrantActiveRef.current) {
              void call.setLocalAudio(false);
              setMicOn(false);
              desiredMicRef.current = false;
            }
          } else if (maySendAudio && !trustedHost) {
            speakingGrantActiveRef.current = true;
            setSpeakingState((prev) => (prev === "speaking" || prev === "approved" ? prev : "approved"));
          }
        }
      }

      const sharer = list.find((p) => p.screen);
      if (sharer) {
        setRemoteScreen({
          sessionId: sharer.session_id,
          name: String(sharer.user_name || "Participant"),
        });
      } else if (!local?.screen) {
        setRemoteScreen(null);
      }
    };

    const playRemoteAudio = (participant: DailyParticipant) => {
      const track = participant.tracks?.audio?.persistentTrack;
      if (!track || participant.local) return;
      const id = participant.session_id;
      let audio = remoteAudioEls.current[id];
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        remoteAudioEls.current[id] = audio;
      }
      audio.srcObject = new MediaStream([track]);
      void audio.play().catch(() => undefined);
    };

    const attachTrack = (
      participant: DailyParticipant,
      kind: "video" | "audio" | "screenVideo",
    ) => {
      if (kind === "audio") {
        playRemoteAudio(participant);
        if (participant.local) setAudioTrackEpoch((n) => n + 1);
        return;
      }

      const track =
        kind === "screenVideo"
          ? participant.tracks?.screenVideo?.persistentTrack
          : participant.tracks?.video?.persistentTrack;
      if (!track) return;

      if (kind === "screenVideo") {
        if (participant.local) {
          setSharing(true);
          setRemoteScreen(null);
        } else {
          setRemoteScreen({
            sessionId: participant.session_id,
            name: String(participant.user_name || "Participant"),
          });
        }
        // Defer attach until the screen <video> mounts.
        requestAnimationFrame(() => {
          const el = screenVideoRef.current;
          if (!el) return;
          el.srcObject = new MediaStream([track]);
          void el.play().catch(() => undefined);
        });
        return;
      }

      const el = participant.local
        ? localVideoRef.current
        : remoteVideoRefs.current[participant.session_id];
      if (!el) return;
      el.srcObject = new MediaStream([track]);
      void el.play().catch(() => undefined);
    };

    const start = async () => {
      try {
        await runDailyLifecycle(async () => {
          if (cancelled) return;
          await destroyDailySingleton();

          const call = DailyIframe.createCallObject({
            dailyConfig: { useDevicePreferenceCookies: true },
          });
          if (cancelled) {
            await call.destroy();
            return;
          }
          callRef.current = call;

          call.on("joined-meeting", () => {
            if (cancelled || joinedRef.current) return;
            joinedRef.current = true;
            setLoading(false);
            setError(null);
            syncParticipants(call);
            setAudioTrackEpoch((n) => n + 1);
            onJoinedRef.current?.();
          });

          call.on("left-meeting", () => {
            // Ignore teardown from React Strict Mode / rejoin / intentional leave.
            if (cancelled || intentionalLeaveRef.current) return;
            goToLeftScreen();
          });

          call.on("error", (ev) => {
            const message =
              (ev as { errorMsg?: string })?.errorMsg ||
              (ev as { error?: { msg?: string } })?.error?.msg ||
              "Daily meeting error.";
            if (/camera|video|NotFoundError/i.test(message) && !prefs.startWithVideo) return;
            // Screen-share permission cancel is not a meeting failure.
            if (/screen|share|Permission denied|NotAllowedError/i.test(message)) {
              setSharing(false);
              return;
            }
            fail(message);
          });

          call.on("participant-updated", () => syncParticipants(call));
          call.on("participant-joined", () => syncParticipants(call));
          call.on("participant-left", (ev) => {
            const id = (ev as { participant?: { session_id?: string } })?.participant?.session_id;
            if (id && remoteAudioEls.current[id]) {
              try {
                remoteAudioEls.current[id].pause();
                remoteAudioEls.current[id].srcObject = null;
              } catch {
                // ignore
              }
              delete remoteAudioEls.current[id];
            }
            syncParticipants(call);
          });

          call.on("track-started", (ev) => {
            const p = ev?.participant;
            if (!p) return;
            const trackType = String((ev as { type?: string }).type || "");
            if (ev.track?.kind === "video") {
              if (trackType === "screenVideo" || p.screen) {
                attachTrack(p, "screenVideo");
              } else {
                attachTrack(p, "video");
              }
            }
            if (ev.track?.kind === "audio") {
              if (trackType === "screenAudio") {
                // optional: play system audio from share
                if (!p.local) {
                  const track = p.tracks?.screenAudio?.persistentTrack;
                  if (track) {
                    const audio = new Audio();
                    audio.autoplay = true;
                    audio.srcObject = new MediaStream([track]);
                    void audio.play().catch(() => undefined);
                    remoteAudioEls.current[`screen-${p.session_id}`] = audio;
                  }
                }
              } else {
                attachTrack(p, "audio");
              }
            }
            syncParticipants(call);
          });

          call.on("track-stopped", (ev) => {
            const trackType = String((ev as { type?: string }).type || "");
            const p = ev?.participant;
            if (trackType === "screenVideo") {
              if (p?.local) setSharing(false);
              else if (p?.session_id) {
                setRemoteScreen((prev) => (prev?.sessionId === p.session_id ? null : prev));
              }
              if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
            }
          });

          call.on("app-message", (ev) => {
            const data = (ev as { data?: Record<string, unknown> })?.data;
            if (!data) return;
            const type = String(data.type || "");
            if (type === "chat" && data.text) {
              setMessages((prev) => [
                ...prev,
                {
                  id: `${Date.now()}-${Math.random()}`,
                  from: String(data.from || "Participant"),
                  text: String(data.text),
                  at: Date.now(),
                },
              ]);
              return;
            }
            if (type === "speaking-approved") {
              const targetSid = String(data.sessionId || "").trim();
              const mySid = localSessionIdRef.current;
              if (targetSid && mySid && targetSid !== mySid) return;
              speakingGrantActiveRef.current = true;
              setSpeakingState("approved");
              const dur = Number(data.duration_seconds || 0);
              if (dur > 0) {
                setSpeakingSecondsLeft(dur);
                setApprovalBanner(`You may speak for ${Math.ceil(dur / 60)} min. Unmuting…`);
              } else {
                setSpeakingSecondsLeft(null);
                setApprovalBanner("You may now speak. Unmuting…");
              }
              const granted = Array.isArray(data.canSend)
                ? (data.canSend as DailySendPermission[])
                : data.canSend instanceof Set
                  ? (Array.from(data.canSend) as DailySendPermission[])
                  : data.canSend === true
                    ? true
                    : (["audio"] as DailySendPermission[]);
              setLocalPermissions((prev) => ({
                ...(prev || {}),
                canSend: granted === true ? true : granted.length > 0 ? granted : (["audio"] as DailySendPermission[]),
              }));
              toast({
                title: "Speaking approved",
                description: dur > 0 ? `Timer: ${Math.ceil(dur / 60)} minutes.` : "The host allowed you to unmute.",
              });
              // Auto-unmute after Daily permission update applies — guests should hear their mic waves immediately.
              const unmuteAfterGrant = async (attempt = 0): Promise<void> => {
                if (!speakingGrantActiveRef.current) return;
                try {
                  desiredMicRef.current = true;
                  await call.setLocalAudio(true);
                  const local = call.participants()?.local;
                  const track =
                    local?.tracks?.audio?.persistentTrack ||
                    (local?.tracks?.audio as { track?: MediaStreamTrack } | undefined)?.track;
                  if (!local?.audio && attempt < 8) {
                    window.setTimeout(() => void unmuteAfterGrant(attempt + 1), 250);
                    return;
                  }
                  setMicOn(true);
                  setSpeakingState("speaking");
                  setAudioTrackEpoch((n) => n + 1);
                  setApprovalBanner(
                    dur > 0
                      ? `You are live — ${Math.ceil(dur / 60)} min remaining.`
                      : "You are live. Speak when ready.",
                  );
                  if (!track && attempt < 8) {
                    window.setTimeout(() => setAudioTrackEpoch((n) => n + 1), 300);
                  }
                } catch {
                  if (attempt < 8) {
                    window.setTimeout(() => void unmuteAfterGrant(attempt + 1), 300);
                    return;
                  }
                  setApprovalBanner(
                    dur > 0
                      ? `You may speak for ${Math.ceil(dur / 60)} min. Press Unmute when ready.`
                      : "You may now speak. Press Unmute when ready.",
                  );
                }
              };
              window.setTimeout(() => void unmuteAfterGrant(0), 350);
              return;
            }
            if (type === "speaking-revoked") {
              const targetSid = String(data.sessionId || "").trim();
              const mySid = localSessionIdRef.current;
              if (targetSid && mySid && targetSid !== mySid) return;
              speakingGrantActiveRef.current = false;
              setSpeakingState("revoked");
              setApprovalBanner(null);
              setSpeakingSecondsLeft(null);
              setLocalPermissions((prev) => ({ ...(prev || {}), canSend: false }));
              void call.setLocalAudio(false);
              void call.setLocalVideo(false);
              setMicOn(false);
              setCamOn(false);
              desiredMicRef.current = false;
              desiredCamRef.current = false;
              toast({
                variant: "destructive",
                title: "Microphone access revoked",
                description: "Raise your hand again to request speaking.",
              });
              return;
            }
            if (type === "hand-raised") {
              if (!trustedHostRef.current) return;
              const sid = String(data.sessionId || "").trim();
              const name = String(data.name || "Participant").trim() || "Participant";
              if (!sid) return;
              setPendingHands((prev) => {
                if (prev.some((h) => h.daily_session_id === sid && h.status === "pending")) {
                  return prev;
                }
                return [
                  ...prev,
                  {
                    id: -Date.now(),
                    meeting_key: meetingKeyRef.current || "",
                    meeting_mode: String(data.meeting_mode || ""),
                    daily_session_id: sid,
                    participant_name: name,
                    status: "pending",
                    waiting_seconds: 0,
                  },
                ];
              });
              setPanel((p) => (p === "none" ? "hands" : p));
              toast({
                title: "Hand raised",
                description: `${name} is waiting to speak.`,
              });
              void refreshHands();
              return;
            }
            if (type === "hand-cancelled") {
              if (!trustedHostRef.current) return;
              const sid = String(data.sessionId || "").trim();
              if (sid) {
                setPendingHands((prev) => prev.filter((h) => h.daily_session_id !== sid));
              }
              void refreshHands();
              return;
            }
          });

          call.on("recording-started", () => setRecordingOn(true));
          call.on("recording-stopped", () => setRecordingOn(false));
          call.on("active-speaker-change", (ev) => {
            const id = (ev as { activeSpeaker?: { peerId?: string } })?.activeSpeaker?.peerId;
            setActiveSpeakerId(id ? String(id) : null);
          });

          // Attendees always join muted/camera-off regardless of prejoin preference.
          const forceAttendeeQuiet = !trustedHost;
          await call.join({
            url: joinUrlNow,
            token: tokenNow,
            userName: nameNow,
            startVideoOff: forceAttendeeQuiet ? true : !prefs.startWithVideo,
            startAudioOff: forceAttendeeQuiet ? true : !prefs.startWithAudio,
          });

          if (cancelled) return;

          await refreshDevices();

          try {
            const devices: { audioDeviceId?: string; videoDeviceId?: string } = {};
            if (prefs.audioInputId) devices.audioDeviceId = prefs.audioInputId;
            if (prefs.videoInputId && prefs.startWithVideo) {
              devices.videoDeviceId = prefs.videoInputId;
            }
            if (Object.keys(devices).length && typeof call.setInputDevicesAsync === "function") {
              await call.setInputDevicesAsync(devices);
            }
          } catch {
            // best-effort
          }

          try {
            const { mics, cams } = await refreshDevices();
            if (!mics.length) {
              desiredMicRef.current = false;
              setMicOn(false);
              await call.setLocalAudio(false);
            } else {
              await call.setLocalAudio(desiredMicRef.current);
              setMicOn(desiredMicRef.current);
              setAudioTrackEpoch((n) => n + 1);
            }
            if (!cams.length || !desiredCamRef.current) {
              desiredCamRef.current = false;
              setCamOn(false);
              await call.setLocalVideo(false);
            } else {
              await call.setLocalVideo(true);
              setCamOn(true);
            }
          } catch {
            // ignore
          }

          syncParticipants(call);
          setLoading(false);
          if (!joinedRef.current) {
            joinedRef.current = true;
            onJoinedRef.current?.();
          }
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to join Daily meeting.";
        if (/camera|NotFoundError|Permission/i.test(message) && !prefs.startWithVideo) {
          setLoading(false);
          return;
        }
        fail(message);
      }
    };

    void start();

    return () => {
      cancelled = true;
      intentionalLeaveRef.current = true;
      const call = callRef.current;
      callRef.current = null;
      void runDailyLifecycle(async () => {
        if (call) {
          try {
            await call.leave();
          } catch {
            // ignore
          }
          try {
            await call.destroy();
          } catch {
            // ignore
          }
        } else {
          await destroyDailySingleton();
        }
      });
    };
    // Join once per meeting entry — do not rejoin when parent refreshes token/name.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reloadKey]);

  const refreshHands = async () => {
    if (!trustedHostRef.current || !meetingKeyRef.current) return;
    try {
      const res = await fetchPendingHands(meetingKeyRef.current);
      setPendingHands(res.hands || []);
    } catch {
      // host panel is best-effort — realtime app-message still fills the list
    }
  };

  const toggleHandRaise = async () => {
    const call = callRef.current;
    const sessionId = localSessionId || call?.participants()?.local?.session_id;
    if (!meetingKey || !sessionId) {
      toast({
        variant: "destructive",
        title: "Not connected",
        description: "Join the meeting before raising your hand.",
      });
      return;
    }
    try {
      if (handRaised) {
        try {
          await cancelMeetingHand({ meeting_key: meetingKey, daily_session_id: String(sessionId) });
        } catch {
          // Still notify host over Daily if API is briefly unavailable.
        }
        setSpeakingState("listening");
        call?.sendAppMessage({ type: "hand-cancelled", sessionId }, "*");
        toast({ title: "Hand lowered" });
        return;
      }
      try {
        await raiseMeetingHand({
          meeting_key: meetingKey,
          daily_session_id: String(sessionId),
          participant_name: displayName,
          meeting_mode: meetingMode,
        });
      } catch (err: unknown) {
        // Persist failed — still signal host in-call so speaking can be approved live.
        const ax = err as { response?: { data?: { message?: string }; status?: number } };
        console.error("raise-hand API failed", ax?.response?.status, ax?.response?.data);
      }
      setSpeakingState("hand_raised");
      call?.sendAppMessage(
        { type: "hand-raised", sessionId, name: displayName, meeting_mode: meetingMode },
        "*",
      );
      toast({ title: "Hand raised", description: "Waiting for the host to approve speaking." });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not update hand raise",
        description: "Please try again.",
      });
    }
  };

  const hostApproveHand = async (
    hand: HandRaiseRow,
    opts?: { video?: boolean; stage?: boolean; duration?: number },
  ) => {
    const call = callRef.current;
    if (!call || !meetingKey) return;
    const duration = opts?.duration ?? speakDurationSec;
    try {
      const res = await approveMeetingSpeaking({
        meeting_key: meetingKey,
        daily_session_id: hand.daily_session_id,
        hand_raise_id: hand.id > 0 ? hand.id : undefined,
        audio: true,
        video: Boolean(opts?.video),
        invite_to_stage: Boolean(opts?.stage) || meetingMode === "webinar",
        duration_seconds: duration > 0 ? duration : undefined,
      });
      const canSend = res.daily_permissions?.canSend ?? ["audio"];
      const canSendUpdate = toDailyCanSendUpdate(canSend as boolean | string[]);
      try {
        call.updateParticipant(hand.daily_session_id, {
          updatePermissions: {
            hasPresence: true,
            canSend: canSendUpdate as boolean | Set<"audio" | "video" | "screenVideo" | "screenAudio">,
          },
        });
      } catch {
        // Fall through — app-message still unlocks guest UI; retry below.
      }
      // Retry shortly in case the first update races participant join.
      window.setTimeout(() => {
        try {
          callRef.current?.updateParticipant(hand.daily_session_id, {
            updatePermissions: {
              hasPresence: true,
              canSend: canSendUpdate as boolean | Set<"audio" | "video" | "screenVideo" | "screenAudio">,
            },
          });
        } catch {
          // ignore
        }
      }, 400);
      call.sendAppMessage(
        {
          type: "speaking-approved",
          sessionId: hand.daily_session_id,
          canSend: Array.isArray(canSend) ? canSend : canSend === true ? true : ["audio"],
          duration_seconds: duration > 0 ? duration : null,
        },
        "*",
      );
      toast({
        title: "Speaking approved",
        description:
          duration > 0
            ? `${hand.participant_name} may speak for ${Math.round(duration / 60)} min.`
            : `${hand.participant_name} may unmute.`,
      });
      await refreshHands();
    } catch {
      toast({
        variant: "destructive",
        title: "Approval failed",
        description: "Could not grant speaking permission.",
      });
    }
  };

  const hostRevokeSpeaking = async (sessionId: string, action: "mute" | "revoke" = "revoke") => {
    const call = callRef.current;
    if (!call || !meetingKey) return;
    try {
      const res = await revokeMeetingSpeaking({
        meeting_key: meetingKey,
        daily_session_id: sessionId,
        action,
      });
      if (action === "mute") {
        call.updateParticipant(sessionId, { setAudio: false });
      } else {
        const canSend = res.daily_permissions?.canSend ?? false;
        const canSendUpdate = toDailyCanSendUpdate(canSend as boolean | string[]);
        call.updateParticipant(sessionId, {
          setAudio: false,
          setVideo: false,
          updatePermissions: {
            canSend: canSendUpdate as boolean | Set<"audio" | "video" | "screenVideo" | "screenAudio">,
          },
        });
        call.sendAppMessage({ type: "speaking-revoked", sessionId }, "*");
      }
      toast({ title: action === "mute" ? "Participant muted" : "Speaking revoked" });
      await refreshHands();
    } catch {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: "Could not update participant permissions.",
      });
    }
  };

  const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

  const findRemoteByName = (userName: string): DailyParticipant | null => {
    const needle = normalizeName(userName);
    if (!needle) return null;
    return (
      remotes.find((p) => normalizeName(String(p.user_name || "")) === needle) ||
      remotes.find((p) => normalizeName(String(p.user_name || "")).includes(needle)) ||
      remotes.find((p) => needle.includes(normalizeName(String(p.user_name || "")))) ||
      null
    );
  };

  const snapshotRemote = (p: DailyParticipant): DailyRemoteParticipantSnapshot => ({
    sessionId: String(p.session_id),
    userName: String(p.user_name || "Participant"),
    audio: Boolean(p.audio),
    video: Boolean(p.video),
  });

  const hostMuteParticipant = (sessionId: string) => {
    const call = callRef.current;
    if (!call || !sessionId) return false;
    try {
      call.updateParticipant(sessionId, { setAudio: false });
      toast({ title: "Muted", description: "Participant microphone turned off." });
      return true;
    } catch {
      toast({ variant: "destructive", title: "Mute failed" });
      return false;
    }
  };

  const hostStopVideo = (sessionId: string) => {
    const call = callRef.current;
    if (!call || !sessionId) return false;
    try {
      call.updateParticipant(sessionId, { setVideo: false });
      toast({ title: "Camera off", description: "Participant camera turned off." });
      return true;
    } catch {
      toast({ variant: "destructive", title: "Stop video failed" });
      return false;
    }
  };

  const hostRemoveParticipant = (sessionId: string) => {
    const call = callRef.current;
    if (!call || !sessionId) return false;
    try {
      call.updateParticipant(sessionId, {
        eject: true,
        setAudio: false,
        setVideo: false,
      });
      toast({ title: "Removed", description: "Participant was removed from the call." });
      return true;
    } catch {
      toast({ variant: "destructive", title: "Remove failed" });
      return false;
    }
  };

  useEffect(() => {
    onRemoteParticipantsChange?.(remotes.map(snapshotRemote));
  }, [remotes, onRemoteParticipantsChange]);

  useEffect(() => {
    if (!hostControlsRef) return;
    hostControlsRef.current = {
      muteByName: (userName) => {
        const match = findRemoteByName(userName);
        return match ? hostMuteParticipant(String(match.session_id)) : false;
      },
      stopVideoByName: (userName) => {
        const match = findRemoteByName(userName);
        return match ? hostStopVideo(String(match.session_id)) : false;
      },
      removeByName: (userName) => {
        const match = findRemoteByName(userName);
        return match ? hostRemoveParticipant(String(match.session_id)) : false;
      },
      findByName: (userName) => {
        const match = findRemoteByName(userName);
        return match ? snapshotRemote(match) : null;
      },
      listRemotes: () => remotes.map(snapshotRemote),
    };
    return () => {
      hostControlsRef.current = null;
    };
  });

  const hostDenyHand = async (hand: HandRaiseRow) => {
    if (!meetingKey) return;
    try {
      if (hand.id > 0) {
        await denyMeetingHand({ meeting_key: meetingKey, hand_raise_id: hand.id });
      } else {
        // Optimistic/local-only row — drop it and ask the participant to cancel via session id.
        setPendingHands((prev) => prev.filter((h) => h.daily_session_id !== hand.daily_session_id));
        callRef.current?.sendAppMessage({ type: "hand-denied", sessionId: hand.daily_session_id }, "*");
      }
      await refreshHands();
      toast({ title: "Request denied" });
    } catch {
      toast({ variant: "destructive", title: "Could not deny request" });
    }
  };

  useEffect(() => {
    if (phase !== "meeting" || !trustedHost || !meetingKey) return;
    void refreshHands();
    const timer = window.setInterval(() => void refreshHands(), 2500);
    return () => window.clearInterval(timer);
  }, [phase, trustedHost, meetingKey]);

  // Speaking timer countdown + auto-revoke when expired
  useEffect(() => {
    if (phase !== "meeting" || !meetingKey || !localSessionId || trustedHost) return;
    let cancelled = false;

    const sync = async () => {
      try {
        const res = await fetchSpeakingTimer(meetingKey, localSessionId);
        if (cancelled) return;
        if (res.grant?.remaining_seconds != null) {
          speakingGrantActiveRef.current = true;
          setSpeakingSecondsLeft(Math.max(0, Number(res.grant.remaining_seconds)));
          setSpeakingState((prev) => (prev === "speaking" || prev === "approved" ? prev : "approved"));
          setLocalPermissions((prev) => ({
            ...(prev || {}),
            canSend: Array.isArray(prev?.canSend) || prev?.canSend instanceof Set || prev?.canSend === true
              ? prev?.canSend
              : (["audio"] as DailySendPermission[]),
          }));
        }
        if (!res.grant && (speakingState === "approved" || speakingState === "speaking")) {
          speakingGrantActiveRef.current = false;
          setSpeakingSecondsLeft(null);
        }
      } catch {
        // ignore
      }
    };

    void sync();
    const poll = window.setInterval(() => void sync(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [phase, meetingKey, localSessionId, trustedHost, speakingState]);

  useEffect(() => {
    if (speakingSecondsLeft == null || speakingSecondsLeft <= 0) return;
    const tick = window.setInterval(() => {
      setSpeakingSecondsLeft((prev) => {
        if (prev == null) return null;
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [speakingSecondsLeft != null]);

  useEffect(() => {
    if (speakingSecondsLeft !== 0 || trustedHost || !meetingKey) return;
    const call = callRef.current;
    void (async () => {
      try {
        if (trustedHost && meetingKey) {
          await expireSpeakingTimers(meetingKey);
        }
      } catch {
        // ignore
      }
      if (call && localSessionId) {
        void call.setLocalAudio(false);
        void call.setLocalVideo(false);
        setMicOn(false);
        setCamOn(false);
        desiredMicRef.current = false;
        desiredCamRef.current = false;
        setSpeakingState("revoked");
        setSpeakingSecondsLeft(null);
        speakingGrantActiveRef.current = false;
        setLocalPermissions((prev) => ({ ...(prev || {}), canSend: false }));
        setApprovalBanner(null);
        toast({
          variant: "destructive",
          title: "Speaking time ended",
          description: "Your speaking timer expired.",
        });
      }
    })();
  }, [speakingSecondsLeft, trustedHost, meetingKey, localSessionId, toast]);

  // Host: sweep expired timers and revoke Daily permissions
  useEffect(() => {
    if (phase !== "meeting" || !trustedHost || !meetingKey) return;
    const sweep = async () => {
      try {
        const res = await expireSpeakingTimers(meetingKey);
        const call = callRef.current;
        if (!call || !res.expired?.length) return;
        for (const row of res.expired) {
          call.updateParticipant(row.daily_session_id, {
            setAudio: false,
            setVideo: false,
            updatePermissions: { canSend: false },
          });
          call.sendAppMessage({ type: "speaking-revoked", sessionId: row.daily_session_id }, "*");
        }
      } catch {
        // ignore
      }
    };
    const timer = window.setInterval(() => void sweep(), 10000);
    return () => window.clearInterval(timer);
  }, [phase, trustedHost, meetingKey]);

  const orderedRemotes = useMemo(() => {
    if (stageOrder.length === 0) return remotes;
    const rank = new Map(stageOrder.map((m, i) => [m.daily_session_id, i]));
    return [...remotes].sort((a, b) => {
      const ai = rank.has(a.session_id) ? (rank.get(a.session_id) as number) : 9999;
      const bi = rank.has(b.session_id) ? (rank.get(b.session_id) as number) : 9999;
      return ai - bi;
    });
  }, [remotes, stageOrder]);

  const toggleCam = async () => {
    const call = callRef.current;
    if (!call) return;
    if (camLocked) {
      toast({
        title: "Camera locked",
        description: "Raise your hand and wait for the host to allow your camera.",
      });
      return;
    }
    if (!hasCamera && !camOn) {
      const { cams } = await refreshDevices();
      if (cams.length === 0) {
        toast({
          variant: "destructive",
          title: "No camera found",
          description: "Connect a camera to start video. Logo branding stays on.",
        });
        return;
      }
    }
    const next = !camOn;
    desiredCamRef.current = next;
    try {
      await call.setLocalVideo(next);
      setCamOn(next);
    } catch {
      desiredCamRef.current = false;
      toast({
        variant: "destructive",
        title: "Camera unavailable",
        description: "Continue with logo branding — camera stays off.",
      });
      setCamOn(false);
    }
  };

  const toggleMic = async () => {
    const call = callRef.current;
    if (!call) return;
    if (micLocked) {
      toast({
        title: "Microphone locked",
        description: "Raise your hand to speak. The host must approve first.",
      });
      return;
    }
    if (!hasMicrophone && !micOn) {
      const { mics } = await refreshDevices();
      if (mics.length === 0) {
        toast({
          variant: "destructive",
          title: "No microphone found",
          description: "Connect a microphone to unmute.",
        });
        return;
      }
    }
    const next = !micOn;
    desiredMicRef.current = next;
    try {
      await call.setLocalAudio(next);
      // Confirm Daily actually enabled the send track (webinar grants can lag).
      if (next) {
        for (let i = 0; i < 6; i += 1) {
          const local = call.participants()?.local;
          if (local?.audio) break;
          await new Promise((r) => window.setTimeout(r, 150));
          await call.setLocalAudio(true);
        }
      }
      const local = call.participants()?.local;
      const actuallyOn = next ? Boolean(local?.audio) : false;
      setMicOn(next ? actuallyOn || next : false);
      if (!next) setLocalAudioLevel(0);
      else {
        setAudioTrackEpoch((n) => n + 1);
        setSpeakingState("speaking");
        setApprovalBanner(null);
        // Re-kick metering after track appears.
        window.setTimeout(() => setAudioTrackEpoch((n) => n + 1), 400);
      }
      if (next && !actuallyOn) {
        toast({
          title: "Microphone starting…",
          description: "If waves stay flat, press Unmute once more.",
        });
      }
    } catch {
      desiredMicRef.current = false;
      setMicOn(false);
      setLocalAudioLevel(0);
      toast({
        variant: "destructive",
        title: "Cannot unmute",
        description: "Daily permissions still block audio. Ask the host to approve speaking.",
      });
    }
  };

  const switchAudioDevice = async (deviceId: string) => {
    const call = callRef.current;
    if (!call || !deviceId) return;
    setSelectedAudioId(deviceId);
    try {
      await call.setInputDevicesAsync({ audioDeviceId: deviceId });
      // Keep current mute state — never touch video when switching mic.
      await call.setLocalAudio(desiredMicRef.current);
      setMicOn(desiredMicRef.current);
    } catch {
      toast({
        variant: "destructive",
        title: "Microphone switch failed",
        description: "Could not switch to that microphone.",
      });
    }
  };

  const switchVideoDevice = async (deviceId: string) => {
    const call = callRef.current;
    if (!call || !deviceId) return;
    setSelectedVideoId(deviceId);
    try {
      await call.setInputDevicesAsync({ videoDeviceId: deviceId });
      if (desiredCamRef.current) {
        await call.setLocalVideo(true);
        setCamOn(true);
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Camera switch failed",
        description: "Could not switch to that camera.",
      });
    }
  };

  const toggleShare = async () => {
    const call = callRef.current;
    if (!call) return;
    if (!sharing && !screenAllowed) {
      toast({
        title: "Screen share locked",
        description: "Only hosts and approved presenters can share their screen.",
      });
      return;
    }
    try {
      if (sharing) {
        await call.stopScreenShare();
        setSharing(false);
        if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      } else {
        await call.startScreenShare();
        setSharing(true);
        setRemoteScreen(null);
      }
    } catch (err) {
      setSharing(false);
      const message = err instanceof Error ? err.message : "Could not share screen.";
      if (/Permission|NotAllowed|AbortError|cancel/i.test(message)) {
        toast({ title: "Screen share cancelled", description: "No screen was shared." });
        return;
      }
      toast({
        variant: "destructive",
        title: "Screen share failed",
        description: message,
      });
    }
  };

  const toggleRecording = async () => {
    const next = !recordingOn;
    const call = callRef.current;
    let clientHandled = false;

    // Prefer in-call Daily recording (host token). Do not also REST-start —
    // Daily returns 400 "room has an active stream" if both run.
    if (call) {
      try {
        if (next) {
          await call.startRecording({ type: "cloud" });
        } else {
          await call.stopRecording();
        }
        clientHandled = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // UI may be out of sync with an already-active cloud recording.
        if (next && /active stream|already.*(record|stream)/i.test(message)) {
          clientHandled = true;
        } else if (!next && /no active|not recording|not.*stream/i.test(message)) {
          clientHandled = true;
        }
        // Otherwise fall through to REST/backend.
      }
    }

    if (clientHandled) {
      setRecordingOn(next);
      toast({ title: next ? "Recording started" : "Recording stopped" });
      onToggleRecording?.(next ? "start" : "stop", { clientHandled: true });
      return;
    }

    if (onToggleRecording) {
      onToggleRecording(next ? "start" : "stop");
      setRecordingOn(next);
      return;
    }

    if (!call) return;
    try {
      if (next) {
        await call.startRecording({ type: "cloud" });
        setRecordingOn(true);
        toast({ title: "Recording started" });
      } else {
        await call.stopRecording();
        setRecordingOn(false);
        toast({ title: "Recording stopped" });
      }
    } catch (err) {
      setRecordingOn(false);
      toast({
        variant: "destructive",
        title: "Recording unavailable",
        description: err instanceof Error ? err.message : "Enable cloud recording on your Daily plan/domain.",
      });
    }
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text || !callRef.current) return;
    callRef.current.sendAppMessage({ type: "chat", text, from: displayName }, "*");
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-local`, from: displayName, text, at: Date.now(), local: true },
    ]);
    setChatInput("");
  };

  if (phase === "prejoin") {
    return (
      <ZoomPrejoinLobby
        meetingTitle={meetingTitle}
        userName={displayName}
        avatarUrl={selfAvatar}
        institutionName={institutionName || (isHost ? displayName : undefined)}
        logoUrl={brandLogo}
        isHost={isHost}
        onJoin={(preferences) => {
          setDevicePreferences(preferences);
          setPhase("meeting");
          if (isHost) onJoinedRef.current?.();
        }}
        onCancel={onPrejoinCancel}
      />
    );
  }

  if (phase === "left") {
    return (
      <div className="flex h-full min-h-[100dvh] w-full flex-col items-center justify-center bg-[#1a1a1a] px-6 text-center">
        <div className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-[#232323] p-8 shadow-xl">
          <p className="text-4xl" aria-hidden>
            👋
          </p>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">You&apos;ve left the call</h2>
            <p className="text-sm text-zinc-400">Return to the system dashboard to continue.</p>
          </div>
          <Button className="h-11 w-full bg-[#0e72ed] hover:bg-[#0b5fc7]" onClick={() => onLeftRef.current?.()}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {leaveDashboardLabel}
          </Button>
        </div>
      </div>
    );
  }

  const sideOpen = panel !== "none";

  return (
    <div className="relative flex h-full min-h-[100dvh] w-full flex-col bg-[#1a1a1a]">
      <header className="flex min-h-11 shrink-0 items-start justify-between gap-2 border-b border-white/10 bg-[#232323] px-3 py-2 sm:px-4 sm:py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1 pr-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 max-w-full text-sm font-medium leading-snug text-white sm:truncate">
              {meetingTitle}
            </p>
            <span className="shrink-0 rounded-full bg-[#0e72ed]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7eb6ff]">
              {meetingMode === "webinar" ? "Webinar" : "Meeting"}
            </span>
            {recordingOn ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <Circle className="h-2 w-2 fill-white" /> REC
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500 sm:line-clamp-1 sm:truncate">
            <span className="whitespace-nowrap">Daily · secure</span>
            {roomName ? (
              <>
                <span className="hidden sm:inline"> · </span>
                <span className="block sm:inline">{roomName}</span>
              </>
            ) : null}
            <span className="whitespace-nowrap">
              {trustedHost ? " · Host" : meetingMode === "webinar" ? " · Audience" : " · Attendee"}
              {` · ${participantCount} in call`}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-1.5 pt-0.5">
          {copyTarget ? (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 max-w-[9.5rem] bg-[#2d2d2d] text-xs text-zinc-100 hover:bg-[#3a3a3a] sm:max-w-none"
              onClick={() => void copyJoinLink()}
            >
              <Copy className="h-3.5 w-3.5 shrink-0 sm:mr-1.5" />
              <span className="hidden truncate sm:inline">Copy join link</span>
              <span className="truncate sm:hidden">Copy link</span>
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="max-w-lg text-sm text-red-300">{error}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              className="bg-[#0e72ed] hover:bg-[#0b5fc7]"
              onClick={() => {
                setError(null);
                setReloadKey((v) => v + 1);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button
              variant="secondary"
              className="bg-[#2d2d2d] text-zinc-100"
              onClick={() => {
                setError(null);
                setPhase("prejoin");
                setDevicePreferences(null);
              }}
            >
              Back to devices
            </Button>
            <Button variant="outline" className="border-zinc-600 text-zinc-200" onClick={() => void leaveMeeting()}>
              Leave
            </Button>
          </div>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#0e72ed]" />
              <p className="text-sm text-zinc-200">Entering meeting…</p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1">
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                {screenActive ? (
                  <div className="relative m-2 min-h-[42%] flex-[1.4] overflow-hidden rounded-xl border border-[#0e72ed]/50 bg-black">
                    <video ref={screenVideoRef} className="h-full w-full object-contain" playsInline autoPlay muted />
                    <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[11px] text-white">
                      {sharing ? "You are sharing screen" : `${remoteScreen?.name || "Participant"} is sharing`}
                    </span>
                    {sharing ? (
                      <Button
                        size="sm"
                        className="absolute right-2 top-2 h-7 bg-red-600 text-xs hover:bg-red-500"
                        onClick={() => void toggleShare()}
                      >
                        Stop share
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                <div
                  className={`grid min-h-0 flex-1 gap-2 p-2 auto-rows-fr ${galleryGridClass(participantCount)}`}
                >
                  <div
                    className={`relative min-h-[140px] overflow-hidden rounded-xl border bg-[#232323] sm:min-h-[180px] ${
                      localSpeaking ? "border-emerald-400 ring-2 ring-emerald-400/50" : "border-white/10"
                    }`}
                  >
                    {camOn ? (
                      <video ref={localVideoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
                    ) : (
                      <BrandTile
                        name={displayName}
                        logo={selfAvatar}
                        label={isHost ? "Host" : "You"}
                        compact={compactTiles}
                      />
                    )}
                    <SpeakingWaveOverlay
                      active={localSpeaking}
                      level={micOn ? localAudioLevel : 0}
                      label={displayName}
                      className="absolute left-1/2 top-3 z-10 -translate-x-1/2"
                    />
                    <span className="absolute bottom-2 left-2 max-w-[90%] truncate rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">
                      {displayName} (You)
                      {!micOn ? " · muted" : ""}
                    </span>
                  </div>

                  {orderedRemotes.map((p) => {
                    const name = String(p.user_name || "Participant");
                    const videoOn = Boolean(p.video);
                    const speaking = Boolean(p.audio) && activeSpeakerId === p.session_id;
                    return (
                      <div
                        key={p.session_id}
                        className={`relative min-h-[140px] overflow-hidden rounded-xl border bg-[#232323] sm:min-h-[180px] ${
                          speaking ? "border-emerald-400 ring-2 ring-emerald-400/50" : "border-white/10"
                        }`}
                      >
                        {videoOn ? (
                          <video
                            ref={(el) => {
                              remoteVideoRefs.current[p.session_id] = el;
                            }}
                            className="h-full w-full object-cover"
                            playsInline
                            autoPlay
                          />
                        ) : (
                          <BrandTile name={name} logo={null} compact={compactTiles} />
                        )}
                        <SpeakingWaveOverlay
                          active={speaking}
                          level={speaking ? 0.7 : 0}
                          label={name}
                          className="absolute left-1/2 top-3 z-10 -translate-x-1/2"
                        />
                        {trustedHost ? (
                          <div className="absolute right-2 top-2 z-20 flex gap-1 rounded-lg bg-black/70 p-1 opacity-90 hover:opacity-100">
                            <button
                              type="button"
                              title="Mute"
                              className="rounded p-1.5 text-white hover:bg-white/15 disabled:opacity-40"
                              disabled={!p.audio}
                              onClick={() => hostMuteParticipant(p.session_id)}
                            >
                              <MicOff className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Stop video"
                              className="rounded p-1.5 text-white hover:bg-white/15 disabled:opacity-40"
                              disabled={!p.video}
                              onClick={() => hostStopVideo(p.session_id)}
                            >
                              <VideoOff className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Remove"
                              className="rounded p-1.5 text-red-300 hover:bg-red-500/20"
                              onClick={() => {
                                if (window.confirm(`Remove ${name} from the call?`)) {
                                  hostRemoveParticipant(p.session_id);
                                }
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : null}
                        <span className="absolute bottom-2 left-2 max-w-[90%] truncate rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">
                          {name}
                          {!p.audio ? " · muted" : ""}
                          {p.screen ? " · sharing" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <AudioLevelIndicator level={localAudioLevel} muted={!micOn} />
              </div>

              {sideOpen ? (
                <aside className="flex w-[min(100vw,320px)] shrink-0 flex-col border-l border-white/10 bg-[#232323]">
                  <div className="flex h-11 items-center justify-between border-b border-white/10 px-3">
                    <p className="text-sm font-medium text-white">
                      {panel === "people"
                        ? "Participants"
                        : panel === "chat"
                          ? "Chat"
                          : panel === "hands"
                            ? "Raised hands"
                            : panel === "engage"
                              ? "Engage"
                              : "Meeting info"}
                    </p>
                    <button type="button" className="rounded p-1 text-zinc-400 hover:bg-white/10" onClick={() => setPanel("none")}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {panel === "people" ? (
                    <div className="flex-1 space-y-2 overflow-y-auto p-3">
                      <div className="flex items-center gap-2 rounded-lg bg-black/30 px-2 py-2">
                        <div className="h-8 w-8 overflow-hidden rounded-full">
                          <MeetingProfileAvatar name={displayName} avatarUrl={selfAvatar} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">{displayName} (You)</p>
                          <p className="text-[11px] text-zinc-500">
                            {trustedHost ? "Host" : meetingMode === "webinar" ? "Audience" : "Attendee"}
                            {micLocked ? " · mic locked" : ""}
                          </p>
                        </div>
                      </div>
                      {remotes.map((p) => (
                        <div key={p.session_id} className="rounded-lg bg-black/20 px-2 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 overflow-hidden rounded-full bg-[#3a3a3a]">
                              <MeetingProfileAvatar
                                name={String(p.user_name || "P")}
                                avatarUrl={null}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-white">{p.user_name || "Participant"}</p>
                              <p className="text-[11px] text-zinc-500">
                                {p.video ? "Camera on" : "Camera off"}
                                {p.audio ? "" : " · muted"}
                              </p>
                            </div>
                          </div>
                          {trustedHost ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 bg-[#2d2d2d] text-[11px] text-zinc-100"
                                onClick={() => hostMuteParticipant(p.session_id)}
                                disabled={!p.audio}
                              >
                                Mute
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 bg-[#2d2d2d] text-[11px] text-zinc-100"
                                onClick={() => hostStopVideo(p.session_id)}
                                disabled={!p.video}
                              >
                                Stop video
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-[11px]"
                                onClick={() => {
                                  if (window.confirm(`Remove ${p.user_name || "this participant"} from the call?`)) {
                                    hostRemoveParticipant(p.session_id);
                                  }
                                }}
                              >
                                Remove
                              </Button>
                              {meetingMode === "webinar" ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 bg-[#2d2d2d] text-[11px] text-zinc-100"
                                  onClick={() => void hostRevokeSpeaking(p.session_id, "revoke")}
                                >
                                  Revoke speak
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                      {trustedHost && onOpenQueue ? (
                        <Button
                          className="mt-2 w-full bg-[#0e72ed] hover:bg-[#0b5fc7]"
                          onClick={() => onOpenQueue()}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Open admit queue{queueWaitingCount > 0 ? ` (${queueWaitingCount})` : ""}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {panel === "hands" ? (
                    <div className="flex-1 space-y-2 overflow-y-auto p-3">
                      {trustedHost ? (
                        <div className="mb-2 flex items-center gap-2 rounded-lg bg-black/25 px-2 py-2">
                          <Timer className="h-3.5 w-3.5 text-zinc-400" />
                          <p className="text-[11px] text-zinc-400">Speak timer</p>
                          <select
                            value={speakDurationSec}
                            onChange={(e) => setSpeakDurationSec(Number(e.target.value))}
                            className="ml-auto h-7 rounded border border-white/10 bg-[#1a1a1a] px-2 text-[11px] text-white"
                          >
                            <option value={60}>1 min</option>
                            <option value={120}>2 min</option>
                            <option value={300}>5 min</option>
                            <option value={600}>10 min</option>
                            <option value={0}>No limit</option>
                          </select>
                        </div>
                      ) : null}
                      {pendingHands.length === 0 ? (
                        <p className="text-center text-xs text-zinc-500">No raised hands.</p>
                      ) : (
                        pendingHands.map((hand) => (
                          <div key={hand.id} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
                            <p className="text-sm font-medium text-white">{hand.participant_name}</p>
                            <p className="text-[11px] text-zinc-400">
                              Waiting {Math.max(0, hand.waiting_seconds || 0)}s
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                className="h-7 bg-emerald-600 text-[11px] hover:bg-emerald-500"
                                onClick={() => void hostApproveHand(hand)}
                              >
                                Allow mic
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 bg-[#0e72ed] text-[11px] hover:bg-[#0b5fc7]"
                                onClick={() => void hostApproveHand(hand, { video: true, stage: true })}
                              >
                                Mic + camera
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 bg-[#2d2d2d] text-[11px] text-zinc-100"
                                onClick={() => void hostDenyHand(hand)}
                              >
                                Deny
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}

                  {panel === "engage" && meetingKey ? (
                    <MeetingEngagementPanel
                      meetingKey={meetingKey}
                      trustedHost={trustedHost}
                      isWebinar={meetingMode === "webinar"}
                      sessionId={localSessionId}
                      displayName={displayName}
                      participants={remotes.map((p) => ({
                        session_id: p.session_id,
                        user_name: p.user_name,
                      }))}
                      onStageOrderChange={setStageOrder}
                      onBreakoutJoin={(url, name) => {
                        toast({
                          title: `Breakout: ${name}`,
                          description: "Opening breakout room in a new tab.",
                        });
                        window.open(url, "_blank", "noopener,noreferrer");
                      }}
                    />
                  ) : null}

                  {panel === "chat" ? (
                    <div className="flex min-h-0 flex-1 flex-col">
                      <div className="flex-1 space-y-2 overflow-y-auto p-3">
                        {messages.length === 0 ? (
                          <p className="text-center text-xs text-zinc-500">No messages yet.</p>
                        ) : (
                          messages.map((m) => (
                            <div
                              key={m.id}
                              className={`rounded-lg px-2.5 py-1.5 text-sm ${
                                m.local ? "ml-6 bg-[#0e72ed]/30 text-white" : "mr-6 bg-black/30 text-zinc-100"
                              }`}
                            >
                              <p className="text-[10px] text-zinc-400">{m.from}</p>
                              <p>{m.text}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex gap-2 border-t border-white/10 p-2">
                        <Input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Type a message…"
                          className="h-9 border-white/10 bg-black/30 text-white"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") sendChat();
                          }}
                        />
                        <Button className="h-9 bg-[#0e72ed] hover:bg-[#0b5fc7]" onClick={sendChat}>
                          Send
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {panel === "info" ? (
                    <div className="space-y-3 overflow-y-auto p-3 text-sm text-zinc-200">
                      <div>
                        <p className="text-[11px] uppercase text-zinc-500">Topic</p>
                        <p>{meetingTitle}</p>
                      </div>
                      {roomName ? (
                        <div>
                          <p className="text-[11px] uppercase text-zinc-500">Room</p>
                          <p className="break-all">{roomName}</p>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-[11px] uppercase text-zinc-500">Host display</p>
                        <p>{displayName}</p>
                      </div>
                      {copyTarget ? (
                        <div>
                          <p className="mb-1 text-[11px] uppercase text-zinc-500">Invite link</p>
                          <p className="mb-2 break-all text-xs text-zinc-400">{copyTarget}</p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-[#2d2d2d] text-zinc-100"
                            onClick={() => void copyJoinLink()}
                          >
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            Copy invite link
                          </Button>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-[11px] uppercase text-zinc-500">In call</p>
                        <p>{participantCount} people</p>
                      </div>
                    </div>
                  ) : null}
                </aside>
              ) : null}
            </div>
          )}

          {approvalBanner ? (
            <div
              role="status"
              aria-live="polite"
              className="absolute inset-x-0 top-12 z-20 mx-auto w-[min(92vw,420px)] rounded-xl border border-emerald-400/40 bg-emerald-950/90 px-4 py-3 text-center text-sm text-emerald-50 shadow-lg"
            >
              {approvalBanner}
              {speakingSecondsLeft != null && speakingSecondsLeft > 0 ? (
                <p className="mt-1 text-xs text-emerald-200/90">
                  Time left: {Math.floor(speakingSecondsLeft / 60)}:
                  {String(speakingSecondsLeft % 60).padStart(2, "0")}
                </p>
              ) : null}
            </div>
          ) : null}

          {speakingSecondsLeft != null && speakingSecondsLeft > 0 && !approvalBanner ? (
            <div className="absolute inset-x-0 top-12 z-20 mx-auto flex w-fit items-center gap-2 rounded-full border border-amber-400/40 bg-amber-950/90 px-3 py-1.5 text-xs text-amber-50">
              <Timer className="h-3.5 w-3.5" />
              Speaking {Math.floor(speakingSecondsLeft / 60)}:{String(speakingSecondsLeft % 60).padStart(2, "0")}
            </div>
          ) : null}

          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-[#1f1f1f] px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            <ControlButton
              label={
                micLocked
                  ? "Raise hand to speak"
                  : !hasMicrophone
                    ? "No mic"
                    : micOn
                      ? "Mute"
                      : speakingState === "approved"
                        ? "Unmute and speak"
                        : "Unmute"
              }
              danger={!micOn || !hasMicrophone || micLocked}
              disabled={!micLocked && !hasMicrophone && !micOn}
              onClick={() => void toggleMic()}
              meter={<MicLevelBars level={localAudioLevel} muted={!micOn} />}
              deviceMenu={
                micLocked ? undefined : (
                  <DailyDeviceMenu
                    kind="audio"
                    selectedId={selectedAudioId}
                    devices={audioInputs}
                    onSelect={(id) => void switchAudioDevice(id)}
                  />
                )
              }
            >
              {micLocked ? (
                <Lock className="h-4 w-4" />
              ) : micOn && hasMicrophone ? (
                <Mic className="h-4 w-4" />
              ) : (
                <MicOff className="h-4 w-4" />
              )}
            </ControlButton>
            <ControlButton
              label={camLocked ? "Camera locked" : !hasCamera ? "No camera" : camOn ? "Stop video" : "Start video"}
              danger={!camOn || !hasCamera || camLocked}
              disabled={!camLocked && !hasCamera && !camOn}
              onClick={() => void toggleCam()}
              deviceMenu={
                camLocked ? undefined : (
                  <DailyDeviceMenu
                    kind="video"
                    selectedId={selectedVideoId}
                    devices={videoInputs}
                    onSelect={(id) => void switchVideoDevice(id)}
                  />
                )
              }
            >
              {camLocked ? (
                <Lock className="h-4 w-4" />
              ) : camOn && hasCamera ? (
                <Video className="h-4 w-4" />
              ) : (
                <VideoOff className="h-4 w-4" />
              )}
            </ControlButton>
            {trustedHost || screenAllowed ? (
              <ControlButton
                label={sharing ? "Stop share" : remoteScreen ? "Viewing" : "Share"}
                active={screenActive}
                disabled={Boolean(remoteScreen) && !sharing}
                onClick={() => void toggleShare()}
              >
                <MonitorUp className="h-4 w-4" />
              </ControlButton>
            ) : null}
            {!trustedHost ? (
              <ControlButton
                label={handRaised ? "Lower hand" : "Raise hand"}
                active={handRaised}
                onClick={() => void toggleHandRaise()}
              >
                <Hand className="h-4 w-4" />
              </ControlButton>
            ) : (
              <ControlButton
                label="Hands"
                active={panel === "hands"}
                badge={pendingHands.length}
                onClick={() => setPanel((p) => (p === "hands" ? "none" : "hands"))}
              >
                <Hand className="h-4 w-4" />
              </ControlButton>
            )}
            <ControlButton
              label="Participants"
              active={panel === "people"}
              badge={participantCount}
              onClick={() => setPanel((p) => (p === "people" ? "none" : "people"))}
            >
              <Users className="h-4 w-4" />
            </ControlButton>
            <ControlButton
              label="Chat"
              active={panel === "chat"}
              badge={messages.length}
              onClick={() => setPanel((p) => (p === "chat" ? "none" : "chat"))}
            >
              <MessageSquare className="h-4 w-4" />
            </ControlButton>
            <ControlButton
              label="Engage"
              active={panel === "engage"}
              onClick={() => setPanel((p) => (p === "engage" ? "none" : "engage"))}
            >
              <BarChart3 className="h-4 w-4" />
            </ControlButton>
            <ControlButton
              label="Info"
              active={panel === "info"}
              onClick={() => setPanel((p) => (p === "info" ? "none" : "info"))}
            >
              <Info className="h-4 w-4" />
            </ControlButton>
            {trustedHost ? (
              <ControlButton
                label={recordingOn ? "Stop rec" : "Record"}
                danger={recordingOn}
                onClick={() => void toggleRecording()}
              >
                {recordingOn ? <Square className="h-4 w-4" /> : <Circle className="h-4 w-4 fill-current" />}
              </ControlButton>
            ) : null}
            {trustedHost && onOpenQueue ? (
              <ControlButton label="Queue" badge={queueWaitingCount} onClick={() => onOpenQueue()}>
                <Users className="h-4 w-4" />
              </ControlButton>
            ) : null}
            <ControlButton label="Leave" danger onClick={() => void leaveMeeting()}>
              <X className="h-4 w-4" />
            </ControlButton>
          </div>
        </>
      )}
    </div>
  );
}

/** @deprecated kept for DailyReturn page imports */
export function rememberDailyReturnPath(path = window.location.pathname + window.location.search): void {
  try {
    sessionStorage.setItem("daily_return_path", path);
  } catch {
    // ignore
  }
}

export function consumeDailyReturnPath(fallback = "/dashboard"): string {
  try {
    const path = sessionStorage.getItem("daily_return_path");
    sessionStorage.removeItem("daily_return_path");
    if (path && path.startsWith("/")) return path;
  } catch {
    // ignore
  }
  return fallback;
}
