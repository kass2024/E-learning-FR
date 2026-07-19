import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudyShiftPicker } from "@/components/StudyShiftPicker";
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
import { ExternalLink, Loader2 } from "lucide-react";
import type { UpafaCatalogCourse } from "./LearnerUpafaCourseCatalog";

type Props = {
  courses: UpafaCatalogCourse[];
  courseStatuses: Record<number, string>;
  busyCourseId?: number | null;
  onApply?: (courseId: number, studyShiftIds: number[]) => void;
  onOpenCourse: (courseId: number) => void;
  onPay?: (courseId: number) => void;
  defaultCourseId?: number | null;
  showOnlyEnrolled?: boolean;
};

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

type CourseListItemProps = {
  course: UpafaCatalogCourse;
  status: string | undefined;
  selected: boolean;
  onSelect: () => void;
};

function CourseListItem({ course, status, selected, onSelect }: CourseListItemProps) {
  const code = displayCode(course);
  const hasStatus = Boolean(status);
  const badge = hasStatus ? enrollmentBadgeLabel(status) : "Available";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-md border bg-white p-3 transition-colors shadow-sm",
        "hover:border-[#0f6cbf]/40 hover:bg-[#0f6cbf]/5",
        selected
          ? "border-[#0f6cbf] bg-[#0f6cbf]/10 ring-1 ring-[#0f6cbf]/30"
          : "border-slate-200"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-bold text-[#0f6cbf] bg-[#0f6cbf]/10 px-1.5 py-0.5 rounded shrink-0">
          {code}
        </span>
        <Badge
          variant={hasStatus ? "default" : "secondary"}
          className={cn(
            "text-[9px] font-normal shrink-0 max-w-[45%] truncate",
            hasCourseAccess(status) && "bg-[#0f6cbf] hover:bg-[#0f6cbf]",
            isEnrollmentRejected(status) && "bg-red-100 text-red-800 hover:bg-red-100"
          )}
        >
          {badge}
        </Badge>
      </div>
      <p className={cn("mt-2 text-sm font-semibold leading-snug", selected ? "text-[#0f6cbf]" : "text-slate-900")}>
        {course.title ?? "Untitled course"}
      </p>
    </button>
  );
}

