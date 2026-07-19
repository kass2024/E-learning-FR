import { Loader2, ShieldCheck, Users } from "lucide-react";
import { MeetingProfileAvatar } from "@/components/live/MeetingProfileAvatar";

export type HostBranding = {
  name: string;
  avatarUrl?: string | null;
  companyName: string;
  cohortTitle?: string;
  institutionMode?: boolean;
};

type Props = {
  branding: HostBranding;
  waitingCount?: number;
  connecting?: boolean;
};

export function HostWaitingStage({ branding, waitingCount = 0, connecting = false }: Props) {
  return (
    <div className="absolute inset-0 z-[15] flex flex-col items-center justify-center overflow-hidden bg-[#121212] px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(14,114,237,0.35), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(16,185,129,0.12), transparent 50%)",
        }}
      />

      <div className="relative z-10 flex max-w-lg flex-col items-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-300">
          <ShieldCheck className="h-3.5 w-3.5 text-[#6db3ff]" />
          Waiting room
        </div>

        <p className="mb-6 text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
          {branding.companyName}
        </p>

        <div className="relative mb-6">
          <div className="absolute -inset-3 rounded-full bg-[#0e72ed]/20 blur-xl" />
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-[#2d2d2d] bg-[#2d2d2d] shadow-2xl sm:h-40 sm:w-40">
            <MeetingProfileAvatar
              name={branding.name}
              avatarUrl={branding.avatarUrl}
              className="h-full w-full object-cover"
            />
          </div>
          {connecting && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <Loader2 className="h-8 w-8 animate-spin text-[#0e72ed]" />
            </div>
          )}
        </div>

        <h2 className="text-2xl font-semibold text-white sm:text-3xl">{branding.name}</h2>
        {branding.cohortTitle && (
          <p className="mt-2 max-w-md text-sm text-zinc-400">{branding.cohortTitle}</p>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-base text-zinc-200">
            {connecting ? "Joining your live session…" : "You are live — waiting for participants"}
          </p>
          {!connecting && waitingCount > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0e72ed]/30 bg-[#0e72ed]/15 px-4 py-2 text-sm text-[#6db3ff]">
              <Users className="h-4 w-4" />
              {waitingCount} {waitingCount === 1 ? "person" : "people"} in the queue
            </div>
          )}
          {!connecting && waitingCount === 0 && (
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Share the join link so learners can enter the queue. Open the Queue panel to admit them when ready.
            </p>
          )}
          {!connecting ? (
            <div className="mt-2 grid w-full max-w-sm grid-cols-3 gap-2 text-[11px] text-zinc-400">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">Admit from Queue</div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">Raise-hand approve</div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">Engage · Q&A</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
