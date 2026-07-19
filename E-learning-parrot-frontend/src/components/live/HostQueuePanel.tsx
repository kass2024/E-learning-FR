import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  Loader2,
  MicOff,
  Radio,
  Square,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  VideoOff,
  X,
} from "lucide-react";
import type { LiveZoomCohortQueueEntry } from "@/api/axios";

function formatJoinedAt(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  current: LiveZoomCohortQueueEntry | null;
  inSession?: LiveZoomCohortQueueEntry[];
  waiting: LiveZoomCohortQueueEntry[];
  admittedReady: LiveZoomCohortQueueEntry[];
  recording: boolean;
  actionLoading: boolean;
  sdkReady: boolean;
  onAdmitNext: () => void;
  onAdmitAll: () => void;
  onAdmitSelected?: (entryIds: number[]) => void;
  onRelease: () => void;
  onAdmitEntry: (entryId: number) => void;
  onMuteParticipant?: (entry: LiveZoomCohortQueueEntry) => void;
  onStopVideoParticipant?: (entry: LiveZoomCohortQueueEntry) => void;
  onRemoveParticipant?: (entry: LiveZoomCohortQueueEntry) => void;
  onToggleRecording: (action: "start" | "stop", meta?: { clientHandled?: boolean }) => void;
};

export function HostQueuePanel({
  open,
  onClose,
  current,
  inSession = [],
  waiting,
  admittedReady,
  recording,
  actionLoading,
  sdkReady,
  onAdmitNext,
  onAdmitAll,
  onAdmitSelected,
  onRelease,
  onAdmitEntry,
  onMuteParticipant,
  onStopVideoParticipant,
  onRemoveParticipant,
  onToggleRecording,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const totalWaiting = waiting.length;
  const sessionPeople = useMemo(() => {
    if (inSession.length > 0) return inSession;
    return current ? [current] : [];
  }, [inSession, current]);
  const inSessionCount = sessionPeople.length;
  const selectedWaiting = selectedIds.filter((id) => waiting.some((w) => w.id === id));
  const canModerateSession = Boolean(onMuteParticipant || onStopVideoParticipant || onRemoveParticipant);

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllWaiting = () => {
    if (selectedWaiting.length === waiting.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(waiting.map((w) => w.id));
  };

  const handleAdmitSelected = () => {
    if (selectedWaiting.length === 0) return;
    if (onAdmitSelected) {
      onAdmitSelected(selectedWaiting);
    } else {
      selectedWaiting.forEach((id) => onAdmitEntry(id));
    }
    setSelectedIds([]);
  };

  return (
    <>
      {open && (
        <button
          type="button"
          className="absolute inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close queue panel"
          onClick={onClose}
        />
      )}

      <aside
        className={`zoom-host-queue-panel fixed right-0 top-0 bottom-0 z-40 flex w-[min(100vw,360px)] flex-col border-l border-white/10 bg-[#232323] shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Waiting room</h2>
            {totalWaiting > 0 && (
              <Badge className="h-5 bg-[#0e72ed] px-1.5 text-[10px] hover:bg-[#0e72ed]">
                {totalWaiting}
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 space-y-3 border-b border-white/10 p-4">
          <div
            className={`rounded-lg border p-3 ${
              inSessionCount > 0 ? "border-emerald-500/30 bg-emerald-950/20" : "border-white/10 bg-[#2d2d2d]"
            }`}
          >
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              <UserCheck className="h-3 w-3" />
              In session ({inSessionCount})
            </p>
            {sessionPeople.length > 0 ? (
              <ul className="space-y-3">
                {sessionPeople.map((person) => (
                  <li key={person.id} className="min-w-0 space-y-2">
                    <div>
                      <p className="truncate font-medium text-white">{person.display_name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge className="h-5 bg-emerald-600 capitalize text-[10px] hover:bg-emerald-600">
                          {person.status}
                        </Badge>
                        {person.is_guest && (
                          <Badge variant="outline" className="h-5 border-white/20 text-[10px] text-zinc-300">
                            Guest
                          </Badge>
                        )}
                      </div>
                    </div>
                    {canModerateSession ? (
                      <div className="flex flex-wrap gap-1.5">
                        {onMuteParticipant ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 bg-[#2d2d2d] px-2 text-[10px] text-zinc-100 hover:bg-[#3a3a3a]"
                            disabled={actionLoading}
                            onClick={() => onMuteParticipant(person)}
                            title="Mute microphone"
                          >
                            <MicOff className="mr-1 h-3 w-3" />
                            Mute
                          </Button>
                        ) : null}
                        {onStopVideoParticipant ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 bg-[#2d2d2d] px-2 text-[10px] text-zinc-100 hover:bg-[#3a3a3a]"
                            disabled={actionLoading}
                            onClick={() => onStopVideoParticipant(person)}
                            title="Turn camera off"
                          >
                            <VideoOff className="mr-1 h-3 w-3" />
                            Video
                          </Button>
                        ) : null}
                        {onRemoveParticipant ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-[10px]"
                            disabled={actionLoading}
                            onClick={() => onRemoveParticipant(person)}
                            title="Remove from call"
                          >
                            <UserX className="mr-1 h-3 w-3" />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500">No participants in the room yet</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {totalWaiting > 0 && (
              <>
                <Button
                  size="sm"
                  className="h-9 bg-[#0e72ed] text-xs hover:bg-[#0b5fc7]"
                  disabled={actionLoading}
                  onClick={onAdmitNext}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Admit next (#1)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 bg-[#2d2d2d] text-xs text-zinc-200 hover:bg-[#3a3a3a]"
                  disabled={actionLoading || selectedWaiting.length === 0}
                  onClick={handleAdmitSelected}
                >
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  Admit selected ({selectedWaiting.length})
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 bg-[#2d2d2d] text-xs text-zinc-200 hover:bg-[#3a3a3a]"
                  disabled={actionLoading}
                  onClick={onAdmitAll}
                >
                  Admit all waiting ({totalWaiting})
                </Button>
              </>
            )}
            {inSessionCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 border-white/15 text-xs text-zinc-200 hover:bg-white/5"
                disabled={actionLoading}
                onClick={onRelease}
              >
                Release one → admit next
              </Button>
            )}
            <Button
              size="sm"
              variant={recording ? "destructive" : "secondary"}
              className={recording ? "h-9 text-xs" : "h-9 bg-[#2d2d2d] text-xs text-zinc-200 hover:bg-[#3a3a3a]"}
              disabled={actionLoading || !sdkReady}
              onClick={() => onToggleRecording(recording ? "stop" : "start")}
            >
              {actionLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Radio className="mr-1.5 h-3.5 w-3.5" />
              )}
              {recording ? "Stop recording" : "Start recording"}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="px-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Waiting room — queue order
            </p>
            {waiting.length > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[10px] text-[#6db3ff] hover:underline"
                onClick={toggleSelectAllWaiting}
              >
                {selectedWaiting.length === waiting.length ? (
                  <CheckSquare className="h-3 w-3" />
                ) : (
                  <Square className="h-3 w-3" />
                )}
                Select all
              </button>
            )}
          </div>
          <p className="mb-3 text-[11px] text-zinc-500">
            First guest enters automatically when the session is live. Admit more one-by-one, as a selection, or all at once.
          </p>
          {waiting.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 py-10 text-center text-xs text-zinc-500">
              No join requests yet
            </p>
          ) : (
            <div className="space-y-2">
              {waiting.map((entry) => {
                const selected = selectedIds.includes(entry.id);
                return (
                  <div
                    key={entry.id}
                    className={`flex items-start justify-between gap-2 rounded-lg border p-3 ${
                      selected ? "border-[#0e72ed]/60 bg-[#0e72ed]/10" : "border-white/10 bg-[#2d2d2d]"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <button
                        type="button"
                        className="mt-0.5 shrink-0 text-zinc-400 hover:text-white"
                        aria-label={selected ? "Deselect" : "Select"}
                        onClick={() => toggleSelected(entry.id)}
                      >
                        {selected ? <CheckSquare className="h-4 w-4 text-[#6db3ff]" /> : <Square className="h-4 w-4" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">
                            #{entry.queue_position}
                          </span>
                          <p className="truncate text-sm font-medium text-white">{entry.display_name}</p>
                        </div>
                        {entry.is_guest && (entry.guest_email || entry.guest_phone) && (
                          <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                            {[entry.guest_email, entry.guest_phone].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {entry.joined_at && (
                          <p className="mt-0.5 text-[10px] text-zinc-600">
                            Requested {formatJoinedAt(entry.joined_at)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 border-[#0e72ed]/50 text-[10px] text-[#6db3ff] hover:bg-[#0e72ed]/10"
                      disabled={actionLoading}
                      onClick={() => onAdmitEntry(entry.id)}
                      title="Admit this person into the meeting"
                    >
                      Admit
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {admittedReady.length > 0 && (
            <>
              <p className="mb-2 mt-4 px-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Admitted — joining
              </p>
              <div className="space-y-2">
                {admittedReady.map((entry) => (
                  <div
                    key={`ready-${entry.id}`}
                    className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-3 text-sm"
                  >
                    <p className="truncate font-medium text-white">{entry.display_name}</p>
                    <p className="mt-0.5 text-[10px] text-emerald-400/80">Can enter the meeting now</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
