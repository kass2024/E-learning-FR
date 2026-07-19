import { getAdminImpersonation } from "@/lib/adminImpersonation";

/** Read current dashboard user identifiers from localStorage. */
export function getInstructorEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("parrot_user_email");
}

/** Instructor email for API calls — prefers admin view-as target when previewing. */
export function resolveInstructorEmail(): string {
  if (typeof window === "undefined") return "";
  const imp = getAdminImpersonation();
  if (imp?.viewAsRole === "instructor" && imp.viewAsEmail?.trim()) {
    return imp.viewAsEmail.trim();
  }
  return window.localStorage.getItem("parrot_user_email")?.trim() ?? "";
}

export function getStudentId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("parrot_student_id");
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** URL param → localStorage → admin "view as student" impersonation. */
export function resolveLearnerStudentId(urlStudentId?: number): number {
  if (urlStudentId && urlStudentId > 0) return urlStudentId;
  const stored = getStudentId();
  if (stored) return stored;
  const imp = getAdminImpersonation();
  if (imp?.viewAsStudentId) {
    const id = Number(imp.viewAsStudentId);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return 0;
}

export function resolveLearnerEmail(): string {
  if (typeof window === "undefined") return "";
  const imp = getAdminImpersonation();
  if (imp?.viewAsRole === "learner" && imp.viewAsEmail) {
    return imp.viewAsEmail.trim();
  }
  return window.localStorage.getItem("parrot_user_email")?.trim() ?? "";
}

export function dashboardCacheKey(prefix: string, id: string | number): string {
  return `${prefix}-${id}`;
}
