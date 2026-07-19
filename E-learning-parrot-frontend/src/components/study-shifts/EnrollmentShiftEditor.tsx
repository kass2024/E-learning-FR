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
import { Loader2 } from "lucide-react";
import { StudyShiftPicker } from "@/components/StudyShiftPicker";
import { formatEnrollmentShiftsSummary } from "@/lib/studyShiftUtils";

type ShiftSummary = {
  id: number;
  label?: string;
  name?: string;
  day_label?: string;
  start_time?: string;
  end_time?: string;
};

type EnrollmentShiftEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  courseTitle?: string;
  studentName?: string;
  currentShifts?: ShiftSummary[];
  initialShiftIds?: number[];
  saving?: boolean;
  onSave: (shiftIds: number[]) => void | Promise<void>;
};

export function EnrollmentShiftEditor({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  studentName,
  currentShifts = [],
  initialShiftIds = [],
  saving = false,
  onSave,
}: EnrollmentShiftEditorProps) {
  const [shiftIds, setShiftIds] = useState<number[]>(initialShiftIds);

  useEffect(() => {
    if (open) {
      setShiftIds(initialShiftIds);
    }
  }, [open, initialShiftIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update study shifts</DialogTitle>
          <DialogDescription>
            {studentName ? `${studentName} · ` : ""}
            {courseTitle ?? `Course #${courseId}`}
          </DialogDescription>
        </DialogHeader>

        {currentShifts.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Current: {formatEnrollmentShiftsSummary(currentShifts)}
          </p>
        )}

        <StudyShiftPicker courseId={courseId} value={shiftIds} onChange={(ids) => setShiftIds(ids)} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => onSave(shiftIds)} disabled={saving || shiftIds.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save shifts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
