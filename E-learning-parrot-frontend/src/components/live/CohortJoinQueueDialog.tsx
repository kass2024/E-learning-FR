import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CohortJoinQueuePanel } from "@/components/live/CohortJoinQueuePanel";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cohortId: number;
  cohortTitle: string;
  studentId?: number;
  guestName?: string;
};

export function CohortJoinQueueDialog({
  open,
  onOpenChange,
  cohortId,
  cohortTitle,
  studentId,
  guestName,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cohortTitle}</DialogTitle>
          <DialogDescription>Join the live cohort queue. One participant at a time.</DialogDescription>
        </DialogHeader>

        {open && (
          <CohortJoinQueuePanel
            cohortId={cohortId}
            cohortTitle={cohortTitle}
            studentId={studentId}
            guestName={guestName}
            autoJoin
            onLeave={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
