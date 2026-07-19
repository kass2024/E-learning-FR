import api from "@/api/axios";

export type HandRaiseRow = {
  id: number;
  meeting_key: string;
  meeting_mode?: string;
  user_id?: number | null;
  daily_session_id: string;
  participant_name: string;
  status: string;
  requested_at?: string;
  waiting_seconds?: number;
};

export async function raiseMeetingHand(payload: {
  meeting_key: string;
  daily_session_id: string;
  participant_name?: string;
  meeting_mode?: "meeting" | "webinar";
}) {
  const { data } = await api.post("/meetings/moderation/raise-hand", payload);
  return data as { request: HandRaiseRow; message?: string };
}

export async function cancelMeetingHand(payload: {
  meeting_key: string;
  daily_session_id: string;
}) {
  const { data } = await api.post("/meetings/moderation/cancel-hand", payload);
  return data as { ok: boolean };
}

export async function fetchPendingHands(meetingKey: string) {
  const { data } = await api.get("/meetings/moderation/hands", {
    params: { meeting_key: meetingKey },
  });
  return data as { hands: HandRaiseRow[] };
}

export async function approveMeetingSpeaking(payload: {
  meeting_key: string;
  daily_session_id: string;
  hand_raise_id?: number;
  target_user_id?: number;
  audio?: boolean;
  video?: boolean;
  screen_share?: boolean;
  invite_to_stage?: boolean;
  duration_seconds?: number;
}) {
  const { data } = await api.post("/meetings/moderation/approve-speaking", payload);
  return data as {
    grant: unknown;
    daily_permissions?: { canSend?: boolean | string[] };
    message?: string;
  };
}

export async function revokeMeetingSpeaking(payload: {
  meeting_key: string;
  daily_session_id: string;
  action?: "mute" | "revoke" | "stop";
}) {
  const { data } = await api.post("/meetings/moderation/revoke-speaking", payload);
  return data as {
    daily_permissions?: { canSend?: boolean | string[] };
    set_audio?: boolean;
    set_video?: boolean | null;
    message?: string;
  };
}

export async function denyMeetingHand(payload: {
  meeting_key: string;
  hand_raise_id: number;
}) {
  const { data } = await api.post("/meetings/moderation/deny-hand", payload);
  return data as { ok: boolean };
}

export async function leaveMeetingModeration(payload: {
  meeting_key: string;
  daily_session_id: string;
}) {
  const { data } = await api.post("/meetings/moderation/leave", payload);
  return data as { ok: boolean };
}
