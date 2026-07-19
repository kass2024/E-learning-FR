import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  approveCourseEnrollment,
  markCourseEnrollmentPaid,
  rejectCourseEnrollment,
  removeCourseEnrollment,
  sendCoursePaymentLink,
} from "@/api/axios";
import {
  canPayForEnrollment,
  isEnrollmentPaid,
  isPendingEnrollmentApproval,
} from "@/lib/enrollmentStatus";
import { CheckCircle2, CreditCard, Loader2, Mail, MoreHorizontal, Trash2, XCircle } from "lucide-react";

type Props = {
  studentId: number;
  courseId: number;
  status: string;
  onUpdated: () => void | Promise<void>;
  onReject?: () => void;
  compact?: boolean;
  staffEmail?: string;
};

export function EnrollmentManageActions({
  studentId,
  courseId,
  status,
  onUpdated,
  onReject,
  compact = false,
  staffEmail,
}: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (action: string, fn: () => Promise<unknown>, success: string) => {
    try {
      setBusy(action);
      await fn();
      toast({ variant: "success" as any, title: success });
      await onUpdated();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleApprove = () => {
    if (!window.confirm("Approve this enrollment? The learner will get immediate course access.")) return;
    void run(
      "approve",
      () => approveCourseEnrollment(courseId, studentId, staffEmail),
      "Enrollment approved — learner has access"
    );
  };

  const handleReject = () => {
    if (onReject) {
      void onReject();
      return;
    }
    const reason = window.prompt("Optional reason for rejection:");
    if (reason === null) return;
    void run(
      "reject",
      () => rejectCourseEnrollment(courseId, studentId, reason || undefined, staffEmail),
      "Enrollment rejected"
    );
  };

  const handleMarkPaid = () => {
    if (!window.confirm("Mark this enrollment as paid (manual / offline payment)?")) return;
    void run("paid", () => markCourseEnrollmentPaid(courseId, studentId, staffEmail), "Marked as paid");
  };

  const handleSendLink = () => {
    void run(
      "link",
      () => sendCoursePaymentLink(courseId, studentId, true, staffEmail),
      "Payment link sent to learner"
    );
  };

  const handleRemove = () => {
    if (
      !window.confirm(
        "Remove this learner from the course? They will lose access. Use this when they refuse to pay."
      )
    ) {
      return;
    }
    void run(
      "remove",
      () => removeCourseEnrollment(courseId, studentId, undefined, staffEmail),
      "Learner removed from course"
    );
  };

  const pending = isPendingEnrollmentApproval(status);
  const unpaidApproved = canPayForEnrollment(status);
  const paid = isEnrollmentPaid(status);
  const isLoading = busy !== null;

  if (pending) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700"
          disabled={isLoading}
          onClick={handleApprove}
        >
          {busy === "approve" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Approve
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px] text-red-600 border-red-200 hover:bg-red-50"
          disabled={isLoading}
          onClick={handleReject}
        >
          {busy === "reject" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </>
          )}
        </Button>
      </div>
    );
  }

  if (paid) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={compact ? "ghost" : "outline"} size="sm" className="h-7 w-7 p-0" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {unpaidApproved && (
          <>
            <DropdownMenuItem onClick={handleSendLink} disabled={isLoading}>
              <Mail className="w-4 h-4 mr-2" />
              Send payment link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleMarkPaid} disabled={isLoading}>
              <CreditCard className="w-4 h-4 mr-2" />
              Mark as paid
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={handleRemove} disabled={isLoading}>
          <Trash2 className="w-4 h-4 mr-2" />
          Remove from course
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
