export type MeetingRole = "host" | "moderator" | "presenter" | "panelist" | "attendee";
export type MeetingMode = "meeting" | "webinar";
export type SpeakingState = "listening" | "hand_raised" | "approved" | "speaking" | "revoked";

export type DailySendPermission =
  | "audio"
  | "video"
  | "screenVideo"
  | "screenAudio"
  | "customVideo"
  | "customAudio";

export type DailySdkPermissions = {
  hasPresence?: boolean;
  /** Daily runtime uses Set; tokens / our API often use boolean or string[]. */
  canSend?: boolean | DailySendPermission[] | Set<DailySendPermission> | Iterable<string>;
  canAdmin?: boolean | string[] | Set<string> | Iterable<string>;
};

function permissionAllows(
  value: boolean | string[] | Set<string> | Iterable<string> | Record<string, boolean> | null | undefined,
  kind: string,
): boolean {
  if (value === true) return true;
  if (value === false || value == null) return false;
  if (value instanceof Set) return value.has(kind);
  if (Array.isArray(value)) return value.includes(kind);
  // Daily sometimes exposes iterable Sets that lose instanceof across realms,
  // or plain objects keyed by media type.
  if (typeof value === "object") {
    if (typeof (value as Iterable<string>)[Symbol.iterator] === "function") {
      for (const entry of value as Iterable<string>) {
        if (entry === kind) return true;
      }
      return false;
    }
    return Boolean((value as Record<string, boolean>)[kind]);
  }
  return false;
}

export function canSendMedia(
  permissions: DailySdkPermissions | null | undefined,
  kind: DailySendPermission,
): boolean {
  if (!permissions) return false;
  return permissionAllows(permissions.canSend as Parameters<typeof permissionAllows>[0], kind);
}

export function canAdminParticipants(permissions: DailySdkPermissions | null | undefined): boolean {
  if (!permissions) return false;
  return permissionAllows(permissions.canAdmin as Parameters<typeof permissionAllows>[0], "participants");
}

export function resolveMeetingRole(sdk: {
  meeting_role?: string | null;
  role?: number | string | null;
  permissions?: DailySdkPermissions | null;
}): MeetingRole {
  const explicit = String(sdk.meeting_role || "").toLowerCase();
  if (
    explicit === "host" ||
    explicit === "moderator" ||
    explicit === "presenter" ||
    explicit === "panelist" ||
    explicit === "attendee"
  ) {
    return explicit;
  }
  if (Number(sdk.role) === 1 || canAdminParticipants(sdk.permissions)) return "host";
  return "attendee";
}

export function resolveMeetingMode(sdk: { meeting_mode?: string | null }): MeetingMode {
  return String(sdk.meeting_mode || "").toLowerCase() === "webinar" ? "webinar" : "meeting";
}

/** Normalize canSend for Daily updateParticipant (Set preferred). */
export function toDailyCanSendUpdate(
  canSend: boolean | string[] | Set<string> | Iterable<string> | null | undefined,
): boolean | Set<string> {
  if (canSend === true || canSend === false) return canSend;
  if (canSend == null) return false;
  if (canSend instanceof Set) return canSend;
  if (Array.isArray(canSend)) return new Set(canSend);
  if (typeof canSend === "object" && typeof (canSend as Iterable<string>)[Symbol.iterator] === "function") {
    return new Set(canSend as Iterable<string>);
  }
  return false;
}
