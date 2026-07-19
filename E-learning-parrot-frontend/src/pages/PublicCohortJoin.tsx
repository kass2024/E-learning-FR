import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { getPublicLiveCohortSession } from "@/api/axios";
import {
  CohortJoinQueuePanel,
  loadGuestProfile,
  saveGuestProfile,
} from "@/components/live/CohortJoinQueuePanel";
import { HUB } from "@/lib/hubConfig";

const PublicCohortJoin = () => {
  const { cohortId } = useParams();
  const id = Number(cohortId || 0);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [cohortTitle, setCohortTitle] = useState("Live Zoom Cohort");
  const [isLive, setIsLive] = useState(false);
  const [scheduleLabel, setScheduleLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Invalid cohort link.");
      return;
    }

    const saved = loadGuestProfile(id);
    if (saved) {
      setGuestName(saved.name ?? "");
      setGuestEmail(saved.email ?? "");
      setGuestPhone(saved.phone ?? "");
      setGuestToken(saved.token ?? null);
    }

    getPublicLiveCohortSession(id)
      .then((data) => {
        setCohortTitle(data.cohort?.title || "Live Zoom Cohort");
        setIsLive(Boolean(data.cohort?.is_live));
        const day = data.cohort?.day;
        const start = data.cohort?.start_time;
        const tz = data.cohort?.timezone;
        if (day && start) {
          setScheduleLabel(`Scheduled ${day} · ${start}${tz ? ` (${tz})` : ""}`);
        }
        setError(null);
      })
      .catch((err: unknown) => {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(message || "Could not load this cohort session.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleGuestDetailsChange = (profile: { name: string; email: string; phone: string }) => {
    setGuestName(profile.name);
    setGuestEmail(profile.email);
    setGuestPhone(profile.phone);
    if (id) {
      saveGuestProfile(id, {
        token: guestToken ?? undefined,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a1a]">
        <Loader2 className="h-10 w-10 animate-spin text-[#0e72ed]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <header className="border-b border-white/10 bg-[#232323] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{HUB.name}</p>
            <p className="truncate text-xs text-zinc-500">Secure live cohort session</p>
          </div>
          {isLive ? (
            <span className="ml-auto shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase">
              Live
            </span>
          ) : (
            <span className="ml-auto shrink-0 rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
              Waiting room open
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-6 text-center text-red-200">
            {error}
          </div>
        ) : (
          <CohortJoinQueuePanel
            cohortId={id}
            cohortTitle={cohortTitle}
            scheduleLabel={scheduleLabel}
            isLive={isLive}
            guestName={guestName}
            guestEmail={guestEmail}
            guestPhone={guestPhone}
            guestToken={guestToken}
            onGuestToken={setGuestToken}
            onGuestDetailsChange={handleGuestDetailsChange}
            autoJoin={false}
          />
        )}
      </main>
    </div>
  );
};

export default PublicCohortJoin;
