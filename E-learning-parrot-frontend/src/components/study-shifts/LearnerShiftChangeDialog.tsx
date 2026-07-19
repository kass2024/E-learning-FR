import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { StudyShiftPicker } from "@/components/StudyShiftPicker";
import { formatEnrollmentShiftsSummary } from "@/lib/studyShiftUtils";

type ShiftSummary = {
  id: number;
  label?: string;
};

type LearnerShiftChangeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  courseTitle?: string;
  currentShifts?: ShiftSummary[];
  initialShiftIds?: number[];
  submitting?: boolean;
  onSubmit: (shiftIds: number[], reason?: string) => void | Promise<void>;
};

export function LearnerShiftChangeDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  currentShifts = [],
  initialShiftIds = [],
  submitting = false,
  onSubmit,
}: LearnerShiftChangeDialogProps) {
  const [shiftIds, setShiftIds] = useState<number[]>(initialShiftIds);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setShiftIds(initialShiftIds);
      setReason("");
    }
  }, [open, initialShiftIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request shift change</DialogTitle>
          <DialogDescription>
            {courseTitle ?? `Course #${courseId}`} — pick your new weekly study times. An instructor will
            review your request.
          </DialogDescription>
        </DialogHeader>

        {currentShifts.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Current schedule: {formatEnrollmentShiftsSummary(currentShifts)}
          </p>
        )}

        <StudyShiftPicker courseId={courseId} value={shiftIds} onChange={(ids) => setShiftIds(ids)} />

        <div className="space-y-2">
          <Label htmlFor="shift-reason">Reason (optional)</Label>
          <Textarea
            id="shift-reason"
            placeholder="e.g. Work schedule changed"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(shiftIds, reason.trim() || undefined)} disabled={submitting || shiftIds.length === 0}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
