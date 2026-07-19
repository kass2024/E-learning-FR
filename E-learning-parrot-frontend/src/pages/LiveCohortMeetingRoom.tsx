import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ZoomSdkStartingSpinner } from "@/components/live/ZoomSdkStartingSpinner";
import {
  finishLiveZoomCohortTurn,
  getLiveZoomCohortParticipantSdkAuth,
  getLiveZoomCohortQueueStatus,
  markLiveZoomCohortJoined,
  type ZoomMeetingSdkAuth,
} from "@/api/axios";
import { LiveMeetingExperience } from "@/components/live/LiveMeetingExperience";
import type { DailyMeetingSdkAuth } from "@/components/live/DailyMeetingRoom";
import { ParticipantWaitingStage, type ParticipantBranding } from "@/components/live/ParticipantWaitingStage";
import { loadGuestProfile } from "@/components/live/CohortJoinQueuePanel";
import { buildZoomMeetingBranding } from "@/lib/zoomMeetingBranding";
import type { ZoomClientBranding } from "@/lib/zoomClientBranding";
import { refreshInstitutionBrandingFromApi, isStoredMainAdmin } from "@/lib/institutionContext";
import { HUB } from "@/lib/hubConfig";
import { resolvePublicJoinUrl } from "@/lib/publicJoinUrl";
import { clearZoomLaunchPending } from "@/lib/zoomLaunchPending";
import "@/components/live/zoomClientMeeting.css";

type CohortSdk = ZoomMeetingSdkAuth | DailyMeetingSdkAuth;

function isDailySdk(sdk: CohortSdk): sdk is DailyMeetingSdkAuth {
  const daily = sdk as DailyMeetingSdkAuth;
  const joinUrl = String(daily.join_url || daily.room_url || "").trim();
  const token = String(daily.token || "").trim();
  return joinUrl.length > 0 && token.length > 0;
}

function isMeetingNotStartedError(message: string | null): boolean {
  if (!message) return false;
  return /meeting has not started|still starting|not started|fail to join|host is still connecting|waiting for the host/i.test(message);
}

function isRetryableJoinError(message: string | null): boolean {
  if (!message) return false;
  return /fail to join|not started|duplicated|invalid password|wrong password|host is still connecting|connection error/i.test(message);
}

