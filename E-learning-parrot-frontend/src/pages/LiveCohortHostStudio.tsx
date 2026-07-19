import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Loader2, RefreshCw, Users } from "lucide-react";
import { ZoomSdkStartingSpinner } from "@/components/live/ZoomSdkStartingSpinner";
import {
  admitAllLiveZoomCohortWaiting,
  admitLiveZoomCohortEntry,
  admitNextLiveZoomCohortWaiting,
  getLiveZoomCohortHostSdkAuth,
  getLiveZoomCohortQueue,
  markLiveCohortHostInMeeting,
  markLiveCohortHostLeft,
  releaseLiveZoomCohortParticipant,
  releaseLiveZoomCohortQueueEntry,
  toggleLiveCohortRecording,
  type LiveZoomCohortQueueEntry,
  type ZoomMeetingSdkAuth,
} from "@/api/axios";
import { LiveMeetingExperience } from "@/components/live/LiveMeetingExperience";
import type { DailyHostControls, DailyMeetingSdkAuth } from "@/components/live/DailyMeetingRoom";
import type { ZoomParticipant } from "@/components/live/zoomMeetingClient";
import { HostQueuePanel } from "@/components/live/HostQueuePanel";
import type { HostBranding } from "@/components/live/HostWaitingStage";
import { resolvePublicJoinUrl } from "@/lib/publicJoinUrl";
import { cohortPublicJoin } from "@/lib/zoomEmbedRoutes";
import { clearZoomLaunchPending } from "@/lib/zoomLaunchPending";
import { buildZoomMeetingBranding } from "@/lib/zoomMeetingBranding";
import type { ZoomClientBranding } from "@/lib/zoomClientBranding";
import { refreshInstitutionBrandingFromApi, isStoredMainAdmin, prepareMainAdminZoomSession, showsPlatformHubBranding } from "@/lib/institutionContext";
import { getAppDisplayName } from "@/lib/brandSanitize";
import { resolveZoomSdkJoinUserName } from "@/lib/zoomJoinDisplayName";
import { HUB } from "@/lib/hubConfig";
import { sanitizeLegacyBrandText } from "@/lib/brandSanitize";
import { isZoomCdnAvatarUrl } from "@/lib/zoomAvatars";
import { useToast } from "@/components/ui/use-toast";
import "@/components/live/zoomClientMeeting.css";

type CohortHostSdk = ZoomMeetingSdkAuth | DailyMeetingSdkAuth;

function isDailySdk(sdk: CohortHostSdk): sdk is DailyMeetingSdkAuth {
  const daily = sdk as DailyMeetingSdkAuth;
  const joinUrl = String(daily.join_url || daily.room_url || "").trim();
  const token = String(daily.token || "").trim();
  return joinUrl.length > 0 && token.length > 0;
}

