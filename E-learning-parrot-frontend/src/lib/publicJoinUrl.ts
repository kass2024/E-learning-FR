/**
 * True when the URL points at Daily/Zoom provider hosts (not our app).
 * Those must never be used as the public share/join link.
 */
export function isProviderMeetingUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/daily\.co/i.test(trimmed) || /zoom\.us/i.test(trimmed)) return true;
  try {
    const host = new URL(trimmed, typeof window !== "undefined" ? window.location.origin : "http://localhost").hostname.toLowerCase();
    return host.endsWith("daily.co") || host.endsWith("zoom.us");
  } catch {
    return false;
  }
}

/**
 * Ensure public join links always include the full app domain for sharing.
 * Rejects Daily/Zoom provider URLs so shared links always start with our app origin.
 */
export function resolvePublicJoinUrl(url?: string | null): string {
  if (!url) return "";

  const trimmed = url.trim();
  if (!trimmed || isProviderMeetingUrl(trimmed)) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    if (typeof window !== "undefined") {
      try {
        const parsed = new URL(trimmed);
        if (parsed.origin !== window.location.origin && isProviderMeetingUrl(trimmed)) {
          return "";
        }
      } catch {
        return "";
      }
    }
    return trimmed;
  }

  if (typeof window !== "undefined") {
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${window.location.origin}${path}`;
  }

  return trimmed;
}
