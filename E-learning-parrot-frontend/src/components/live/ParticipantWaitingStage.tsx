import { Loader2, Radio, Users } from "lucide-react";
import { MeetingProfileAvatar } from "@/components/live/MeetingProfileAvatar";

export type ParticipantBranding = {
  name: string;
  avatarUrl?: string | null;
  hostAvatarUrl?: string | null;
  companyName: string;
  cohortTitle?: string;
  institutionMode?: boolean;
};

type Props = {
  branding: ParticipantBranding;
  mode: "waiting" | "admitted" | "connecting" | "host_waiting";
  queuePosition?: number;
  aheadCount?: number;
  waitingCount?: number;
  message?: string;
};

export function ParticipantWaitingStage({
  branding,
  mode,
  queuePosition,
  aheadCount = 0,
  waitingCount = 0,
  message,
}: Props) {
  const statusText = (() => {
    if (message) return message;
    switch (mode) {
      case "connecting":
        return "Connecting to the meeting…";
      case "host_waiting":
        return "Waiting for the host to start the meeting. Stay on this page.";
      case "admitted":
        return "You're admitted — tap Join below to enter the session.";
      case "waiting":
      default:
        return aheadCount > 0
          ? `${aheadCount} participant(s) ahead of you. The host will admit you when it's your turn.`
          : "You're in the waiting room. The host will admit you when ready.";
    }
  })();

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-[#1a1a1a] px-6 py-10 text-center">
      <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        {branding.companyName}
      </p>

      <div className="relative mb-5">
        <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[#2d2d2d] bg-[#2d2d2d] shadow-2xl sm:h-36 sm:w-36">
          <MeetingProfileAvatar
            name={branding.name}
            avatarUrl={branding.avatarUrl}
            className="h-full w-full object-cover"
          />
        </div>
        {mode === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-7 w-7 animate-spin text-[#0e72ed]" />
          </div>
        )}
        {mode === "admitted" && (
          <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1a1a1a] bg-emerald-500">
            <Radio className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      <h2 className="text-xl font-semibold text-white sm:text-2xl">{branding.name}</h2>
      {branding.cohortTitle && (
        <p className="mt-1.5 max-w-md text-sm text-zinc-400">{branding.cohortTitle}</p>
      )}

      <div className="mt-6 flex max-w-lg flex-col items-center gap-3">
        {mode === "waiting" && queuePosition != null && queuePosition > 0 && (
          <div className="rounded-full bg-[#0e72ed]/15 px-4 py-1.5 text-sm font-semibold text-[#6db3ff]">
            Queue #{queuePosition}
          </div>
        )}

        <p className="text-sm leading-relaxed text-zinc-300">{statusText}</p>

        {mode === "waiting" && waitingCount > 0 && (
          <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
            <Users className="h-3.5 w-3.5" />
            {waitingCount} in queue total
          </div>
        )}
      </div>
    </div>
  );
}
