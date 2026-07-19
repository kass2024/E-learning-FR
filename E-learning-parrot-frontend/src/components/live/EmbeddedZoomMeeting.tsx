import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import "@/components/live/zoomMeeting.css";
import type { ZoomMeetingSdkAuth } from "@/api/axios";
import { loadZoomEmbeddedModule } from "@/lib/zoomEmbeddedLoader";
import {
  buildZoomEmbeddedInitOptions,
  buildZoomEmbeddedJoinOptions,
} from "@/lib/zoomEmbeddedConfig";
import type { MediaDevicePreferences } from "@/hooks/useMediaDevices";
import {
  chainZoomEmbeddedTeardown,
  clearZoomEmbeddedRoot,
  destroyEmbeddedZoomClient,
  waitForZoomEmbeddedTeardown,
} from "@/lib/zoomEmbeddedSession";
import { captureZoomEmbeddedMeetingInfo } from "@/lib/zoomSdkMeetingInfo";
import { HostWaitingStage, type HostBranding } from "@/components/live/HostWaitingStage";
import type { ParticipantBranding } from "@/components/live/ParticipantWaitingStage";
import { MeetingParticipantsPanel } from "@/components/live/MeetingParticipantsPanel";
import { MeetingParticipantTiles } from "@/components/live/MeetingParticipantTiles";
import { ShareSafetyBanner } from "@/components/live/ShareSafetyBanner";
import { ShareIsolationBanner } from "@/components/live/ShareIsolationBanner";
import { MeetingHostInviteSheet } from "@/components/live/MeetingHostInviteSheet";
import { HostLiveLobbyBar, type LiveClassLobbyEntry } from "@/components/live/HostLiveLobbyBar";
import type { MeetingShareDetails } from "@/lib/meetingShareDetails";
import { getLiveClassLobby, setLiveClassAutoAdmit, dismissLobbyStudent } from "@/api/axios";
import {
  filterPendingLobbyLearners,
  participantMatchesLearner,
} from "@/lib/liveClassLobby";
import {
  isWaitingRoomEventPayload,
  mergeWaitingParticipants,
  normalizeUserEventPayloads,
  waitingParticipantFromEvent,
} from "@/lib/zoomWaitingRoomTracker";
import { collectZoomAvatarUrls, patchSdkAvatarImages } from "@/lib/zoomAvatars";
import { ZoomSdkStartingSpinner } from "@/components/live/ZoomSdkStartingSpinner";
import {
  anyParticipantVideoOn,
  applyMediaPreferencesAfterJoin,
  applyVideoViewSizes,
  debounce,
  anyParticipantVideoOn,
  measureFullShareStage,
  pickViewForCount,
  readCurrentZoomUser,
  learnerRosterLooksIncomplete,
  readInMeetingParticipants,
  readWaitingRoomParticipants,
  readZoomParticipants,
  localUserIsSharing,
  resolveActiveSharing,
  shouldShowParticipantFallback,
  warnIfScreenShareUnsupported,
  admitAllWaitingParticipants,
  admitLobbyLearner,
  collectWaitingUserIds,
  releaseWaitingParticipant,
  type ZoomEmbeddedClient,
  type ZoomParticipant,
} from "@/components/live/zoomMeetingClient";

type Props = {
  sdk: ZoomMeetingSdkAuth;
  meetingTitle?: string;
  devicePreferences?: MediaDevicePreferences;
  onJoined?: () => void;
  onLeft?: () => void;
  onReconnect?: () => void;
  onJoinError?: (message: string) => void;
  onReadyChange?: (ready: boolean) => void;
  onClientReady?: (client: ZoomEmbeddedClient | null) => void;
  onParticipantRemoved?: (participant: ZoomParticipant) => void;
  onLeave?: () => void;
  className?: string;
  fillContainer?: boolean;
  isHost?: boolean;
  hostBranding?: HostBranding;
  participantBranding?: ParticipantBranding;
  queueWaitingCount?: number;
  hostParticipantsOpen?: boolean;
  onHostParticipantsOpenChange?: (open: boolean) => void;
  meetingShare?: MeetingShareDetails | null;
  materialId?: number;
  hostEmail?: string;
};

export type { ZoomEmbeddedClient, ZoomParticipant };

