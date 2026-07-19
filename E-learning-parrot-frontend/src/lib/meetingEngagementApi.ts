import api from "@/api/axios";

export type QaItem = {
  id: number;
  meeting_key: string;
  author_name: string;
  question: string;
  answer?: string | null;
  status: string;
  is_anonymous?: boolean;
  upvotes: number;
  answered_at?: string | null;
  created_at?: string;
};

export type PollItem = {
  id: number;
  meeting_key: string;
  question: string;
  options: string[];
  status: string;
  allow_multiple?: boolean;
  show_results?: boolean;
  counts: number[];
  total_votes: number;
};

export type BreakoutRoom = {
  id: number;
  meeting_key: string;
  name: string;
  daily_room_name?: string | null;
  daily_room_url?: string | null;
  status: string;
  sort_order: number;
  assigned_session_ids: string[];
  assigned_count: number;
};

export type StageMember = {
  id?: number;
  meeting_key?: string;
  daily_session_id: string;
  user_id?: number | null;
  display_name?: string | null;
  stage_role?: string;
  sort_order?: number;
  spotlighted?: boolean;
};

export type SpeakingGrantTimer = {
  daily_session_id: string;
  speaking_state: string;
  expires_at?: string | null;
  remaining_seconds?: number | null;
  audio_granted?: boolean;
  video_granted?: boolean;
  on_stage?: boolean;
};

export async function fetchMeetingQuestions(meetingKey: string) {
  const { data } = await api.get("/meetings/engagement/questions", {
    params: { meeting_key: meetingKey },
  });
  return data as { questions: QaItem[] };
}

export async function askMeetingQuestion(payload: {
  meeting_key: string;
  question: string;
  author_name?: string;
  daily_session_id?: string;
  is_anonymous?: boolean;
}) {
  const { data } = await api.post("/meetings/engagement/questions", payload);
  return data as { question: QaItem };
}

export async function upvoteMeetingQuestion(payload: { meeting_key: string; question_id: number }) {
  const { data } = await api.post("/meetings/engagement/questions/upvote", payload);
  return data as { question: QaItem };
}

export async function answerMeetingQuestion(payload: {
  meeting_key: string;
  question_id: number;
  answer?: string;
  status?: "open" | "answered" | "dismissed" | "pinned";
}) {
  const { data } = await api.post("/meetings/engagement/questions/answer", payload);
  return data as { question: QaItem };
}

export async function fetchMeetingPolls(meetingKey: string) {
  const { data } = await api.get("/meetings/engagement/polls", {
    params: { meeting_key: meetingKey },
  });
  return data as { polls: PollItem[] };
}

export async function createMeetingPoll(payload: {
  meeting_key: string;
  question: string;
  options: string[];
  allow_multiple?: boolean;
  open_now?: boolean;
}) {
  const { data } = await api.post("/meetings/engagement/polls", payload);
  return data as { poll: PollItem };
}

export async function voteMeetingPoll(payload: {
  meeting_key: string;
  poll_id: number;
  option_indexes: number[];
  daily_session_id?: string;
}) {
  const { data } = await api.post("/meetings/engagement/polls/vote", payload);
  return data as { poll: PollItem };
}

export async function closeMeetingPoll(payload: { meeting_key: string; poll_id: number }) {
  const { data } = await api.post("/meetings/engagement/polls/close", payload);
  return data as { poll: PollItem };
}

export async function fetchBreakoutRooms(meetingKey: string) {
  const { data } = await api.get("/meetings/engagement/breakouts", {
    params: { meeting_key: meetingKey },
  });
  return data as { rooms: BreakoutRoom[] };
}

export async function createBreakoutRooms(payload: {
  meeting_key: string;
  names?: string[];
  count?: number;
}) {
  const { data } = await api.post("/meetings/engagement/breakouts", payload);
  return data as { rooms: BreakoutRoom[] };
}

export async function assignBreakoutRoom(payload: {
  meeting_key: string;
  room_id: number;
  session_ids: string[];
}) {
  const { data } = await api.post("/meetings/engagement/breakouts/assign", payload);
  return data as { room: BreakoutRoom };
}

export async function openBreakoutRooms(meetingKey: string) {
  const { data } = await api.post("/meetings/engagement/breakouts/open", {
    meeting_key: meetingKey,
  });
  return data as { rooms: BreakoutRoom[] };
}

export async function closeBreakoutRooms(meetingKey: string) {
  const { data } = await api.post("/meetings/engagement/breakouts/close", {
    meeting_key: meetingKey,
  });
  return data as { rooms: BreakoutRoom[] };
}

export async function fetchStageMembers(meetingKey: string) {
  const { data } = await api.get("/meetings/engagement/stage", {
    params: { meeting_key: meetingKey },
  });
  return data as { stage: StageMember[] };
}

export async function reorderStageMembers(payload: {
  meeting_key: string;
  members: StageMember[];
}) {
  const { data } = await api.post("/meetings/engagement/stage/reorder", payload);
  return data as { stage: StageMember[] };
}

export async function fetchSpeakingTimer(meetingKey: string, sessionId: string) {
  const { data } = await api.get("/meetings/engagement/speaking-timer", {
    params: { meeting_key: meetingKey, daily_session_id: sessionId },
  });
  return data as { grant: SpeakingGrantTimer | null; expired: Array<{ daily_session_id: string }> };
}

export async function expireSpeakingTimers(meetingKey: string) {
  const { data } = await api.post("/meetings/engagement/expire-timers", {
    meeting_key: meetingKey,
  });
  return data as { expired: Array<{ daily_session_id: string }> };
}
