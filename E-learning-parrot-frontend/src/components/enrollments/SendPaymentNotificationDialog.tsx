import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  getStudentCourseEnrollments,
  sendCoursePaymentLink,
  type StudentCourseEnrollment,
} from "@/api/axios";
import { canPayForEnrollment } from "@/lib/enrollmentStatus";

type StudentLike = {
  id: number;
  name?: string | null;
  email?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentLike | null;
  staffEmail?: string;
};

export function SendPaymentNotificationDialog({ open, onOpenChange, student, staffEmail }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [enrollments, setEnrollments] = useState<StudentCourseEnrollment[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  const unpaid = useMemo(
    () => enrollments.filter((e) => canPayForEnrollment(e.status)),
    [enrollments]
  );

  useEffect(() => {
    if (!open || !student?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getStudentCourseEnrollments(student.id);
        if (cancelled) return;
        const list = data?.enrollments ?? [];
        setEnrollments(list);
        setSelected(list.filter((e) => canPayForEnrollment(e.status)).map((e) => e.course_id));
      } catch {
        if (!cancelled) {
          setEnrollments([]);
          setSelected([]);
          toast({
            variant: "destructive",
            title: "Could not load enrollments",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, student?.id, toast]);

  const toggle = (courseId: number) => {
    setSelected((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleSend = async () => {
    if (!student?.id || selected.length === 0) return;
    setSending(true);
    let ok = 0;
    let failed = 0;
    let lastError = "";
    for (const courseId of selected) {
      try {
        await sendCoursePaymentLink(courseId, student.id, true, staffEmail);
        ok += 1;
      } catch (error: unknown) {
        failed += 1;
        const err = error as { response?: { data?: { message?: string } } };
        lastError = err?.response?.data?.message || "Send failed";
      }
    }
    setSending(false);
    if (ok > 0) {
      toast({
        title: ok === 1 ? "Payment notification sent" : `${ok} payment notifications sent`,
        description: `Email sent to ${student.email ?? "the learner"} with payment details and Pay & Enroll link.`,
      });
    }
    if (failed > 0) {
      toast({
        variant: "destructive",
        title: failed === selected.length ? "Send failed" : `${failed} failed`,
        description: lastError,
      });
    }
    if (ok > 0 && failed === 0) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#0070D0]" />
            Send payment notification
          </DialogTitle>
          <DialogDescription>
            Email {student?.name || student?.email || "the learner"} with MoMo/bank details and a Pay & Enroll link
            for each unpaid course.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading courses…
          </div>
        ) : unpaid.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No unpaid enrollments for this learner. Enroll them in a course first, or they are already paid.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto py-1">
            {unpaid.map((enrollment) => {
              const checked = selected.includes(enrollment.course_id);
              const price = Number(enrollment.course_price ?? 0);
              return (
                <label
                  key={enrollment.course_id}
                  className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(enrollment.course_id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {enrollment.course_title || `Course #${enrollment.course_id}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {price > 0 ? `${price.toLocaleString()} RWF` : "No price set"} · Status: {enrollment.status}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            className="bg-[#0070D0] hover:bg-[#1A8AD8]"
            disabled={sending || loading || selected.length === 0}
            onClick={() => void handleSend()}
          >
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Send email{selected.length > 1 ? ` (${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