function formatZoomError(err: unknown): string {
  if (!err || typeof err !== "object") return "Could not join the embedded meeting.";
  const anyErr = err as { message?: string; reason?: string };
  const message = anyErr.reason || anyErr.message || "";
  if (/duplicated join/i.test(message)) return "Duplicated join operation";
  if (/meeting number is not found|no longer active/i.test(message)) {
    return "This Zoom meeting is no longer active. Ask the host to refresh the meeting.";
  }
  if (/fail to join the meeting/i.test(message)) {
    return "Could not join the Zoom meeting. Check your connection and try again.";
  }
  if (/already has other meetings in progress/i.test(message)) {
    return "Another Zoom meeting is already running. End it first, then reload.";
  }
  return message || "Could not join the embedded meeting.";
}

function isRecoverableJoinError(message: string): boolean {
  return /no longer active|fail to join|not started|duplicated join|connection error|invalid password|passcode wrong|wrong password|wrong passcode/i.test(
    message,
  );
}

function joinPasswordCandidates(sdk: ZoomMeetingSdkAuth): string[] {
  const fromApi = Array.isArray(sdk.password_candidates) ? sdk.password_candidates : [];
  const ordered = [sdk.password ?? "", ...fromApi, ""].map((v) => String(v ?? ""));
  return [...new Set(ordered)];
}

function isDuplicateJoinError(message: string): boolean {
  return /duplicated join/i.test(message);
}

function syncSharingState(
  client: ZoomEmbeddedClient,
  sharingRef: MutableRefObject<boolean>,
  shareLatchedRef: MutableRefObject<boolean>,
  setSharing: (value: boolean) => void,
  root: HTMLElement | null,
) {
  const active = shareLatchedRef.current || resolveActiveSharing(client, root);
  sharingRef.current = active;
  setSharing(active);
}

