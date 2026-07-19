import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  canPayForEnrollment,
  enrollmentBadgeLabel,
  enrollmentPaymentStatusText,
  getEnrollmentStatusForCourse,
  hasCourseAccess,
  isEnrollmentPaid,
  isEnrollmentRejected,
  isPendingEnrollmentApproval,
} from "@/lib/enrollmentStatus";
import { ChevronRight, ExternalLink, Loader2 } from "lucide-react";

export type UpafaCatalogCourse = {
  id: number;
  title?: string | null;
  course_code?: string | null;
  description?: string | null;
  duration?: string | null;
  price?: number | null;
};

type Props = {
  courses: UpafaCatalogCourse[];
  courseStatuses: Record<number, string>;
  busyCourseId?: number | null;
  onApply?: (courseId: number) => void;
  onOpenCourse: (courseId: number) => void;
  onPay?: (courseId: number) => void;
  defaultOpenIds?: string[];
  showOnlyEnrolled?: boolean;
};

function courseKey(course: UpafaCatalogCourse) {
  return String(course.id);
}

function displayCode(course: UpafaCatalogCourse) {
  return course.course_code?.trim() || `CRS-${course.id}`;
}

function sortCourses(courses: UpafaCatalogCourse[], statuses: Record<number, string>) {
  const rank = (course: UpafaCatalogCourse) => {
    const s = getEnrollmentStatusForCourse(statuses, course.id);
    if (hasCourseAccess(s)) return 0;
    if (isPendingEnrollmentApproval(s)) return 1;
    if (canPayForEnrollment(s)) return 2;
    if (isEnrollmentRejected(s)) return 4;
    if (s) return 3;
    return 5;
  };

  return [...courses].sort((a, b) => {
    const dr = rank(a) - rank(b);
    if (dr !== 0) return dr;
    const codeA = displayCode(a).toLowerCase();
    const codeB = displayCode(b).toLowerCase();
    if (codeA !== codeB) return codeA.localeCompare(codeB);
    return (a.title ?? "").localeCompare(b.title ?? "");
  });
}

