import { useCallback, useEffect, useState } from "react";
import { cohortHostStudio, openZoomMeetingInNewTab } from "@/lib/zoomEmbedRoutes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, Users } from "lucide-react";
import {
  getLiveZoomCohortQueue,
  releaseLiveZoomCohortParticipant,
  type AvailableScheduleRow,
  type LiveZoomCohortQueueEntry,
} from "@/api/axios";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cohort: AvailableScheduleRow | null;
};

export function LiveCohortQueueAdminDialog({ open, onOpenChange, cohort }: Props) {
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<LiveZoomCohortQueueEntry | null>(null);
  const [waiting, setWaiting] = useState<LiveZoomCohortQueueEntry[]>([]);
  const [waitingCount, setWaitingCount] = useState(0);

  const loadQueue = useCallback(async () => {
    if (!cohort?.id) return;
    setLoading(true);
    try {
      const data = await getLiveZoomCohortQueue(cohort.id);
      setCurrent(data.current);
      setWaiting(data.waiting ?? []);
      setWaitingCount(data.waiting_count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [cohort?.id]);

  useEffect(() => {
    if (!open || !cohort?.id) return;
    void loadQueue();
    const timer = window.setInterval(() => {
      void loadQueue();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [open, cohort?.id, loadQueue]);

  const handleRelease = async () => {
    if (!cohort?.id) return;
    setLoading(true);
    try {
      await releaseLiveZoomCohortParticipant(cohort.id);
      await loadQueue();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Waiting room — {cohort?.notes || "Live cohort"}</DialogTitle>
          <DialogDescription>
            First guest enters automatically when the session is live. Others wait with a queue number until you admit them from the host studio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserCheck className="h-4 w-4" />
              In session
            </div>
            {current ? (
              <div className="flex items-center justify-between gap-3">
                <span>{current.display_name}</span>
                <Badge>{current.status}</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No one is in the room right now.</p>
            )}
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Waiting ({waitingCount})
            </div>
            {loading && waiting.length === 0 ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : waiting.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one is waiting.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-auto">
                {waiting.map((entry) => (
                  <div key={entry.id} className="border rounded-md px-3 py-2 text-sm space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{entry.display_name}</span>
                      <Badge variant="outline">#{entry.queue_position}</Badge>
                    </div>
                    {entry.is_guest && (entry.guest_email || entry.guest_phone) && (
                      <p className="text-xs text-muted-foreground">
                        {[entry.guest_email, entry.guest_phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {cohort?.id && (
            <Button
              variant="secondary"
              onClick={() =>
                openZoomMeetingInNewTab(cohortHostStudio(cohort.id), {
                  beginLaunch: false,
                  launchTitle: cohort.title ?? "Live cohort",
                  isHost: true,
                })
              }
            >
              Start live cohort
            </Button>
          )}
          <Button onClick={() => void handleRelease()} disabled={loading || !current}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Release current → admit next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
