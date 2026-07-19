import type { ZoomParticipant } from "@/components/live/zoomMeetingClient";

export type WaitingRoomEventPayload = {
  userId?: number;
  displayName?: string;
  userName?: string;
  bHold?: boolean;
  isHold?: boolean;
  source?: string;
};

export function normalizeUserEventPayloads(payload: unknown): WaitingRoomEventPayload[] {
  if (Array.isArray(payload)) {
    return payload.filter((row) => row && typeof row === "object") as WaitingRoomEventPayload[];
  }
  if (payload && typeof payload === "object") {
    return [payload as WaitingRoomEventPayload];
  }
  return [];
}

export function isWaitingRoomEventPayload(payload: WaitingRoomEventPayload): boolean {
  return Boolean(payload?.bHold ?? payload?.isHold) || payload?.source === "on hold";
}

export function waitingParticipantFromEvent(payload: WaitingRoomEventPayload): ZoomParticipant | null {
  const userId = Number(payload?.userId ?? 0);
  if (!userId || !isWaitingRoomEventPayload(payload)) return null;

  const name = String(payload.displayName || payload.userName || "Learner").trim() || "Learner";

  return {
    userId,
    userName: name,
    displayName: name,
    isHold: true,
    bHold: true,
    muted: true,
    audio: "",
    avatar: "",
    isPhoneUser: false,
    bRaiseHand: false,
    video: false,
    bVideoOn: false,
    sharerOn: false,
    sharePause: false,
    feedback: 0,
    isHost: false,
    bCoHost: false,
    isGuest: true,
  } as ZoomParticipant;
}

export function mergeWaitingParticipants(
  fromSdk: ZoomParticipant[],
  tracked: ZoomParticipant[],
): ZoomParticipant[] {
  const map = new Map<number, ZoomParticipant>();
  for (const p of fromSdk) map.set(p.userId, p);
  for (const p of tracked) {
    if (!map.has(p.userId)) map.set(p.userId, p);
  }
  return Array.from(map.values());
}
