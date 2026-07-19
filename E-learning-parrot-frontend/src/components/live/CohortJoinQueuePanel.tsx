import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogOut, Pencil, Video } from "lucide-react";
import {
  finishLiveZoomCohortTurn,
  getLiveZoomCohortQueueStatus,
  getPublicLiveCohortQueue,
  joinLiveZoomCohortQueue,
  leaveLiveZoomCohortQueue,
  type LiveCohortPublicQueueSnapshot,
  type LiveZoomCohortQueueEntry,
} from "@/api/axios";
import { ParticipantWaitingStage, type ParticipantBranding } from "@/components/live/ParticipantWaitingStage";
import { extractApiErrorMessage, isValidGuestEmail } from "@/lib/cohortGuest";
import { HUB } from "@/lib/hubConfig";

export type StoredGuestProfile = {
  token?: string;
  name: string;
  email: string;
  phone: string;
};

export type CohortQueueParticipant = {
  studentId?: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestToken?: string | null;
  onGuestToken?: (token: string) => void;
  onGuestDetailsChange?: (profile: Pick<StoredGuestProfile, "name" | "email" | "phone">) => void;
};

type Props = CohortQueueParticipant & {
  cohortId: number;
  cohortTitle: string;
  scheduleLabel?: string | null;
  isLive?: boolean;
  autoJoin?: boolean;
  onLeave?: () => void;
};

export function cohortGuestStorageKey(cohortId: number) {
  return `cohort_guest_${cohortId}`;
}

export function isGuestProfileComplete(profile: Pick<StoredGuestProfile, "name" | "email" | "phone"> | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.name.trim() && profile.email.trim() && profile.phone.trim() && isValidGuestEmail(profile.email),
  );
}

export function loadGuestProfile(cohortId: number): StoredGuestProfile | null {
  const raw = localStorage.getItem(cohortGuestStorageKey(cohortId));
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredGuestProfile;
      if (parsed?.name || parsed?.email || parsed?.phone || parsed?.token) {
        return {
          token: parsed.token,
          name: parsed.name ?? "",
          email: parsed.email ?? "",
          phone: parsed.phone ?? "",
        };
      }
    } catch {
      // fall through
    }
  }

  const legacyToken = localStorage.getItem(`cohort_guest_token_${cohortId}`);
  if (legacyToken) {
    return { token: legacyToken, name: "", email: "", phone: "" };
  }

  return null;
}

export function saveGuestProfile(cohortId: number, profile: StoredGuestProfile) {
  localStorage.setItem(cohortGuestStorageKey(cohortId), JSON.stringify(profile));
  localStorage.removeItem(`cohort_guest_token_${cohortId}`);
}

export function clearGuestProfile(cohortId: number) {
  localStorage.removeItem(cohortGuestStorageKey(cohortId));
  localStorage.removeItem(`cohort_guest_token_${cohortId}`);
}

