export type LiveSessionStatus = "live" | "upcoming" | "ended" | "unknown";

export type LiveSessionState = {
  session_status: LiveSessionStatus;
  can_join: boolean;
  is_past: boolean;
  is_upcoming: boolean;
  is_live_now: boolean;
  duration_minutes: number;
};

export function getLiveSessionState(
  startTime?: string | null,
  durationMinutes = 60,
  backendState?: Partial<LiveSessionState>
): LiveSessionState {
  if (backendState?.session_status) {
    return {
      session_status: backendState.session_status as LiveSessionStatus,
      can_join: Boolean(backendState.can_join),
      is_past: Boolean(backendState.is_past),
      is_upcoming: Boolean(backendState.is_upcoming),
      is_live_now: Boolean(backendState.is_live_now),
      duration_minutes: backendState.duration_minutes ?? durationMinutes,
    };
  }

  if (!startTime) {
    return {
      session_status: "unknown",
      can_join: false,
      is_past: false,
      is_upcoming: false,
      is_live_now: false,
      duration_minutes: durationMinutes,
    };
  }

  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const now = new Date();

  if (now > end) {
    return {
      session_status: "ended",
      can_join: false,
      is_past: true,
      is_upcoming: false,
      is_live_now: false,
      duration_minutes: durationMinutes,
    };
  }

  if (now >= start) {
    return {
      session_status: "live",
      can_join: true,
      is_past: false,
      is_upcoming: false,
      is_live_now: true,
      duration_minutes: durationMinutes,
    };
  }

  return {
    session_status: "upcoming",
    can_join: false,
    is_past: false,
    is_upcoming: true,
    is_live_now: false,
    duration_minutes: durationMinutes,
  };
}

export function sortLiveClasses<T extends { session_status?: string; start_time?: string | null }>(items: T[]): T[] {
  const rank = (status?: string) => {
    if (status === "live") return 0;
    if (status === "upcoming") return 1;
    if (status === "ended") return 2;
    return 3;
  };

  return [...items].sort((a, b) => {
    const rankDiff = rank(a.session_status) - rank(b.session_status);
    if (rankDiff !== 0) return rankDiff;
    const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
    const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
    return rank(a.session_status) === 2 ? bTime - aTime : aTime - bTime;
  });
}

export function sessionStatusLabel(status: LiveSessionStatus): string {
  switch (status) {
    case "live":
      return "Live now";
    case "upcoming":
      return "Upcoming";
    case "ended":
      return "Ended";
    default:
      return "Scheduled";
  }
}