const LiveCohortMeetingRoom = () => {
  const { cohortId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = Number(cohortId || 0);
  const studentId = searchParams.get("student_id") ? Number(searchParams.get("student_id")) : undefined;

  const guestProfile = useMemo(() => (id ? loadGuestProfile(id) : null), [id]);
  const displayName = guestProfile?.name || "Guest";

  const participantParams = useMemo(() => {
    if (studentId) return { student_id: studentId };
    return {
      guest_name: guestProfile?.name,
      guest_email: guestProfile?.email,
      guest_phone: guestProfile?.phone,
      guest_token: guestProfile?.token,
    };
  }, [studentId, guestProfile]);

  const [loading, setLoading] = useState(true);
  const [sdk, setSdk] = useState<CohortSdk | null>(null);
  const [meetingProvider, setMeetingProvider] = useState<"zoom" | "daily">("daily");
  const [branding, setBranding] = useState<ParticipantBranding | null>(null);
  const [clientBranding, setClientBranding] = useState<ZoomClientBranding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waitingForHost, setWaitingForHost] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const retryTimerRef = useRef<number | null>(null);
  const joinRetryRef = useRef(0);
  const inMeetingRef = useRef(false);

  const loadSdk = useCallback(async (silent = false) => {
    if (!id) return;
    // Never refresh join credentials while already in the Daily room — causes reconnect loops.
    if (silent && inMeetingRef.current) return;
    if (!silent) {
      setLoading(true);
      setWaitingForHost(false);
    }
    setError(null);
    try {
      if (!isStoredMainAdmin()) {
        await refreshInstitutionBrandingFromApi();
      }
      const status = await getLiveZoomCohortQueueStatus(id, participantParams);
      if (!status.my_entry?.can_join) {
        if (status.my_entry?.is_admitted) {
          setWaitingForHost(true);
          setBranding((prev) => prev ?? {
            name: displayName,
            companyName: HUB.name,
          });
          if (!silent) setSdk(null);
          return;
        }
        setError("You are not authorized to join yet. Return to the queue and wait for the host to admit you.");
        setSdk(null);
        setBranding(null);
        return;
      }

      const auth = await getLiveZoomCohortParticipantSdkAuth(id, participantParams);
      const provider = (auth.provider === "daily" || isDailySdk(auth.sdk as CohortSdk) ? "daily" : "zoom") as
        | "zoom"
        | "daily";
      setMeetingProvider(provider);
      if (provider === "daily") {
        const raw = (auth.sdk ?? {}) as DailyMeetingSdkAuth;
        const joinUrl = String(raw.join_url || raw.room_url || "").trim();
        const token = String(raw.token || "").trim();
        if (!joinUrl || !token) {
          setError("Daily room was not prepared correctly. Return to the queue and try again.");
          setSdk(null);
          return;
        }
        // Keep the same Daily session once joined — new tokens remount/reconnect the call.
        setSdk((prev) => {
          if (
            prev &&
            isDailySdk(prev) &&
            String(prev.join_url || prev.room_url || "").trim() === joinUrl &&
            String(prev.room_name || "") === String(raw.room_name || "")
          ) {
            return prev;
          }
          return {
            join_url: joinUrl,
            token,
            room_name: raw.room_name || undefined,
            user_name: raw.user_name || auth.participant?.name || displayName,
            role: 0,
          };
        });
      } else {
        setSdk(auth.sdk as CohortSdk);
      }
      joinRetryRef.current = 0;
      const built = buildZoomMeetingBranding(auth, {
        isHost: false,
        fallbackName: auth.participant?.name || (auth.sdk as { user_name?: string }).user_name || displayName,
        sessionTitle: auth.cohort_title,
      });
      setClientBranding(built.clientBranding);
      setBranding(
        built.participantBranding ?? {
          name: auth.participant?.name || (auth.sdk as { user_name?: string }).user_name || displayName,
          avatarUrl: built.avatarUrl,
          hostAvatarUrl: built.participantBranding?.hostAvatarUrl ?? built.avatarUrl,
          companyName: auth.company?.name || HUB.name,
          cohortTitle: auth.cohort_title,
          institutionMode: built.clientBranding.institutionMode,
        },
      );
      setWaitingForHost(false);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const text = message || "Unable to start in-app meeting.";
      if (isMeetingNotStartedError(text)) {
        setWaitingForHost(true);
        setError(null);
        setBranding((prev) => prev ?? {
          name: displayName,
          companyName: HUB.name,
        });
      } else {
        setError(text);
        setWaitingForHost(false);
        setSdk(null);
      }
    } finally {
      if (!silent) setLoading(false);
      setConnecting(false);
    }
  }, [id, participantParams, displayName]);

  const handleJoinError = useCallback(
    (message: string) => {
      if (inMeetingRef.current) {
        // Already connected — don't tear down / re-auth on transient Daily errors.
        return;
      }
      if (!isRetryableJoinError(message)) {
        setError(message);
        setSdk(null);
        return;
      }

      if (joinRetryRef.current >= 10) {
        setError(message);
        setSdk(null);
        return;
      }

      joinRetryRef.current += 1;
      setConnecting(true);
      setError(null);
      setWaitingForHost(/not started|fail to join|host is still connecting/i.test(message));

      window.setTimeout(() => {
        void loadSdk(true);
      }, 2500);
    },
    [loadSdk],
  );

  useEffect(() => {
    clearZoomLaunchPending();
    void loadSdk();
  }, [loadSdk]);

  useEffect(() => {
    if (!waitingForHost) {
      if (retryTimerRef.current) {
        window.clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      return;
    }

    retryTimerRef.current = window.setInterval(() => {
      void loadSdk(true);
    }, 1500);

    return () => {
      if (retryTimerRef.current) {
        window.clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [waitingForHost, loadSdk]);

  const handleJoined = useCallback(async () => {
    inMeetingRef.current = true;
    try {
      await markLiveZoomCohortJoined(id, participantParams);
    } catch {
      // non-blocking
    }
  }, [id, participantParams]);

  const handleLeftToQueue = useCallback(() => {
    inMeetingRef.current = false;
    navigate(`/live-cohort/${id}/join`);
  }, [id, navigate]);

  if (!id) {
    return <p className="p-8 text-red-300">Invalid meeting link.</p>;
  }

  return (
    <div
      className={`zoom-client-meeting-page${
        meetingProvider === "daily" || Boolean(error) || waitingForHost
          ? " zoom-client-meeting-page--interactive"
          : ""
      }`}
    >
      {(loading && !waitingForHost && !sdk) || (connecting && !sdk) ? (
        <ZoomSdkStartingSpinner
          active
          phase={connecting ? "connecting" : "preparing"}
          meetingTitle={branding?.cohortTitle}
          institutionName={branding?.companyName ?? clientBranding?.companyName ?? HUB.name}
          logoUrl={clientBranding?.logoUrl ?? branding?.hostAvatarUrl}
          fullscreen
        />
      ) : waitingForHost && branding && !sdk ? (
        <div className="zoom-client-meeting-loading">
          <ParticipantWaitingStage branding={branding} mode="host_waiting" />
        </div>
      ) : error && !sdk ? (
          <div className="zoom-client-meeting-loading zoom-client-meeting-loading--interactive px-6">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-red-900/50 bg-[#232323] p-8 text-center">
            <p className="text-red-300">{error}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" className="bg-[#0e72ed] hover:bg-[#0b5fc7]" onClick={() => void loadSdk()}>
                Try again
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-zinc-300 hover:bg-white/10"
                onClick={() => navigate(`/live-cohort/${id}/join`)}
              >
                Return to waiting room
              </Button>
            </div>
          </div>
          </div>
      ) : sdk && branding ? (
        <LiveMeetingExperience
          key={`${meetingProvider}:${isDailySdk(sdk) ? sdk.room_name || "daily" : (sdk as ZoomMeetingSdkAuth).meeting_number}:guest`}
          provider={meetingProvider}
          sdk={sdk}
          sdkView="client"
          meetingTitle={branding.cohortTitle || `Live meeting · Cohort #${id}`}
          userName={branding.name}
          avatarUrl={branding.avatarUrl}
          isHost={false}
          shareUrl={resolvePublicJoinUrl(`/live-cohort/${id}/join`)}
          participantBranding={branding}
          clientBranding={clientBranding}
          onJoined={handleJoined}
          onJoinError={handleJoinError}
          onLeft={handleLeftToQueue}
          onPrejoinCancel={() => {
            inMeetingRef.current = false;
            navigate(`/live-cohort/${id}/join`);
          }}
          skipPrejoin
        />
      ) : null}
    </div>
  );
};

export default LiveCohortMeetingRoom;
