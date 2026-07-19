import { getApiBaseUrl, getPublicStorageUrl } from "@/lib/apiConfig";
import { getInstructorEmail, getStudentId } from "@/lib/dashboardUser";

function dashboardRole(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("parrot_user_role")?.toLowerCase() ?? null;
}

/** Resolve quiz/oral audio refs (pcloud:ID, audio:pcloud:ID, legacy uploads/ paths). */
export function resolveQuizAudioUrl(
  src: string | null | undefined,
  courseId: number,
  options?: { filename?: string }
): string | null {
  if (!src?.trim()) return null;
  const ref = src.trim();

  const pcloudId = parsePcloudFileId(ref);
  if (pcloudId && courseId) {
    const params = new URLSearchParams({ pcloud_file_id: String(pcloudId) });
    const role = dashboardRole();
    const studentId = getStudentId();
    const instructorEmail = getInstructorEmail();

    // Learners (incl. admin "view as student") must use student_id — not a student email as instructor.
    if (role === "learner" && studentId) {
      params.set("student_id", String(studentId));
    } else if (studentId && role !== "instructor") {
      params.set("student_id", String(studentId));
    } else if (instructorEmail && (role === "instructor" || role === "admin" || role === "staff")) {
      params.set("instructor_email", instructorEmail);
    } else if (studentId) {
      params.set("student_id", String(studentId));
    } else if (instructorEmail) {
      params.set("instructor_email", instructorEmail);
    }
    if (options?.filename) params.set("filename", options.filename);
    return `${getApiBaseUrl()}/courses/${courseId}/assessment-audio/stream?${params.toString()}`;
  }

  if (ref.startsWith("audio:")) {
    return resolveQuizAudioUrl(ref.slice(6), courseId, options);
  }

  return getPublicStorageUrl(ref);
}

export function parsePcloudFileId(ref: string): number | null {
  if (ref.startsWith("audio:pcloud:")) {
    const id = Number(ref.slice("audio:pcloud:".length));
    return id > 0 ? id : null;
  }
  if (ref.startsWith("pcloud:")) {
    const id = Number(ref.slice("pcloud:".length));
    return id > 0 ? id : null;
  }
  return null;
}

export function isPcloudAudioRef(ref: string | null | undefined): boolean {
  return !!ref && (ref.startsWith("pcloud:") || ref.startsWith("audio:pcloud:"));
}