export function CohortJoinQueuePanel({
  cohortId,
  cohortTitle,
  scheduleLabel,
  studentId,
  guestName = "",
  guestEmail = "",
  guestPhone = "",
  guestToken,
  onGuestToken,
  onGuestDetailsChange,
  isLive = true,
  autoJoin = true,
  onLeave,
}: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<LiveZoomCohortQueueEntry | null>(null);
  const [queueSnapshot, setQueueSnapshot] = useState<LiveCohortPublicQueueSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: guestName, email: guestEmail, phone: guestPhone });
  const [editingDetails, setEditingDetails] = useState(false);
  const [hasAutoJoined, setHasAutoJoined] = useState(false);

  const isGuest = !studentId;
  const guestReady = isGuestProfileComplete(details);
  const displayName = studentId ? details.name || "Learner" : details.name.trim() || "Guest";

  const branding: ParticipantBranding = useMemo(
    () => ({
      name: displayName,
      companyName: HUB.name,
      cohortTitle: scheduleLabel ? `${cohortTitle} · ${scheduleLabel}` : cohortTitle,
    }),
    [displayName, cohortTitle, scheduleLabel],
  );

  useEffect(() => {
    setDetails({ name: guestName, email: guestEmail, phone: guestPhone });
  }, [guestName, guestEmail, guestPhone]);

  useEffect(() => {
    if (!isGuest) return;
    setEditingDetails(!isGuestProfileComplete({ name: guestName, email: guestEmail, phone: guestPhone }));
  }, [isGuest, guestName, guestEmail, guestPhone]);

  const persistGuestDetails = useCallback(
    (next: Pick<StoredGuestProfile, "name" | "email" | "phone">) => {
      onGuestDetailsChange?.(next);
      if (guestToken) {
        saveGuestProfile(cohortId, {
          token: guestToken,
          name: next.name.trim(),
          email: next.email.trim(),
          phone: next.phone.trim(),
        });
      }
    },
    [cohortId, guestToken, onGuestDetailsChange],
  );

  const participantPayload = useCallback(() => {
    if (studentId) return { student_id: studentId };
    return {
      guest_name: details.name.trim(),
      guest_email: details.email.trim(),
      guest_phone: details.phone.trim(),
      guest_token: guestToken || undefined,
    };
  }, [studentId, details, guestToken]);

  const statusParams = useCallback(() => {
    if (studentId) return { student_id: studentId };
    return { guest_token: guestToken || undefined };
  }, [studentId, guestToken]);

  const refreshStatus = useCallback(async () => {
    if (!cohortId) return;
    if (!studentId && !guestToken) return;
    try {
      const status = await getLiveZoomCohortQueueStatus(cohortId, statusParams());
      setEntry(status.my_entry ?? null);
      setError(null);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, "Unable to refresh queue status."));
    }
  }, [cohortId, studentId, guestToken, statusParams]);

  const handleJoin = useCallback(async () => {
    if (isGuest && !guestReady) {
      setError("Enter your full name, a valid email, and phone number before joining.");
      setEditingDetails(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await joinLiveZoomCohortQueue(cohortId, participantPayload());
      setEntry(res.entry);
      persistGuestDetails(details);
      if (res.entry?.guest_token) {
        onGuestToken?.(res.entry.guest_token);
        saveGuestProfile(cohortId, {
          token: res.entry.guest_token,
          name: details.name.trim(),
          email: details.email.trim(),
          phone: details.phone.trim(),
        });
      }
      setEditingDetails(false);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, "Could not join the queue."));
      if (isGuest) setEditingDetails(true);
    } finally {
      setLoading(false);
    }
  }, [cohortId, participantPayload, onGuestToken, details, persistGuestDetails, isGuest, guestReady]);

  const handleLeaveQueue = async () => {
    setLoading(true);
    try {
      await leaveLiveZoomCohortQueue(cohortId, statusParams());
      setEntry(null);
      setHasAutoJoined(false);
      clearGuestProfile(cohortId);
      onLeave?.();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, "Could not leave the queue."));
    } finally {
      setLoading(false);
    }
  };

  const refreshPublicQueue = useCallback(async () => {
    if (!cohortId) return;
    try {
      const snapshot = await getPublicLiveCohortQueue(cohortId);
      setQueueSnapshot(snapshot);
    } catch {
      // non-blocking
    }
  }, [cohortId]);

  const handleJoinMeeting = () => {
    const suffix = studentId ? `?student_id=${studentId}` : "";
    navigate(`/live-cohort/${cohortId}/room${suffix}`);
  };

  const handleDone = async () => {
    setLoading(true);
    try {
      await finishLiveZoomCohortTurn(cohortId, statusParams());
      setEntry(null);
      setHasAutoJoined(false);
      clearGuestProfile(cohortId);
      onLeave?.();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, "Could not release your turn."));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = () => {
    setError(null);
    if (!details.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!details.email.trim() || !isValidGuestEmail(details.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!details.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    persistGuestDetails(details);
    setEditingDetails(false);
  };

  const canEditDetails = isGuest && !entry?.can_join && entry?.status !== "in_meeting";

  useEffect(() => {
    if (!autoJoin || hasAutoJoined || editingDetails) return;
    if (studentId) {
      setHasAutoJoined(true);
      void handleJoin();
      return;
    }
    if (!guestReady) return;
    setHasAutoJoined(true);
    void handleJoin();
  }, [autoJoin, hasAutoJoined, editingDetails, studentId, guestReady, handleJoin]);

  useEffect(() => {
    if (!entry && guestToken) void refreshStatus();
  }, [entry, guestToken, refreshStatus]);

  useEffect(() => {
    void refreshPublicQueue();
    const timer = window.setInterval(() => void refreshPublicQueue(), 5000);
    return () => window.clearInterval(timer);
  }, [refreshPublicQueue]);

  useEffect(() => {
    if (!entry) return;
    const timer = window.setInterval(() => {
      void refreshStatus();
      void refreshPublicQueue();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [entry?.id, refreshStatus, refreshPublicQueue]);

  useEffect(() => {
    if (!entry?.can_join) return;
    if (entry.status === "in_meeting") return;
    navigate(`/live-cohort/${cohortId}/room${studentId ? `?student_id=${studentId}` : ""}`);
  }, [entry?.can_join, entry?.status, cohortId, studentId, navigate]);

  const showGuestForm = isGuest && (editingDetails || !guestReady) && !entry;

  return (
    <div className="space-y-6">
      {!entry && !showGuestForm && (
        <ParticipantWaitingStage
          branding={branding}
          mode="waiting"
          message={
            isLive
              ? "Enter the waiting room. The first guest joins automatically when the session is live; others wait with a queue number until the host admits them."
              : "The session hasn't started yet — you can still join the waiting room. The host can admit you at any time."
          }
        />
      )}

      {showGuestForm && (
        <div className="rounded-xl border border-white/10 bg-[#232323] p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Join waiting room</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Enter your details to join. If you are first while the session is live, you enter automatically. Otherwise you receive a queue number and the host admits you.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`guest-name-${cohortId}`} className="text-zinc-300">Full name</Label>
              <Input
                id={`guest-name-${cohortId}`}
                value={details.name}
                onChange={(e) => setDetails((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Your full name"
                disabled={loading}
                className="border-white/10 bg-[#2d2d2d] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`guest-email-${cohortId}`} className="text-zinc-300">Email</Label>
              <Input
                id={`guest-email-${cohortId}`}
                type="email"
                value={details.email}
                onChange={(e) => setDetails((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="you@example.com"
                disabled={loading}
                className="border-white/10 bg-[#2d2d2d] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`guest-phone-${cohortId}`} className="text-zinc-300">Phone</Label>
              <Input
                id={`guest-phone-${cohortId}`}
                type="tel"
                value={details.phone}
                onChange={(e) => setDetails((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+250 7XX XXX XXX"
                disabled={loading}
                className="border-white/10 bg-[#2d2d2d] text-white"
              />
            </div>
          </div>

          <Button
            className="w-full bg-[#0e72ed] hover:bg-[#0b5fc7]"
            onClick={() => void handleJoin()}
            disabled={loading || !guestReady}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enter waiting room
          </Button>
        </div>
      )}

      {loading && !entry && !showGuestForm && (
        <div className="flex flex-col items-center gap-3 py-8 text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin text-[#0e72ed]" />
          <p>Joining waiting room…</p>
        </div>
      )}

      {entry?.is_waiting && (
        <>
          <ParticipantWaitingStage
            branding={branding}
            mode="waiting"
            queuePosition={entry.queue_position}
            aheadCount={entry.ahead_count}
            waitingCount={queueSnapshot?.waiting_count}
            message={entry.message}
          />
          <div className="flex flex-wrap justify-center gap-2">
            {canEditDetails && (
              <Button variant="outline" className="border-white/10 bg-[#232323] text-zinc-200" onClick={() => setEditingDetails(true)}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit details
              </Button>
            )}
            <Button variant="outline" className="border-white/10 bg-[#232323] text-zinc-200" onClick={() => void handleLeaveQueue()} disabled={loading}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Leave waiting room
            </Button>
          </div>
        </>
      )}

      {entry?.is_admitted && !entry.can_join && entry.status !== "in_meeting" && (
        <>
          <ParticipantWaitingStage
            branding={branding}
            mode="host_waiting"
            message={entry.message}
          />
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" className="border-white/10 bg-[#232323] text-zinc-200" onClick={() => void handleLeaveQueue()} disabled={loading}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Leave waiting room
            </Button>
          </div>
        </>
      )}

      {entry?.can_join && (
        <>
          <ParticipantWaitingStage
            branding={branding}
            mode="admitted"
            message={entry.message}
          />
          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="h-12 min-w-[220px] bg-[#0e72ed] px-8 text-base hover:bg-[#0b5fc7]"
              onClick={handleJoinMeeting}
              disabled={loading}
            >
              <Video className="mr-2 h-5 w-5" />
              Join meeting
            </Button>
            <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => void handleDone()} disabled={loading}>
              Leave meeting
            </Button>
          </div>
        </>
      )}

      {entry?.status === "in_meeting" && (
        <div className="space-y-4 text-center">
          <ParticipantWaitingStage branding={branding} mode="admitted" message="You are in the session." />
          <div className="flex flex-wrap justify-center gap-2">
            <Button className="bg-[#0e72ed] hover:bg-[#0b5fc7]" onClick={handleJoinMeeting}>
              Rejoin meeting
            </Button>
            <Button variant="outline" className="border-white/10 bg-[#232323] text-zinc-200" onClick={() => void handleDone()} disabled={loading}>
              Leave meeting
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-center text-sm text-red-200">
          {error}
        </p>
      )}

      {!entry && !showGuestForm && !loading && guestReady && (
        <div className="flex justify-center">
          <Button className="bg-[#0e72ed] hover:bg-[#0b5fc7]" onClick={() => void handleJoin()} disabled={loading}>
            Enter waiting room
          </Button>
        </div>
      )}
    </div>
  );
}
