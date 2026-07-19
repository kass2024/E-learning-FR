/** Course enrollment statuses and UI helpers (aligned with backend). */

export type EnrollmentStatus =
  | "enrolled"
  | "approved"
  | "paid"
  | "completed"
  | "rejected"
  | string;

export const ENROLLMENT_APPROVER_LABEL = "Your instructor or platform administrators";

export function normalizeEnrollmentStatus(status?: string | null): string {
  return (status ?? "").toLowerCase().trim();
}

export function isPendingEnrollmentApproval(status?: string | null): boolean {
  const s = normalizeEnrollmentStatus(status);
  return s === "enrolled" || s === "applied" || s === "waiting approval";
}

export function canPayForEnrollment(status?: string | null): boolean {
  return normalizeEnrollmentStatus(status) === "approved";
}

/** Full course resource access (materials, live classes, quizzes). */
export function hasCourseAccess(status?: string | null): boolean {
  const s = normalizeEnrollmentStatus(status);
  return s === "approved" || s === "paid" || s === "completed";
}

export function isEnrollmentPaid(status?: string | null): boolean {
  const s = normalizeEnrollmentStatus(status);
  return s === "paid" || s === "completed";
}

export function isEnrollmentRejected(status?: string | null): boolean {
  return normalizeEnrollmentStatus(status) === "rejected";
}

/** Applied for a course and may open the course guide page (pending or approved). */
export function canViewCourseGuide(status?: string | null): boolean {
  if (isEnrollmentRejected(status)) return false;
  const s = normalizeEnrollmentStatus(status);
  if (!s || s === "not applied" || s === "not_enrolled") return false;
  return (
    isPendingEnrollmentApproval(s) ||
    hasCourseAccess(s) ||
    s === "approved" ||
    s === "paid" ||
    s === "completed"
  );
}

export function enrollmentBadgeLabel(status?: string | null): string {
  const s = normalizeEnrollmentStatus(status);
  if (s === "paid") return "Paid";
  if (s === "completed") return "Completed";
  if (s === "approved") return "Active — payment due";
  if (s === "rejected") return "Rejected";
  if (isPendingEnrollmentApproval(s)) return "Waiting approval";
  return "Not applied";
}

export function enrollmentPaymentStatusText(status?: string | null): string {
  const s = normalizeEnrollmentStatus(status);
  if (isEnrollmentPaid(s)) return "Paid";
  if (s === "approved") return "Unpaid — access granted";
  if (s === "rejected") return "Not applicable (application rejected)";
  if (isPendingEnrollmentApproval(s)) {
    return "Not paid — awaiting approval";
  }
  return "Not paid";
}

/** Build course_id → status map from API rows (course_id may be string or number). */
export function buildEnrollmentStatusMap(
  enrollments: Array<{ course_id?: number | string | null; status?: string | null }> | null | undefined
): Record<number, string> {
  const statuses: Record<number, string> = {};
  for (const row of enrollments ?? []) {
    const id = Number(row?.course_id);
    if (!id || Number.isNaN(id)) continue;
    statuses[id] = normalizeEnrollmentStatus(row?.status) || "enrolled";
  }
  return statuses;
}

export function getEnrollmentStatusForCourse(
  statuses: Record<number | string, string | undefined>,
  courseId: number | string | null | undefined
): string | undefined {
  if (courseId == null || courseId === "") return undefined;
  const id = Number(courseId);
  if (!Number.isNaN(id)) {
    return statuses[id] ?? statuses[String(id)];
  }
  return statuses[courseId];
}
