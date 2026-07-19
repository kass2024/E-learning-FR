import { MonitorUp, ShieldCheck, Users } from "lucide-react";

type Props = {
  title: string;
  participantCount: number;
  sharing?: boolean;
  onOpenParticipants?: () => void;
  showParticipantsButton?: boolean;
};

export function MeetingTopBar({
  title,
  participantCount,
  sharing = false,
  onOpenParticipants,
  showParticipantsButton = true,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[12] flex min-h-11 items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent px-3 pb-6 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4">
      <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2 pr-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0e72ed] text-[9px] font-bold text-white shadow-sm">
          zm
        </span>
        <div className="min-w-0">
          <span className="block truncate text-xs font-medium text-white sm:text-sm">{title}</span>
          {sharing && (
            <span className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-300">
              <MonitorUp className="h-3 w-3 shrink-0" />
              Screen sharing
            </span>
          )}
        </div>
        <ShieldCheck className="hidden h-3.5 w-3.5 shrink-0 text-emerald-400 sm:inline" aria-hidden />
      </div>

      {showParticipantsButton && onOpenParticipants && (
        <button
          type="button"
          onClick={onOpenParticipants}
          className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-xs text-zinc-100 backdrop-blur-md transition-colors hover:bg-black/80"
        >
          <Users className="h-3.5 w-3.5" />
          <span className="font-medium tabular-nums">{participantCount}</span>
        </button>
      )}
    </div>
  );
}