const LiveCohortHostStudio = () => {
  const { cohortId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const id = Number(cohortId || 0);

  const [loading, setLoading] = useState(true);
  const [sdk, setSdk] = useState<CohortHostSdk | null>(null);
  const [meetingProvider, setMeetingProvider] = useState<"zoom" | "daily">("daily");
  const [hostBranding, setHostBranding] = useState<HostBranding | null>(null);
  const [clientBranding, setClientBranding] = useState<ZoomClientBranding | null>(null);
  const [current, setCurrent] = useState<LiveZoomCohortQueueEntry | null>(null);
  const [inSession, setInSession] = useState<LiveZoomCohortQueueEntry[]>([]);
  const [waiting, setWaiting] = useState<LiveZoomCohortQueueEntry[]>([]);
  const [admittedReady, setAdmittedReady] = useState<LiveZoomCohortQueueEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [queueRefreshing, setQueueRefreshing] = useState(false);
  const [queuePanelOpen, setQueuePanelOpen] = useState(false);
  const [meetingReady, setMeetingReady] = useState(false);
  const staleMeetingRetryRef = useRef(false);
  const hasConnectedOnceRef = useRef(false);
  const hostControlsRef = useRef<DailyHostControls | null>(null);

  const publicJoinUrl = resolvePublicJoinUrl(id ? cohortPublicJoin(id) : "");

  const applyQueue = (data: {
    current: LiveZoomCohortQueueEntry | null;
    waiting: LiveZoomCohortQueueEntry[];
    admitted_ready?: LiveZoomCohortQueueEntry[];
    in_session?: LiveZoomCohortQueueEntry[];
  }) => {
    setCurrent(data.current);
    setWaiting(data.waiting ?? []);
    setAdmittedReady(data.admitted_ready ?? []);
    setInSession(data.in_session ?? (data.current ? [data.current] : []));
  };

  const loadQueue = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setQueueRefreshing(true);
      try {
        const data = await getLiveZoomCohortQueue(id);
        applyQueue(data);
      } finally {
        if (!silent) setQueueRefreshing(false);
      }
    },
    [id],
  );

  const bootstrap = useCallback(
    async (options?: { forceRefresh?: boolean; meetingStale?: boolean }) => {
      if (!id) return;
      const forceRefresh = options?.forceRefresh ?? false;
      const meetingStale = options?.meetingStale ?? false;
      const isInitialLoad = !hasConnectedOnceRef.current && !sdk;
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);
      setWarning(null);
      if (isInitialLoad) {
        setMeetingReady(false);
      }
      try {
        prepareMainAdminZoomSession();
        if (!isStoredMainAdmin()) {
          await refreshInstitutionBrandingFromApi();
        }
        const auth = await getLiveZoomCohortHostSdkAuth(id, {
          forceRefresh,
          meetingStale,
          refreshHostProfile: true,
        });

        const provider = (auth.provider === "daily" || isDailySdk(auth.sdk) ? "daily" : "zoom") as "zoom" | "daily";
        setMeetingProvider(provider);

        const hostName = auth.host?.name || "Host";
        if (provider === "daily") {
          const raw = (auth.sdk ?? {}) as DailyMeetingSdkAuth & { room_url?: string };
          const joinUrl = String(raw.join_url || raw.room_url || auth.daily?.room_url || "").trim();
          const token = String(raw.token || "").trim();
          if (!joinUrl || !token) {
            setError("Daily room was not prepared correctly. Click Refresh session.");
            setSdk(null);
            return;
          }
          setSdk({
            join_url: joinUrl,
            token,
            room_name: raw.room_name || auth.daily?.room_name || undefined,
            user_name: hostName,
            role: 1,
          });
        } else {
          setSdk({
            ...(auth.sdk as ZoomMeetingSdkAuth),
            user_name: resolveZoomSdkJoinUserName(auth, { isHost: true, fallbackName: hostName }),
          });
        }
        applyQueue(auth.queue);

        // Keep a soft warning only when the API clearly identifies a different product stack.
        const backendApp = String(auth.backend_app ?? "").trim();
        if (backendApp && /parrot-learning|legacy-api/i.test(backendApp)) {
          setWarning(
            `Connected to unexpected API (${backendApp}). Confirm Vite proxies to E-learning-parrot-backend on :8000.`,
          );
        }

        const built = buildZoomMeetingBranding(auth, {
          isHost: true,
          fallbackName: hostName,
          sessionTitle: auth.cohort_title,
        });
        const zoomHostAvatar = built.clientBranding.institutionMode
          ? built.avatarUrl
          : isZoomCdnAvatarUrl(auth.host?.avatar_url)
            ? auth.host!.avatar_url!.trim()
            : built.avatarUrl;
        const companyLabel =
          sanitizeLegacyBrandText(auth.company?.name) || HUB.company;

        setHostBranding({
          ...(built.hostBranding ?? {
            name: hostName,
            avatarUrl: zoomHostAvatar,
            companyName: companyLabel,
            cohortTitle: auth.cohort_title,
          }),
          avatarUrl: zoomHostAvatar ?? built.avatarUrl,
          companyName: companyLabel,
          institutionMode: built.clientBranding.institutionMode,
        });
        setClientBranding(built.clientBranding);

        // Daily: unlock admitted guests as soon as host studio has credentials (no wait for iframe).
        if (provider === "daily" && id) {
          void markLiveCohortHostInMeeting(id).catch(() => undefined);
        }

        if (auth.meeting_refreshed) {
          staleMeetingRetryRef.current = false;
        }

        if (auth.zoom && (!auth.zoom.api_ready || !auth.zoom.embed_ready)) {
          setWarning("Zoom credentials incomplete on the server. Check ZOOM_ACCOUNT_ID / ZOOM_EMBED_CLIENT_ID.");
        }
      } catch (err: unknown) {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(message || "Could not open host studio.");
        setSdk(null);
        setHostBranding(null);
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    clearZoomLaunchPending();
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!id) return;
    const timer = window.setInterval(() => {
      void loadQueue(true);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [id, loadQueue]);

  useEffect(() => {
    if (!id || !meetingReady) return;
    const timer = window.setInterval(() => {
      void markLiveCohortHostInMeeting(id);
    }, 45000);
    return () => window.clearInterval(timer);
  }, [id, meetingReady]);

  const handleRelease = async () => {
    setActionLoading(true);
    try {
      await releaseLiveZoomCohortParticipant(id);
      await loadQueue(true);
      toast({ title: "Released", description: "Participant released. Next in line was admitted if anyone was waiting." });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Release failed", description: message || "Could not release participant." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdmitEntry = async (entryId: number) => {
    setActionLoading(true);
    try {
      const res = await admitLiveZoomCohortEntry(id, entryId);
      applyQueue(res.queue);
      toast({ title: "Admitted", description: res.message });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Admit failed", description: message || "Could not admit participant." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdmitSelected = async (entryIds: number[]) => {
    if (entryIds.length === 0) return;
    setActionLoading(true);
    try {
      let lastQueue: Parameters<typeof applyQueue>[0] | null = null;
      let admitted = 0;
      for (const entryId of entryIds) {
        const res = await admitLiveZoomCohortEntry(id, entryId);
        lastQueue = res.queue;
        admitted += 1;
      }
      if (lastQueue) applyQueue(lastQueue);
      else await loadQueue(true);
      toast({
        title: "Admitted",
        description: admitted === 1 ? "1 participant admitted." : `${admitted} participants admitted.`,
      });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      await loadQueue(true);
      toast({ variant: "destructive", title: "Admit failed", description: message || "Could not admit selected participants." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdmitNext = async () => {
    setActionLoading(true);
    try {
      const res = await admitNextLiveZoomCohortWaiting(id);
      if (res.queue) applyQueue(res.queue);
      else await loadQueue(true);
      toast({ title: "Queue updated", description: res.message });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Admit failed", description: message || "Could not admit next participant." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdmitAll = async () => {
    setActionLoading(true);
    try {
      const res = await admitAllLiveZoomCohortWaiting(id);
      applyQueue(res.queue);
      toast({ title: "Admitted", description: res.message });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Admit all failed", description: message || "Could not admit waiting participants." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMuteParticipant = (entry: LiveZoomCohortQueueEntry) => {
    const ok = hostControlsRef.current?.muteByName(entry.display_name);
    if (!ok) {
      toast({
        variant: "destructive",
        title: "Mute failed",
        description: "Could not find that participant in the live call yet.",
      });
    }
  };

  const handleStopVideoParticipant = (entry: LiveZoomCohortQueueEntry) => {
    const ok = hostControlsRef.current?.stopVideoByName(entry.display_name);
    if (!ok) {
      toast({
        variant: "destructive",
        title: "Stop video failed",
        description: "Could not find that participant in the live call yet.",
      });
    }
  };

  const handleRemoveParticipant = async (entry: LiveZoomCohortQueueEntry) => {
    if (!window.confirm(`Remove ${entry.display_name} from the session?`)) return;
    setActionLoading(true);
    try {
      hostControlsRef.current?.removeByName(entry.display_name);
      const res = await releaseLiveZoomCohortQueueEntry(id, entry.id);
      if (res.queue) applyQueue(res.queue);
      else await loadQueue(true);
      toast({ title: "Removed", description: res.message || `${entry.display_name} was removed.` });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Remove failed", description: message || "Could not remove participant." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecording = async (action: "start" | "stop", meta?: { clientHandled?: boolean }) => {
    // DailyMeetingRoom already started/stopped via the client SDK — only sync UI.
    if (meta?.clientHandled) {
      setRecording(action === "start");
      return;
    }

    setActionLoading(true);
    try {
      await toggleLiveCohortRecording(id, action);
      setRecording(action === "start");
      toast({
        title: action === "start" ? "Recording started" : "Recording stopped",
        description:
          meetingProvider === "daily"
            ? "Cloud recording request sent to Daily."
            : "Cloud recording request sent to Zoom.",
      });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Recording failed", description: message || "Could not update recording." });
    } finally {
      setActionLoading(false);
    }
  };

  const copyPublicJoin = async () => {
    if (!publicJoinUrl) return;
    try {
      await navigator.clipboard.writeText(publicJoinUrl);
      toast({ title: "Copied", description: "Public join link copied." });
    } catch {
      toast({ variant: "destructive", title: "Copy failed" });
    }
  };

  const handleJoinError = useCallback(
    (message: string) => {
      if (staleMeetingRetryRef.current) return;
      if (!/no longer active|not found|meeting number is not found/i.test(message)) return;
      staleMeetingRetryRef.current = true;
      void bootstrap({ meetingStale: true });
    },
    [bootstrap],
  );

  const handleHostJoined = useCallback(async () => {
    hasConnectedOnceRef.current = true;
    if (!id) return;
    try {
      const res = await markLiveCohortHostInMeeting(id);
      if (res.queue) {
        applyQueue(res.queue);
      }
    } catch {
      // non-blocking — queue poll will catch up
    }
  }, [id]);

  const handleHostLeft = useCallback(async () => {
    if (id) {
      try {
        await markLiveCohortHostLeft(id);
      } catch {
        // non-blocking
      }
    }
    navigate("/dashboard/live-zoom-cohort");
  }, [id, navigate]);

  const handleParticipantRemoved = useCallback(
    async (participant: ZoomParticipant) => {
      const name = (participant.userName || participant.displayName || "").trim().toLowerCase();
      const currentName = (current?.display_name || "").trim().toLowerCase();
      if (!name || !currentName || name !== currentName) return;

      try {
        await releaseLiveZoomCohortParticipant(id);
        await loadQueue(true);
        toast({ title: "Participant removed", description: "They were removed from Zoom and the queue slot was released." });
      } catch {
        // queue sync is best-effort
      }
    },
    [current?.display_name, id, loadQueue, toast],
  );

  if (!id) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1a1a1a] p-8 text-white">
        <p className="text-red-300">Invalid cohort.</p>
      </div>
    );
  }

  const totalWaiting = waiting.length;

  return (
    <div
      className={`zoom-client-meeting-page${
        meetingProvider === "daily" || !meetingReady ? " zoom-client-meeting-page--interactive" : ""
      }`}
    >
      {!meetingReady && (
        <header className="absolute left-0 right-0 top-0 z-[3] flex min-h-11 shrink-0 items-start justify-between gap-2 border-b border-white/10 bg-[#232323]/95 px-3 py-2 backdrop-blur-sm sm:items-center sm:px-4 sm:py-0 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              onClick={() => navigate("/dashboard/live-zoom-cohort")}
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-medium text-white">Host studio</h1>
                <Badge className="h-5 bg-red-600 px-1.5 text-[10px] hover:bg-red-600">LIVE</Badge>
              </div>
              <p className="truncate text-[11px] text-zinc-500">
                {hostBranding?.companyName || HUB.company}
                {sdk
                  ? meetingProvider === "daily"
                    ? " · Daily"
                    : ` · ${(sdk as ZoomMeetingSdkAuth).meeting_number ?? ""}`
                  : ""}
              </p>
            </div>
          </div>
        </header>
      )}

      {warning && !meetingReady && (
        <div className="pointer-events-none absolute left-1/2 top-14 z-[3] max-w-lg -translate-x-1/2 rounded-lg border border-amber-500/30 bg-amber-950/90 px-3 py-2 text-xs text-amber-100 backdrop-blur-sm">
          {warning}
        </div>
      )}

      {loading && !sdk ? (
        <ZoomSdkStartingSpinner
          active
          phase="preparing"
          isHost
          meetingTitle={hostBranding?.cohortTitle || `Host studio · Cohort #${id}`}
          institutionName={
            isStoredMainAdmin() || showsPlatformHubBranding()
              ? getAppDisplayName()
              : (clientBranding?.companyName ?? hostBranding?.companyName ?? HUB.company)
          }
          logoUrl={
            isStoredMainAdmin() || showsPlatformHubBranding()
              ? (clientBranding?.logoUrl ?? hostBranding?.avatarUrl ?? null)
              : (clientBranding?.logoUrl ?? hostBranding?.avatarUrl)
          }
          fullscreen
        />
      ) : error && !sdk ? (
        <div className="zoom-client-meeting-loading px-6">
          <div className="max-w-md space-y-4 text-center">
            <p className="font-medium text-red-300">{error}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button className="bg-[#0e72ed] hover:bg-[#0b5fc7]" onClick={() => void bootstrap({ forceRefresh: true })}>
                Refresh session
              </Button>
              <Button variant="secondary" className="bg-[#2d2d2d] text-zinc-200 hover:bg-[#3a3a3a]" onClick={() => void bootstrap()}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      ) : sdk && hostBranding ? (
        <div className="relative z-[1] h-full min-h-[100dvh] w-full pt-11">
          <LiveMeetingExperience
            key={`${meetingProvider}:${isDailySdk(sdk) ? sdk.room_name || "daily" : (sdk as ZoomMeetingSdkAuth).meeting_number}:host`}
            provider={meetingProvider}
            sdk={sdk}
            sdkView="client"
            meetingTitle={hostBranding.cohortTitle || `Host studio · Cohort #${id}`}
            userName={hostBranding.name}
            avatarUrl={hostBranding.avatarUrl}
            isHost
            shareUrl={publicJoinUrl}
            hostBranding={hostBranding}
            clientBranding={clientBranding}
            queueWaitingCount={totalWaiting}
            recording={recording}
            onToggleRecording={(action, meta) => void handleRecording(action, meta)}
            onOpenQueue={() => setQueuePanelOpen(true)}
            onJoined={handleHostJoined}
            onLeft={handleHostLeft}
            onJoinError={handleJoinError}
            onReconnect={() => void bootstrap({ forceRefresh: true })}
            onReadyChange={setMeetingReady}
            onParticipantRemoved={(participant) => void handleParticipantRemoved(participant)}
            onPrejoinCancel={() => navigate("/dashboard/live-zoom-cohort")}
            skipPrejoin={meetingProvider !== "daily"}
            hostControlsRef={hostControlsRef}
          />
        </div>
      ) : null}

      {/* Only after join — never cover the device prejoin lobby */}
      {meetingReady && (
        <div className="zoom-host-studio-overlay">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 bg-[#232323]/95 text-xs text-zinc-200 shadow-lg backdrop-blur-sm hover:bg-[#2d2d2d]"
            onClick={() => void copyPublicJoin()}
            title="Copy join link"
          >
            <Copy className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Copy join link</span>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="relative h-8 bg-[#232323]/95 text-xs text-zinc-200 shadow-lg backdrop-blur-sm hover:bg-[#2d2d2d]"
            onClick={() => setQueuePanelOpen((v) => !v)}
          >
            <Users className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Queue</span>
            {totalWaiting > 0 && (
              <span className="ml-1.5 rounded-full bg-[#0e72ed] px-1.5 py-0.5 text-[10px] font-medium text-white">
                {totalWaiting}
              </span>
            )}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-[#232323]/95 text-zinc-200 shadow-lg backdrop-blur-sm hover:bg-[#2d2d2d]"
            onClick={() => void loadQueue()}
            disabled={queueRefreshing}
          >
            {queueRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}

      <HostQueuePanel
        open={queuePanelOpen}
        onClose={() => setQueuePanelOpen(false)}
        current={current}
        inSession={inSession}
        waiting={waiting}
        admittedReady={admittedReady}
        recording={recording}
        actionLoading={actionLoading}
        sdkReady={meetingReady}
        onAdmitNext={() => void handleAdmitNext()}
        onAdmitAll={() => void handleAdmitAll()}
        onAdmitSelected={(ids) => void handleAdmitSelected(ids)}
        onRelease={() => void handleRelease()}
        onAdmitEntry={(entryId) => void handleAdmitEntry(entryId)}
        onMuteParticipant={handleMuteParticipant}
        onStopVideoParticipant={handleStopVideoParticipant}
        onRemoveParticipant={(entry) => void handleRemoveParticipant(entry)}
        onToggleRecording={(action, meta) => void handleRecording(action, meta)}
      />
    </div>
  );
};

export default LiveCohortHostStudio;
