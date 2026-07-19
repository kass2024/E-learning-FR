import type { InstructorLiveClassSession } from "@/api/axios";

function pickBestScheduledAt(a?: string | null, b?: string | null): string | null {
  if (!a) return b ?? null;
  if (!b) return a;

  const aMs = new Date(a).getTime();
  const bMs = new Date(b).getTime();
  if (!Number.isFinite(aMs)) return b;
  if (!Number.isFinite(bMs)) return a;

  const now = Date.now();
  const aFuture = aMs > now;
  const bFuture = bMs > now;
  if (aFuture && !bFuture) return a;
  if (bFuture && !aFuture) return b;
  return aMs >= bMs ? a : b;
}

/** Normalize API session rows so list UI always has scheduled_at + upcoming state. */
export function normalizeInstructorLiveSession(
  session: InstructorLiveClassSession,
): InstructorLiveClassSession {
  const scheduled_at = session.scheduled_at ?? session.start_time ?? null;
  const duration_minutes = session.duration_minutes ?? 60;
  const startMs = scheduled_at ? new Date(scheduled_at).getTime() : NaN;
  const endMs = Number.isFinite(startMs) ? startMs + duration_minutes * 60_000 : NaN;
  const now = Date.now();

  let session_status = session.session_status;
  let is_upcoming = session.is_upcoming;

  if (Number.isFinite(startMs)) {
    if (now < startMs) {
      session_status = "upcoming";
      is_upcoming = true;
    } else if (Number.isFinite(endMs) && now > endMs) {
      session_status = "ended";
      is_upcoming = false;
    } else if (!session_status || session_status === "unknown") {
      session_status = "live";
      is_upcoming = false;
    }
  }

  const share_path = session.share_path ?? session.embed_room_path ?? null;

  return {
    ...session,
    scheduled_at,
    duration_minutes,
    session_status,
    is_upcoming,
    share_path,
    embed_room_path: session.embed_room_path ?? share_path,
  };
}

export function normalizeInstructorLiveSessions(
  sessions: InstructorLiveClassSession[] | undefined | null,
): InstructorLiveClassSession[] {
  if (!Array.isArray(sessions)) return [];
  return sessions.map(normalizeInstructorLiveSession);
}

export function isUpcomingLiveSession(session: InstructorLiveClassSession): boolean {
  const scheduled_at = session.scheduled_at ?? session.start_time ?? null;
  const duration = session.duration_minutes ?? 60;

  if (scheduled_at) {
    const startMs = new Date(scheduled_at).getTime();
    if (Number.isFinite(startMs)) {
      if (Date.now() < startMs) return true;
      const endMs = startMs + duration * 60_000;
      if (Date.now() >= endMs) return false;
    }
  }

  const normalized = normalizeInstructorLiveSession(session);
  if (normalized.session_status === "upcoming" || normalized.is_upcoming === true) {
    return true;
  }

  if (scheduled_at) {
    const startMs = new Date(scheduled_at).getTime();
    return Number.isFinite(startMs) && startMs > Date.now();
  }

  return false;
}

/** Merge API rows with local state without dropping freshly scheduled sessions. */
export function mergeInstructorLiveSessions(
  prev: InstructorLiveClassSession[],
  fromApi: InstructorLiveClassSession[],
  pinnedIds?: ReadonlySet<number>,
): InstructorLiveClassSession[] {
  const byId = new Map<number, InstructorLiveClassSession>();

  for (const raw of fromApi) {
    const apiRow = normalizeInstructorLiveSession(raw);
    byId.set(apiRow.id, apiRow);
  }

  for (const raw of prev) {
    const prevRow = normalizeInstructorLiveSession(raw);
    const pinned = pinnedIds?.has(prevRow.id) ?? false;
    const existing = byId.get(prevRow.id);

    if (!existing) {
      if (pinned || isUpcomingLiveSession(prevRow)) {
        byId.set(prevRow.id, prevRow);
      }
      continue;
    }

    const merged = normalizeInstructorLiveSession({
      ...existing,
      ...prevRow,
      scheduled_at: pickBestScheduledAt(existing.scheduled_at, prevRow.scheduled_at),
      host_room_path: prevRow.host_room_path ?? existing.host_room_path,
      embed_room_path: prevRow.embed_room_path ?? existing.embed_room_path,
      share_path: prevRow.share_path ?? existing.share_path,
      description: prevRow.description ?? existing.description,
      title: prevRow.title ?? existing.title,
      duration_minutes: prevRow.duration_minutes ?? existing.duration_minutes,
    });

    if ((pinned || isUpcomingLiveSession(prevRow)) && !isUpcomingLiveSession(existing)) {
      byId.set(prevRow.id, normalizeInstructorLiveSession({
        ...merged,
        session_status: "upcoming",
        is_upcoming: true,
        scheduled_at: prevRow.scheduled_at ?? merged.scheduled_at,
      }));
    } else {
      byId.set(prevRow.id, merged);
    }
  }

  return Array.from(byId.values());
}