export function LearnerUpafaCourseCatalog({
  courses,
  courseStatuses,
  busyCourseId = null,
  onApply,
  onOpenCourse,
  onPay,
  defaultOpenIds,
  showOnlyEnrolled = false,
}: Props) {
  const filtered = useMemo(() => {
    const list = showOnlyEnrolled
      ? courses.filter((c) => Boolean(getEnrollmentStatusForCourse(courseStatuses, c.id)))
      : courses;
    return sortCourses(list, courseStatuses);
  }, [courses, courseStatuses, showOnlyEnrolled]);

  const allIds = useMemo(() => filtered.map((c) => courseKey(c)), [filtered]);
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds ?? []);

  useEffect(() => {
    if (defaultOpenIds?.length) {
      setOpenIds((prev) => (prev.length === 0 ? defaultOpenIds : prev));
    }
  }, [defaultOpenIds]);

  const enrolledCount = filtered.filter((c) =>
    Boolean(getEnrollmentStatusForCourse(courseStatuses, c.id))
  ).length;

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {showOnlyEnrolled ? "You have not applied for any courses yet." : "No courses are available yet."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">
          <span className="font-semibold text-slate-900">{filtered.length}</span> course
          {filtered.length !== 1 ? "s" : ""}
          {!showOnlyEnrolled && enrolledCount > 0 && (
            <span className="ml-1">· {enrolledCount} enrolled</span>
          )}
        </p>
        <div className="flex gap-3 text-[#0f6cbf]">
          <button type="button" className="hover:underline" onClick={() => setOpenIds(allIds)}>
            Expand all
          </button>
          <button type="button" className="hover:underline" onClick={() => setOpenIds([])}>
            Collapse all
          </button>
        </div>
      </div>

      <Accordion
        type="multiple"
        value={openIds}
        onValueChange={setOpenIds}
        className="border border-slate-200 rounded-sm overflow-hidden bg-white shadow-sm"
      >
        {filtered.map((course) => {
          const status = getEnrollmentStatusForCourse(courseStatuses, course.id);
          const hasStatus = Boolean(status);
          const code = displayCode(course);
          const isBusy = busyCourseId === course.id;
          const badge = hasStatus ? enrollmentBadgeLabel(status) : "Available";
          const paymentLabel = hasStatus ? enrollmentPaymentStatusText(status) : "Not applied";
          const canOpen = hasCourseAccess(status) || isPendingEnrollmentApproval(status);
          const canPay = canPayForEnrollment(status) && !isEnrollmentPaid(status);
          const rejected = isEnrollmentRejected(status);
          const applied = isPendingEnrollmentApproval(status) || hasCourseAccess(status) || canPay;

          return (
            <AccordionItem
              key={course.id}
              value={courseKey(course)}
              className="border-b border-slate-200 last:border-b-0"
            >
              <AccordionTrigger
                className={cn(
                  "hover:no-underline px-4 py-3.5 bg-[#f8f9fa] [&[data-state=open]]:border-b [&[data-state=open]]:border-slate-200",
                  "gap-3"
                )}
              >
                <div className="flex flex-1 min-w-0 items-center gap-3 text-left">
                  <span className="shrink-0 font-mono text-sm font-bold text-[#0f6cbf] bg-[#0f6cbf]/10 px-2 py-0.5 rounded">
                    {code}
                  </span>
                  <span className="font-semibold text-slate-900 truncate">{course.title ?? "Untitled course"}</span>
                </div>
                <Badge
                  variant={applied ? "default" : "secondary"}
                  className={cn(
                    "shrink-0 mr-2 text-[10px] font-normal",
                    hasCourseAccess(status) && "bg-[#0f6cbf] hover:bg-[#0f6cbf]",
                    rejected && "bg-red-100 text-red-800 hover:bg-red-100"
                  )}
                >
                  {badge}
                </Badge>
              </AccordionTrigger>

              <AccordionContent className="px-4 py-4 bg-white">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div className="space-y-3 min-w-0">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {course.description?.trim() || "No description provided for this course."}
                    </p>
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <dt className="text-muted-foreground uppercase tracking-wide">Code</dt>
                        <dd className="font-mono font-semibold text-[#0f6cbf] mt-0.5">{code}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground uppercase tracking-wide">Duration</dt>
                        <dd className="font-medium text-slate-900 mt-0.5">{course.duration || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground uppercase tracking-wide">Price</dt>
                        <dd className="font-medium text-slate-900 mt-0.5">
                          {course.price != null && Number(course.price) > 0
                            ? `$${Number(course.price).toFixed(2)}`
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground uppercase tracking-wide">Payment</dt>
                        <dd
                          className={cn(
                            "font-medium mt-0.5",
                            isEnrollmentPaid(status) ? "text-emerald-700" : "text-amber-700"
                          )}
                        >
                          {paymentLabel}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-col gap-2 lg:items-end lg:min-w-[160px]">
                    {canOpen && (
                      <Button
                        size="sm"
                        className="bg-[#0f6cbf] hover:bg-[#0a5a9e] w-full lg:w-auto"
                        disabled={isBusy}
                        onClick={() => onOpenCourse(course.id)}
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        {hasCourseAccess(status) ? "Open course" : "View course guide"}
                      </Button>
                    )}
                    {canPay && onPay && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full lg:w-auto border-[#0f6cbf] text-[#0f6cbf]"
                        disabled={isBusy}
                        onClick={() => onPay(course.id)}
                      >
                        Pay now
                      </Button>
                    )}
                    {!hasStatus && !rejected && onApply && (
                      <Button
                        size="sm"
                        className="w-full lg:w-auto"
                        disabled={isBusy}
                        onClick={() => onApply(course.id)}
                      >
                        {isBusy ? (
                          <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Please wait...
                          </>
                        ) : (
                          "Apply for course"
                        )}
                      </Button>
                    )}
                    {rejected && (
                      <p className="text-xs text-red-600 text-center lg:text-right">
                        Application rejected. Contact support if you need help.
                      </p>
                    )}
                    {isPendingEnrollmentApproval(status) && (
                      <p className="text-xs text-sky-700 text-center lg:text-right">
                        Pending approval — you can still read the full course guide.
                      </p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
