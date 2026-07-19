import { resolveLearnerStudentId } from "@/lib/dashboardUser";
import { beginZoomLaunch, clearZoomLaunchPending } from "@/lib/zoomLaunchPending";

export type OpenZoomMeetingOptions = {
  /** Show the launch spinner in the current tab while the meeting loads. */
  beginLaunch?: boolean;
  launchTitle?: string | null;
  isHost?: boolean;
};

/** Navigate to an in-app meeting route in the current tab. */
export function openZoomMeetingInSameTab(path: string, options: OpenZoomMeetingOptions = {}): void {
  if (typeof window === "undefined") return;

  if (options.beginLaunch) {
    beginZoomLaunch({
      title: options.launchTitle ?? undefined,
      isHost: options.isHost ?? true,
    });
  }

  window.location.assign(absoluteAppUrl(path));
}

/** Open a blank tab that can later be navigated (popup-guard friendly). */
export function openZoomMeetingBlankTab(): Window | null {
  if (typeof window === "undefined") return null;
  return window.open("about:blank", "_blank");
}

/** Navigate a previously opened tab to an in-app meeting route. */
export function navigateZoomMeetingTab(tab: Window | null, path: string): boolean {
  const url = absoluteAppUrl(path);
  if (tab && !tab.closed) {
    try {
      tab.location.href = url;
      tab.focus();
      return true;
    } catch {
      // fall through
    }
  }
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  return Boolean(opened);
}

/**
 * Open an in-app host/join route in a new tab so the dashboard stays open.
 * Reuses one named window per path so Start cannot spawn duplicate meeting tabs.
 * Never starts a launch spinner on the current (dashboard) tab.
 * Falls back to same-tab navigation if the popup is blocked.
 */
export function openZoomMeetingInNewTab(path: string, options: OpenZoomMeetingOptions = {}): void {
  if (typeof window === "undefined") return;

  // Dashboard must not show "loading meeting" while a separate tab joins.
  clearZoomLaunchPending();

  const url = absoluteAppUrl(path);
  // Named target reuses the same tab if Start is clicked again.
  const windowName = `xander-meeting-${path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

  // If this tab is already the host/join page, stay here — do not open another.
  try {
    const current = `${window.location.pathname}${window.location.search}`;
    const targetPath = path.startsWith("/") ? path : `/${path}`;
    if (current === targetPath || current.startsWith(targetPath.split("?")[0])) {
      return;
    }
  } catch {
    // ignore
  }

  const tab = window.open(url, windowName);
  if (!tab) {
    openZoomMeetingInSameTab(path, { ...options, beginLaunch: options.beginLaunch ?? false });
    return;
  }
  try {
    tab.focus();
  } catch {
    // ignore
  }
}

/** Open a live class / meeting in a new tab (dashboard stays put, no spinner here). */
export function openMeetingInNewTab(
  path: string,
  options: OpenZoomMeetingOptions & { launchTitle?: string | null } = {},
): void {
  openZoomMeetingInNewTab(path, {
    beginLaunch: false,
    launchTitle: options.launchTitle ?? "Live class",
    isHost: options.isHost ?? false,
  });
}

export function cohortParticipantRoom(cohortId: number, studentId?: number) {
  const query = studentId ? `?student_id=${studentId}` : "";
  return `/live-cohort/${cohortId}/room${query}`;
}

export function cohortHostStudio(cohortId: number) {
  return `/live-cohort/${cohortId}/host`;
}

export function cohortPublicJoin(cohortId: number) {
  return `/live-cohort/${cohortId}/join`;
}

export function materialEmbedRoom(materialId: number, role: 0 | 1 = 0, studentId?: number) {
  const params = new URLSearchParams({
    material_id: String(materialId),
    role: String(role),
  });
  const effectiveStudentId = role === 0 ? studentId ?? resolveLearnerStudentId() : studentId;
  if (effectiveStudentId && effectiveStudentId > 0) {
    params.set("student_id", String(effectiveStudentId));
  }
  return `/meeting/room?${params.toString()}`;
}

/** Ensure API-provided embed paths include the current learner student id when missing. */
export function learnerEmbedRoomPath(path: string, studentId?: number): string {
  const effectiveStudentId = studentId ?? resolveLearnerStudentId();
  if (!effectiveStudentId) return path;

  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(path.startsWith("/") ? path : `/${path}`, base);
    if (!url.searchParams.get("student_id")) {
      url.searchParams.set("student_id", String(effectiveStudentId));
    }
    return `${url.pathname}?${url.searchParams.toString()}`;
  } catch {
    return path;
  }
}

export function materialPreviewRoom(materialId: number) {
  const params = new URLSearchParams({
    material_id: String(materialId),
    role: "0",
    preview: "1",
  });
  return `/meeting/room?${params.toString()}`;
}

export function absoluteAppUrl(path: string) {
  if (typeof window === "undefined") return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export type ZoomMeetingEmbedAttendee = {
  userName?: string;
  userEmail?: string;
};

export function zoomMeetingEmbedRoom(
  meetingNumber: string | number,
  role: 0 | 1 = 1,
  password?: string,
  attendee?: ZoomMeetingEmbedAttendee,
) {
  const params = new URLSearchParams({
    meeting_number: String(meetingNumber),
    role: String(role),
  });
  if (password) {
    params.set("password", password);
  }
  if (attendee?.userName) {
    params.set("user_name", attendee.userName);
  }
  if (attendee?.userEmail) {
    params.set("user_email", attendee.userEmail);
  } else if (role === 1 && typeof window !== "undefined") {
    const hostEmail = localStorage.getItem("parrot_user_email")?.trim();
    if (hostEmail) {
      params.set("user_email", hostEmail);
    }
  }
  return `/meeting/room?${params.toString()}`;
}

export function webinarHostRoom() {
  return `/meeting/room?webinar_host=1&role=1`;
}