function CourseDetailPanel({
  course,
  status,
  busyCourseId,
  onApply,
  onOpenCourse,
  onPay,
}: {
  course: UpafaCatalogCourse;
  status: string | undefined;
  busyCourseId: number | null;
  onApply?: (courseId: number, studyShiftIds: number[]) => void;
  onOpenCourse: (courseId: number) => void;
  onPay?: (courseId: number) => void;
}) {
  const code = displayCode(course);
  const hasStatus = Boolean(status);
  const isBusy = busyCourseId === course.id;
  const paymentLabel = hasStatus ? enrollmentPaymentStatusText(status) : "Not applied";
  const canOpen = hasCourseAccess(status) || isPendingEnrollmentApproval(status);
  const canPay = canPayForEnrollment(status) && !isEnrollmentPaid(status);
  const rejected = isEnrollmentRejected(status);
  const showApplyForm = !hasStatus && !rejected && Boolean(onApply);

  const [shiftIds, setShiftIds] = useState<number[]>([]);
  const [requiresShifts, setRequiresShifts] = useState(false);

  useEffect(() => {
    setShiftIds([]);
    setRequiresShifts(false);
  }, [course.id]);

  const canSubmitApply = !requiresShifts || shiftIds.length > 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden h-full">
      <div className="px-4 py-4 bg-[#f8f9fa] border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-[#0f6cbf] bg-[#0f6cbf]/10 px-2 py-0.5 rounded">
            {code}
          </span>
          <h2 className="text-lg font-semibold text-slate-900">{course.title ?? "Untitled course"}</h2>
        </div>
        {hasStatus && (
          <p className="text-xs text-muted-foreground mt-2">{enrollmentBadgeLabel(status)}</p>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <p className="text-sm text-slate-700 leading-relaxed">
          {course.description?.trim() || "No description provided for this course."}
        </p>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs rounded-md border border-slate-100 bg-slate-50/50 p-3">
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

        {showApplyForm && (
          <StudyShiftPicker
            courseId={course.id}
            value={shiftIds}
            onChange={(ids) => setShiftIds(ids)}
            onShiftsLoaded={(hasShifts) => setRequiresShifts(hasShifts)}
          />
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {canOpen && (
            <Button
              size="sm"
              className="bg-[#0f6cbf] hover:bg-[#0a5a9e]"
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
              className="border-[#0f6cbf] text-[#0f6cbf]"
              disabled={isBusy}
              onClick={() => onPay(course.id)}
            >
              Pay now
            </Button>
          )}
          {!hasStatus && !rejected && onApply && (
            <Button
              size="sm"
              disabled={isBusy || !canSubmitApply}
              onClick={() => onApply(course.id, shiftIds)}
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
        </div>

        {rejected && (
          <p className="text-xs text-red-600">Application rejected. Contact support if you need help.</p>
        )}
        {isPendingEnrollmentApproval(status) && (
          <p className="text-xs text-sky-700">Pending approval — you can still read the full course guide.</p>
        )}
      </div>
    </div>
  );
}

export function LearnerMyCoursesSplitLayout({
  courses,
  courseStatuses,
  busyCourseId = null,
  onApply,
  onOpenCourse,
  onPay,
  defaultCourseId = null,
  showOnlyEnrolled = false,
}: Props) {
  const filtered = useMemo(() => {
    const list = showOnlyEnrolled
      ? courses.filter((c) => Boolean(getEnrollmentStatusForCourse(courseStatuses, c.id)))
      : courses;
    return sortCourses(list, courseStatuses);
  }, [courses, courseStatuses, showOnlyEnrolled]);

  const enrolled = useMemo(
    () => filtered.filter((c) => Boolean(getEnrollmentStatusForCourse(courseStatuses, c.id))),
    [filtered, courseStatuses]
  );
  const available = useMemo(
    () => filtered.filter((c) => !getEnrollmentStatusForCourse(courseStatuses, c.id)),
    [filtered, courseStatuses]
  );

  const [selectedId, setSelectedId] = useState<number | null>(defaultCourseId);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId && filtered.some((c) => c.id === selectedId)) return;
    const fallback = defaultCourseId && filtered.some((c) => c.id === defaultCourseId)
      ? defaultCourseId
      : filtered[0].id;
    setSelectedId(fallback);
  }, [filtered, defaultCourseId, selectedId]);

  const selected = filtered.find((c) => c.id === selectedId) ?? null;
  const showGroups = !showOnlyEnrolled && enrolled.length > 0 && available.length > 0;

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {showOnlyEnrolled ? "You have not applied for any courses yet." : "No courses are available yet."}
      </p>
    );
  }

  const renderList = (list: UpafaCatalogCourse[]) =>
    list.map((course) => (
      <CourseListItem
        key={course.id}
        course={course}
        status={getEnrollmentStatusForCourse(courseStatuses, course.id)}
        selected={course.id === selectedId}
        onSelect={() => setSelectedId(course.id)}
      />
    ));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(240px,280px)_1fr] lg:gap-5 items-start">
      <aside className="rounded-lg border border-slate-200 bg-[#f8f9fa] shadow-sm overflow-hidden lg:sticky lg:top-4">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-white">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Courses</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} listed</p>
        </div>
        <div className="p-2 space-y-3 max-h-[min(70vh,520px)] overflow-y-auto">
          {showGroups ? (
            <>
              <div className="space-y-2">
                <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  My enrollments ({enrolled.length})
                </p>
                <div className="space-y-2">{renderList(enrolled)}</div>
              </div>
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Available to apply ({available.length})
                </p>
                <div className="space-y-2">{renderList(available)}</div>
              </div>
            </>
          ) : (
            <div className="space-y-2">{renderList(filtered)}</div>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        {selected ? (
          <CourseDetailPanel
            course={selected}
            status={getEnrollmentStatusForCourse(courseStatuses, selected.id)}
            busyCourseId={busyCourseId}
            onApply={onApply}
            onOpenCourse={onOpenCourse}
            onPay={onPay}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-muted-foreground">
            Select a course from the list.
          </div>
        )}
      </div>
    </div>
  );
}