export function EmbeddedZoomMeeting({
  sdk,
  meetingTitle,
  devicePreferences,
  onJoined,
  onLeft,
  onReconnect,
  onJoinError,
  onReadyChange,
  onClientReady,
  onParticipantRemoved,
  onLeave,
  className,
  fillContainer = false,
  isHost = false,
  hostBranding,
  participantBranding,
  queueWaitingCount = 0,
  hostParticipantsOpen = false,
  onHostParticipantsOpenChange,
  meetingShare = null,
  materialId,
  hostEmail = "",
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<ZoomEmbeddedClient | null>(null);
  const viewModeRef = useRef<"speaker" | "gallery">("gallery");
  const sharingRef = useRef(false);
  const shareLatchedRef = useRef(false);
  const participantCountRef = useRef(1);
  const mediaPrefsRef = useRef(devicePreferences);

  const [connecting, setConnecting] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [waitingRoomCount, setWaitingRoomCount] = useState(0);
  const [viewMode, setViewMode] = useState<"speaker" | "gallery">("gallery");
  const [sharing, setSharing] = useState(false);
  const [showParticipantFallback, setShowParticipantFallback] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<number | null>(null);
  const [shareBannerDismissed, setShareBannerDismissed] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [lobbyWaiting, setLobbyWaiting] = useState<LiveClassLobbyEntry[]>([]);
  const [autoAdmitEnabled, setAutoAdmitEnabled] = useState(false);
  const [autoAdmitBusy, setAutoAdmitBusy] = useState(false);
  const autoAdmitRef = useRef(false);
  const [trackedWaiting, setTrackedWaiting] = useState<ZoomParticipant[]>([]);
  const [avatarByUserId, setAvatarByUserId] = useState<Record<number, string>>({});
  const localUserIdRef = useRef<number | null>(null);
  const prevWaitingRoomCountRef = useRef(0);
  const trackedWaitingRef = useRef<ZoomParticipant[]>([]);
  const lobbyWaitingLenRef = useRef(0);
  const connectionCloseTimerRef = useRef<number | null>(null);

  trackedWaitingRef.current = trackedWaiting;
  lobbyWaitingLenRef.current = lobbyWaiting.length;
  const lobbyWaitingRef = useRef(lobbyWaiting);
  lobbyWaitingRef.current = lobbyWaiting;

  const resolvedHostAvatar =
    hostBranding?.avatarUrl ?? participantBranding?.hostAvatarUrl ?? null;
  const resolvedHostDisplayName =
    hostBranding?.name?.trim() || participantBranding?.companyName?.trim() || null;
  const expectHostInMeeting = !isHost && Boolean(resolvedHostDisplayName);

  const onJoinedRef = useRef(onJoined);
  const onLeftRef = useRef(onLeft);
  const onJoinErrorRef = useRef(onJoinError);
  const onReadyChangeRef = useRef(onReadyChange);
  const onClientReadyRef = useRef(onClientReady);
  const onLeaveRef = useRef(onLeave);
  const joinedRef = useRef(false);

  useEffect(() => { mediaPrefsRef.current = devicePreferences; }, [devicePreferences]);
  useEffect(() => { onJoinedRef.current = onJoined; }, [onJoined]);
  useEffect(() => { onLeftRef.current = onLeft; }, [onLeft]);
  useEffect(() => { onJoinErrorRef.current = onJoinError; }, [onJoinError]);
  useEffect(() => { onReadyChangeRef.current = onReadyChange; }, [onReadyChange]);
  useEffect(() => { onClientReadyRef.current = onClientReady; }, [onClientReady]);
  useEffect(() => { onLeaveRef.current = onLeave; }, [onLeave]);
  useEffect(() => {
    if (hostParticipantsOpen) setParticipantsOpen(true);
  }, [hostParticipantsOpen]);

  useEffect(() => {
    if (!sharing || shareBannerDismissed) return;
    const timer = window.setTimeout(() => setShareBannerDismissed(true), 12000);
    return () => window.clearTimeout(timer);
  }, [sharing, shareBannerDismissed]);

  const joinSessionKey = `${sdk.meeting_number}:${sdk.signature}`;

  const applyViewMode = useCallback((client: ZoomEmbeddedClient, mode: "speaker" | "gallery") => {
    viewModeRef.current = mode;
    if (mode === "speaker" || mode === "gallery") {
      setViewMode(mode);
    }
    try {
      client.setViewType?.(mode);
    } catch {
      // ignore
    }
  }, []);

  const syncParticipantFallback = useCallback((client: ZoomEmbeddedClient) => {
    const activeSharing = shareLatchedRef.current || resolveActiveSharing(client, rootRef.current);
    if (sharingRef.current !== activeSharing) {
      sharingRef.current = activeSharing;
      setSharing(activeSharing);
    }
    if (activeSharing) {
      setShowParticipantFallback(false);
      return;
    }
    const showFallback =
      shouldShowParticipantFallback(client, rootRef.current, false, {
        expectHostInMeeting,
      }) || (!anyParticipantVideoOn(client) && readInMeetingParticipants(client).length > 0);
    setShowParticipantFallback(showFallback);
  }, [expectHostInMeeting]);

  const syncLocalUser = useCallback((client: ZoomEmbeddedClient) => {
    const me = readCurrentZoomUser(client);
    if (me) localUserIdRef.current = me.userId;
    const inMeeting = readInMeetingParticipants(client);
    const sdkWaiting = readWaitingRoomParticipants(client);
    const mergedWaiting = mergeWaitingParticipants(sdkWaiting, trackedWaitingRef.current);
    const rosterCount = inMeeting.length;
    const displayCount =
      expectHostInMeeting && learnerRosterLooksIncomplete(client)
        ? Math.max(rosterCount + 1, 2)
        : rosterCount;
    setParticipantCount(Math.max(displayCount, 1));
    participantCountRef.current = Math.max(displayCount, 1);
    setWaitingRoomCount(mergedWaiting.length);
    setAvatarByUserId(collectZoomAvatarUrls(readZoomParticipants(client)));
    syncSharingState(client, sharingRef, shareLatchedRef, setSharing, rootRef.current);
    if (!sharingRef.current) {
      patchSdkAvatarImages(rootRef.current);
    }
    syncParticipantFallback(client);

    if (isHost && materialId && hostEmail && lobbyWaitingRef.current.length > 0) {
      const admittedIds = readInMeetingParticipants(client)
        .filter((p) => !p.isHost)
        .flatMap((p) => {
          const matches = lobbyWaitingRef.current.filter((learner) =>
            participantMatchesLearner(p, learner, resolvedHostDisplayName),
          );
          return matches.map((learner) => learner.student_id);
        });
      const uniqueIds = [...new Set(admittedIds)];
      if (uniqueIds.length > 0) {
        setLobbyWaiting((prev) => prev.filter((row) => !uniqueIds.includes(row.student_id)));
        for (const studentId of uniqueIds) {
          void dismissLobbyStudent(materialId, hostEmail, studentId).catch(() => {});
        }
      }
    }
  }, [syncParticipantFallback, expectHostInMeeting, isHost, materialId, hostEmail, resolvedHostDisplayName]);

  useEffect(() => {
    if (!ready || !clientRef.current) return;
    syncLocalUser(clientRef.current);
  }, [ready, lobbyWaiting.length, trackedWaiting, syncLocalUser]);

  const updateStageSize = useCallback(
    (client: ZoomEmbeddedClient, options?: { reapplyView?: boolean }) => {
      const stage = stageRef.current;
      if (!stage) return;
      const metrics = measureFullShareStage(stage);
      applyVideoViewSizes(client, metrics);
      if (options?.reapplyView && !sharingRef.current) {
        applyViewMode(client, viewModeRef.current);
      }
    },
    [applyViewMode],
  );

  const scheduleStageResize = useCallback(
    (client: ZoomEmbeddedClient, options?: { reapplyView?: boolean; delayMs?: number }) => {
      const delay = options?.delayMs ?? 200;
      window.setTimeout(() => {
        if (clientRef.current === client) {
          updateStageSize(client, { reapplyView: options?.reapplyView });
        }
      }, delay);
    },
    [updateStageSize],
  );

  const refreshViewForParticipants = useCallback(
    (client: ZoomEmbeddedClient) => {
      try {
        const count = Math.max(readInMeetingParticipants(client).length, 1);
        const videoOn = anyParticipantVideoOn(client);
        setParticipantCount(count);
        const activeSharing = shareLatchedRef.current || resolveActiveSharing(client, rootRef.current);
        sharingRef.current = activeSharing;
        setSharing(activeSharing);
        if (activeSharing) {
          setShowParticipantFallback(false);
        } else {
          applyViewMode(client, pickViewForCount(count, false, videoOn));
        }
        syncLocalUser(client);
      } catch {
        // ignore
      }
    },
    [applyViewMode, syncLocalUser],
  );

  useEffect(() => {
    if (!ready || isHost || !clientRef.current) return;
    const delays = [600, 1800, 3500];
    const timers = delays.map((ms) =>
      window.setTimeout(() => {
        if (!clientRef.current) return;
        if (sharingRef.current || shareLatchedRef.current) return;
        applyViewMode(clientRef.current, "gallery");
        refreshViewForParticipants(clientRef.current);
        scheduleStageResize(clientRef.current, { reapplyView: true, delayMs: 120 });
      }, ms),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [ready, isHost, applyViewMode, refreshViewForParticipants, scheduleStageResize]);

  useEffect(() => {
    onReadyChangeRef.current?.(ready);
  }, [ready]);

  useEffect(() => {
    onClientReadyRef.current?.(ready ? clientRef.current : null);
  }, [ready]);

  useEffect(() => {
    if (!ready || !clientRef.current) return;
    const tick = () => syncParticipantFallback(clientRef.current!);
    tick();
    const timer = window.setInterval(tick, 2000);
    return () => window.clearInterval(timer);
  }, [ready, syncParticipantFallback]);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    let cancelled = false;
    let client: ZoomEmbeddedClient | null = null;
    joinedRef.current = false;

    const applyWaitingEvent = (payload: unknown) => {
      for (const row of normalizeUserEventPayloads(payload)) {
        if (!row.userId) continue;

        if (isWaitingRoomEventPayload(row)) {
          const participant = waitingParticipantFromEvent(row);
          if (participant) {
            setTrackedWaiting((prev) => {
              const next = prev.filter((item) => item.userId !== participant.userId);
              return [...next, participant];
            });
            if (isHost && autoAdmitRef.current && clientRef.current) {
              void releaseWaitingParticipant(clientRef.current, participant.userId).then(() => {
                if (clientRef.current) syncLocalUser(clientRef.current);
              });
            }
          }
        } else {
          setTrackedWaiting((prev) => prev.filter((item) => item.userId !== row.userId));
        }
      }
    };

    const onParticipantsChanged = () => {
      if (!clientRef.current) return;
      const videoOn = anyParticipantVideoOn(clientRef.current);
      if (videoOn) {
        setShowParticipantFallback(false);
      }
      refreshViewForParticipants(clientRef.current);
      scheduleStageResize(clientRef.current, { reapplyView: true, delayMs: 250 });
    };

    const onUserAdded = (payload: unknown) => {
      applyWaitingEvent(payload);
      onParticipantsChanged();
    };

    const onUserUpdated = (payload: unknown) => {
      applyWaitingEvent(payload);
      onParticipantsChanged();
    };

    const onUserRemoved = (payload: unknown) => {
      const userId = (payload as { userId?: number })?.userId;
      if (userId) {
        setTrackedWaiting((prev) => prev.filter((row) => row.userId !== userId));
      }
      onParticipantsChanged();
    };

    const onActiveSpeaker = (payload: Array<{ userId?: number }>) => {
      if (payload?.length) setActiveSpeakerId(payload[0].userId ?? null);
    };

    const onShareStats = () => {
      // SDK owns share layout — no DOM overrides on statistic events
    };

    const onPeerShareChange = (payload: { action?: string; userId?: number }) => {
      if (!clientRef.current) return;
      const action = String(payload?.action ?? "");
      if (/start|sharing|1/i.test(action) && !/stop|ended|0/i.test(action)) {
        shareLatchedRef.current = true;
      } else if (/stop|ended|0/i.test(action)) {
        shareLatchedRef.current = false;
      }
      sharingRef.current =
        shareLatchedRef.current || resolveActiveSharing(clientRef.current, rootRef.current);
      setSharing(sharingRef.current);
      if (sharingRef.current) setShowParticipantFallback(false);
      if (sharingRef.current) setShareBannerDismissed(false);
      syncLocalUser(clientRef.current);
    };

    const onConnectionChange = (payload: { state?: string }) => {
      const state = payload?.state;
      if (state === "Reconnecting" || state === "Connected") {
        if (connectionCloseTimerRef.current) {
          window.clearTimeout(connectionCloseTimerRef.current);
          connectionCloseTimerRef.current = null;
        }
        return;
      }

      if (state === "Fail") {
        if (!cancelled) {
          setError("Connection interrupted. Your meeting is still active — check your network.");
          onJoinErrorRef.current?.("Connection interrupted");
        }
        return;
      }

      if (state === "Closed") {
        if (connectionCloseTimerRef.current) {
          window.clearTimeout(connectionCloseTimerRef.current);
        }
        connectionCloseTimerRef.current = window.setTimeout(() => {
          if (cancelled || !joinedRef.current) return;
          joinedRef.current = false;
          setReady(false);
          setConnecting(false);
          onClientReadyRef.current?.(null);
          onLeftRef.current?.();
        }, 900);
      }
    };

    const onRecordingChange = () => {
      // Native SDK toolbar shows recording state
    };

    const detachListeners = () => {
      try {
        client?.off?.("user-added", onUserAdded);
        client?.off?.("user-removed", onUserRemoved);
        client?.off?.("user-updated", onUserUpdated);
        client?.off?.("peer-share-state-change", onPeerShareChange);
        client?.off?.("share-statistic-data-change", onShareStats);
        client?.off?.("active-speaker", onActiveSpeaker);
        client?.off?.("connection-change", onConnectionChange);
        client?.off?.("recording-change", onRecordingChange);
        client?.unSubscribeStatisticData?.({ audio: true, video: true, share: true });
      } catch {
        // ignore
      }
    };

    const runJoin = async (joinPassword: string): Promise<void> => {
      await waitForZoomEmbeddedTeardown();
      if (cancelled) return;

      clearZoomEmbeddedRoot(root);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (cancelled) return;

      const ZoomMtgEmbedded = await loadZoomEmbeddedModule();
      client = ZoomMtgEmbedded.createClient();
      clientRef.current = client;
      warnIfScreenShareUnsupported();

      await client.init(buildZoomEmbeddedInitOptions(root));

      if (cancelled) return;

      client.on?.("user-added", onUserAdded);
      client.on?.("user-removed", onUserRemoved);
      client.on?.("user-updated", onUserUpdated);
      client.on?.("peer-share-state-change", onPeerShareChange);
      client.on?.("share-statistic-data-change", onShareStats);
      client.on?.("active-speaker", onActiveSpeaker);
      client.on?.("connection-change", onConnectionChange);
      client.on?.("recording-change", onRecordingChange);

      await client.join(buildZoomEmbeddedJoinOptions(sdk, joinPassword, isHost));

      if (cancelled) return;

      const prefs = mediaPrefsRef.current;
      if (prefs) void applyMediaPreferencesAfterJoin(client, prefs);

      syncLocalUser(client);
      const alreadySharing = shareLatchedRef.current || resolveActiveSharing(client, root);
      if (alreadySharing) {
        sharingRef.current = true;
        setSharing(true);
        setShowParticipantFallback(false);
      } else {
        applyViewMode(client, pickViewForCount(
          Math.max(client.getAttendeeslist?.()?.length ?? 1, 1),
          false,
          anyParticipantVideoOn(client),
        ));
        refreshViewForParticipants(client);
        scheduleStageResize(client, { reapplyView: true, delayMs: 500 });
      }

      joinedRef.current = true;
      captureZoomEmbeddedMeetingInfo(client, isHost ? "embedded-host" : "embedded-guest");
      onJoinedRef.current?.();
      onClientReadyRef.current?.(client);
      setConnecting(false);
      setReady(true);
    };

    const run = async () => {
      const passwords = joinPasswordCandidates(sdk);
      try {
        setConnecting(true);
        setReady(false);
        setError(null);
        onClientReadyRef.current?.(null);

        for (let i = 0; i < passwords.length; i += 1) {
          try {
            try {
              await runJoin(passwords[i]);
            } catch (firstErr: unknown) {
              const msg = formatZoomError(firstErr);
              if (!isDuplicateJoinError(msg) || cancelled) throw firstErr;
              detachListeners();
              await destroyEmbeddedZoomClient(client);
              client = null;
              clientRef.current = null;
              clearZoomEmbeddedRoot(root);
              await waitForZoomEmbeddedTeardown();
              if (cancelled) return;
              await runJoin(passwords[i]);
            }
            return;
          } catch (err: unknown) {
            const formatted = formatZoomError(err);
            if (i >= passwords.length - 1 || cancelled) throw err;
            if (!/fail to join|connection error|invalid password|passcode wrong|wrong password|wrong passcode/i.test(formatted)) {
              throw err;
            }
            detachListeners();
            await destroyEmbeddedZoomClient(client);
            client = null;
            clientRef.current = null;
            clearZoomEmbeddedRoot(root);
            await waitForZoomEmbeddedTeardown();
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const formatted = formatZoomError(err);
          setError(formatted);
          setConnecting(false);
          setReady(false);
          if (isRecoverableJoinError(formatted)) onJoinErrorRef.current?.(formatted);
        }
      }
    };

    void run();

    const debouncedResize = debounce(() => {
      if (clientRef.current) updateStageSize(clientRef.current);
    }, 400);

    const resizeObserver = new ResizeObserver(() => debouncedResize());
    resizeObserver.observe(stage);

    const onOrientationChange = () => {
      window.setTimeout(() => {
        if (clientRef.current) updateStageSize(clientRef.current);
      }, 300);
    };
    window.addEventListener("orientationchange", onOrientationChange);

    const syncTimer = window.setInterval(() => {
      if (clientRef.current) syncLocalUser(clientRef.current);
    }, isHost ? 6000 : 4000);

    const avatarObserver = new MutationObserver(() => {
      if (sharingRef.current) return;
      patchSdkAvatarImages(root);
    });
    avatarObserver.observe(root, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      if (connectionCloseTimerRef.current) {
        window.clearTimeout(connectionCloseTimerRef.current);
        connectionCloseTimerRef.current = null;
      }
      avatarObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("orientationchange", onOrientationChange);
      window.clearInterval(syncTimer);
      const clientToDestroy = client;
      const rootEl = root;
      clientRef.current = null;
      onClientReadyRef.current?.(null);
      detachListeners();
      chainZoomEmbeddedTeardown(async () => {
        await destroyEmbeddedZoomClient(clientToDestroy);
        clearZoomEmbeddedRoot(rootEl);
      });
      setReady(false);
    };
  }, [joinSessionKey, isHost]);

  const containerClass = fillContainer
    ? "zoom-meeting-root flex min-h-0 flex-1 flex-col overflow-hidden bg-[#1a1a1a]"
    : className ?? "zoom-meeting-root flex min-h-[620px] w-full flex-col overflow-hidden rounded-xl bg-[#1a1a1a]";

  const showHostWaiting = isHost && hostBranding && connecting && !ready;
  const activeClient = ready ? clientRef.current : null;
  const localSharing = sharing && activeClient && readCurrentZoomUser(activeClient)?.sharerOn;
  const pendingLobbyLearners = useMemo(() => {
    if (!activeClient) return lobbyWaiting;
    return filterPendingLobbyLearners(
      lobbyWaiting,
      readInMeetingParticipants(activeClient),
      resolvedHostDisplayName,
    );
  }, [lobbyWaiting, activeClient, participantCount, resolvedHostDisplayName]);
  const panelOpen = isHost ? hostParticipantsOpen || participantsOpen : participantsOpen;

  const closeParticipants = () => {
    setParticipantsOpen(false);
    onHostParticipantsOpenChange?.(false);
  };

  const openParticipants = () => {
    setParticipantsOpen(true);
    onHostParticipantsOpenChange?.(true);
  };

  autoAdmitRef.current = autoAdmitEnabled;

  const runAdmitAll = useCallback(async (): Promise<boolean> => {
    const client = clientRef.current;
    if (!client || !isHost) return false;

    const tracked = mergeWaitingParticipants(
      readWaitingRoomParticipants(client),
      trackedWaitingRef.current,
    );

    const zoomWaiting = collectWaitingUserIds(client, tracked).length;
    if (zoomWaiting === 0) return false;

    let ok = await admitAllWaitingParticipants(client, tracked);

    if (!ok && materialId && hostEmail) {
      try {
        await setLiveClassAutoAdmit(materialId, hostEmail, true);
        setAutoAdmitEnabled(true);
        ok = await admitAllWaitingParticipants(client, tracked);
      } catch {
        // keep trying SDK path only
      }
    }

    syncLocalUser(client);
    return ok;
  }, [isHost, materialId, hostEmail, syncLocalUser]);

  const handleAdmitLobbyLearner = useCallback(
    async (learner: LiveClassLobbyEntry) => {
      const client = clientRef.current;
      if (!client || !isHost) return;

      const tracked = mergeWaitingParticipants(
        readWaitingRoomParticipants(client),
        trackedWaitingRef.current,
      );

      const alreadyIn = readInMeetingParticipants(client).some((p) =>
        participantMatchesLearner(p, learner, resolvedHostDisplayName),
      );
      if (alreadyIn) {
        if (materialId && hostEmail) {
          await dismissLobbyStudent(materialId, hostEmail, learner.student_id).catch(() => {});
        }
        setLobbyWaiting((prev) => prev.filter((row) => row.student_id !== learner.student_id));
        syncLocalUser(client);
        return;
      }

      await admitLobbyLearner(client, learner, tracked, resolvedHostDisplayName);

      if (materialId && hostEmail) {
        try {
          await setLiveClassAutoAdmit(materialId, hostEmail, true);
          setAutoAdmitEnabled(true);
        } catch {
          // optional
        }
      }

      window.setTimeout(() => {
        if (!clientRef.current) return;
        const joined = readInMeetingParticipants(clientRef.current).some((p) =>
          participantMatchesLearner(p, learner, resolvedHostDisplayName),
        );
        if (joined && materialId && hostEmail) {
          void dismissLobbyStudent(materialId, hostEmail, learner.student_id).catch(() => {});
          setLobbyWaiting((prev) => prev.filter((row) => row.student_id !== learner.student_id));
        }
        syncLocalUser(clientRef.current);
      }, 1500);
    },
    [isHost, materialId, hostEmail, resolvedHostDisplayName, syncLocalUser],
  );

  const handleToggleAutoAdmit = useCallback(
    (enabled: boolean) => {
      if (!materialId || !hostEmail) {
        setAutoAdmitEnabled(enabled);
        return;
      }

      setAutoAdmitBusy(true);
      void setLiveClassAutoAdmit(materialId, hostEmail, enabled)
        .then(() => {
          setAutoAdmitEnabled(enabled);
          if (enabled && clientRef.current) {
            void runAdmitAll();
          }
        })
        .finally(() => setAutoAdmitBusy(false));
    },
    [materialId, hostEmail, runAdmitAll],
  );

  useEffect(() => {
    if (!isHost || !ready || !materialId || !hostEmail) return;

    const loadLobby = () => {
      void getLiveClassLobby(materialId, hostEmail)
        .then((res) => setLobbyWaiting(res.waiting ?? []))
        .catch(() => setLobbyWaiting([]));
    };

    loadLobby();
    const timer = window.setInterval(loadLobby, 4000);
    return () => window.clearInterval(timer);
  }, [isHost, ready, materialId, hostEmail]);

  const sdkWaitingOverlay = useMemo(
    () => mergeWaitingParticipants([], trackedWaiting),
    [trackedWaiting],
  );

  useEffect(() => {
    if (!isHost || !ready) return;
    if (waitingRoomCount > 0 && prevWaitingRoomCountRef.current === 0) {
      setParticipantsOpen(true);
      onHostParticipantsOpenChange?.(true);
    }
    prevWaitingRoomCountRef.current = waitingRoomCount;
  }, [isHost, ready, waitingRoomCount, onHostParticipantsOpenChange]);

  useEffect(() => {
    if (!isHost || !ready || !autoAdmitEnabled) return;

    const tick = () => {
      if (!autoAdmitRef.current || !clientRef.current) return;
      const tracked = mergeWaitingParticipants(
        readWaitingRoomParticipants(clientRef.current),
        trackedWaitingRef.current,
      );
      const hasZoomWaiting = collectWaitingUserIds(clientRef.current, tracked).length > 0;
      if (hasZoomWaiting) {
        void runAdmitAll();
      }
    };

    tick();
    const timer = window.setInterval(tick, 3500);
    return () => window.clearInterval(timer);
  }, [isHost, ready, autoAdmitEnabled, runAdmitAll]);

  const showFallbackTiles = showParticipantFallback && !sharing;

  return (
    <div className={`${containerClass} relative`}>
      <div
        ref={stageRef}
        className={`zoom-meeting-stage relative min-h-0 flex-1 ${showFallbackTiles ? "zoom-meeting-stage--fallback" : ""}`}
      >
        {showHostWaiting && (
          <HostWaitingStage branding={hostBranding!} waitingCount={queueWaitingCount} connecting />
        )}

        {ready && isHost && activeClient && (
          <HostLiveLobbyBar
            waiting={pendingLobbyLearners}
            zoomWaitingCount={waitingRoomCount}
            autoAdmitEnabled={autoAdmitEnabled}
            autoAdmitBusy={autoAdmitBusy}
            onToggleAutoAdmit={handleToggleAutoAdmit}
            onOpenPeople={openParticipants}
          />
        )}

        {connecting && !showHostWaiting && (
          <ZoomSdkStartingSpinner
            active
            phase="joining"
            isHost={isHost}
            meetingTitle={meetingTitle}
            institutionName={hostBranding?.companyName ?? participantBranding?.companyName}
            logoUrl={hostBranding?.avatarUrl ?? participantBranding?.hostAvatarUrl}
            overlay
          />
        )}

        {error && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
            <div className="max-w-md space-y-3 rounded-xl border border-red-500/30 bg-[#2a1515] px-5 py-4 text-center text-sm text-red-200">
              <p>{error}</p>
              {onReconnect && (
                <button type="button" className="text-xs underline hover:text-white" onClick={onReconnect}>
                  Retry with a fresh meeting
                </button>
              )}
            </div>
          </div>
        )}

        {ready && activeClient && showFallbackTiles && (
          <MeetingParticipantTiles
            client={activeClient}
            activeSpeakerId={activeSpeakerId}
            showTiles={showFallbackTiles}
            hostAvatarUrl={resolvedHostAvatar}
            hostDisplayName={resolvedHostDisplayName}
            avatarByUserId={avatarByUserId}
            ensureHostVisible={expectHostInMeeting}
          />
        )}

        {ready && (
          <ShareIsolationBanner visible={sharing || ready} />
        )}

        {ready && (
          <ShareSafetyBanner
            visible={sharing && !shareBannerDismissed}
            isLocalSharer={Boolean(localSharing)}
            onDismiss={() => setShareBannerDismissed(true)}
          />
        )}

        <div
          ref={rootRef}
          id="meetingSDKElement"
          className="zoom-sdk-mount relative z-[2] min-h-0 flex-1"
        />
      </div>

      {isHost && meetingShare ? (
        <MeetingHostInviteSheet open={inviteOpen} onOpenChange={setInviteOpen} details={meetingShare} />
      ) : null}

      {ready && activeClient && (
        <MeetingParticipantsPanel
          open={panelOpen}
          onClose={closeParticipants}
          client={activeClient}
          isHost={isHost}
          hostAvatarUrl={resolvedHostAvatar}
          hostDisplayName={resolvedHostDisplayName}
          avatarByUserId={avatarByUserId}
          onParticipantRemoved={onParticipantRemoved}
          eventTrackedWaiting={sdkWaitingOverlay}
          checkedInLearners={pendingLobbyLearners}
          onAdmitLobbyLearner={isHost ? handleAdmitLobbyLearner : undefined}
        />
      )}
    </div>
  );
}
