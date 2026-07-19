import type { StudyShiftRow } from "@/api/axios";

const PREFIX = "xander_shifts_";
const TTL_MS = 3 * 60 * 1000;

type Entry = { ts: number; rows: StudyShiftRow[] };

function cacheKey(courseId: number, institutionId?: number | null): string {
  const inst = institutionId != null ? `_inst_${institutionId}` : "";
  return `${PREFIX}${courseId}${inst}`;
}

export function readStudyShiftCache(courseId: number, institutionId?: number | null): StudyShiftRow[] | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(courseId, institutionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry;
    if (Date.now() - parsed.ts > TTL_MS) {
      sessionStorage.removeItem(cacheKey(courseId, institutionId));
      return null;
    }
    return Array.isArray(parsed.rows) ? parsed.rows : null;
  } catch {
    return null;
  }
}

export function writeStudyShiftCache(
  courseId: number,
  rows: StudyShiftRow[],
  institutionId?: number | null
): void {
  try {
    const entry: Entry = { ts: Date.now(), rows };
    sessionStorage.setItem(cacheKey(courseId, institutionId), JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}

export function clearStudyShiftCache(courseId?: number): void {
  try {
    if (courseId != null) {
      const prefix = cacheKey(courseId);
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith(prefix))
        .forEach((k) => sessionStorage.removeItem(k));
      return;
    }
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
