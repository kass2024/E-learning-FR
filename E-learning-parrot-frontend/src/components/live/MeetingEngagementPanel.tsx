import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, BarChart3, LayoutGrid, MessageCircleQuestion, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  askMeetingQuestion,
  answerMeetingQuestion,
  assignBreakoutRoom,
  closeBreakoutRooms,
  closeMeetingPoll,
  createBreakoutRooms,
  createMeetingPoll,
  fetchBreakoutRooms,
  fetchMeetingPolls,
  fetchMeetingQuestions,
  fetchStageMembers,
  openBreakoutRooms,
  reorderStageMembers,
  upvoteMeetingQuestion,
  voteMeetingPoll,
  type BreakoutRoom,
  type PollItem,
  type QaItem,
  type StageMember,
} from "@/lib/meetingEngagementApi";

type Tab = "qa" | "polls" | "breakouts" | "stage";

type ParticipantLite = {
  session_id: string;
  user_name?: string | null;
};

type Props = {
  meetingKey: string;
  trustedHost: boolean;
  isWebinar: boolean;
  sessionId: string | null;
  displayName: string;
  participants: ParticipantLite[];
  onBreakoutJoin?: (url: string, name: string) => void;
  onStageOrderChange?: (members: StageMember[]) => void;
};

export function MeetingEngagementPanel({
  meetingKey,
  trustedHost,
  isWebinar,
  sessionId,
  displayName,
  participants,
  onBreakoutJoin,
  onStageOrderChange,
}: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>(isWebinar ? "qa" : "polls");
  const [questions, setQuestions] = useState<QaItem[]>([]);
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
  const [stage, setStage] = useState<StageMember[]>([]);
  const [qaInput, setQaInput] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("Yes\nNo");
  const [breakoutCount, setBreakoutCount] = useState("2");
  const [answerDrafts, setAnswerDrafts] = useState<Record<number, string>>({});

  const refresh = useCallback(async () => {
    if (!meetingKey) return;
    try {
      const [q, p, b, s] = await Promise.all([
        fetchMeetingQuestions(meetingKey),
        fetchMeetingPolls(meetingKey),
        fetchBreakoutRooms(meetingKey),
        fetchStageMembers(meetingKey),
      ]);
      setQuestions(q.questions || []);
      setPolls(p.polls || []);
      setRooms(b.rooms || []);
      setStage(s.stage || []);
      onStageOrderChange?.(s.stage || []);
    } catch {
      // silent — panel stays usable offline from last state
    }
  }, [meetingKey, onStageOrderChange]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const openPoll = useMemo(() => polls.find((p) => p.status === "open") || null, [polls]);

  const submitQuestion = async () => {
    const text = qaInput.trim();
    if (!text) return;
    try {
      await askMeetingQuestion({
        meeting_key: meetingKey,
        question: text,
        author_name: displayName,
        daily_session_id: sessionId || undefined,
      });
      setQaInput("");
      await refresh();
      toast({ title: "Question submitted" });
    } catch {
      toast({ variant: "destructive", title: "Could not submit question" });
    }
  };

  const createPoll = async () => {
    const options = pollOptions
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    try {
      await createMeetingPoll({
        meeting_key: meetingKey,
        question: pollQuestion.trim() || "Quick poll",
        options,
        open_now: true,
      });
      setPollQuestion("");
      setPollOptions("Yes\nNo");
      await refresh();
      toast({ title: "Poll opened" });
    } catch {
      toast({ variant: "destructive", title: "Could not create poll" });
    }
  };

  const vote = async (pollId: number, index: number) => {
    try {
      await voteMeetingPoll({
        meeting_key: meetingKey,
        poll_id: pollId,
        option_indexes: [index],
        daily_session_id: sessionId || undefined,
      });
      await refresh();
    } catch {
      toast({ variant: "destructive", title: "Vote failed" });
    }
  };

  const createRooms = async () => {
    const count = Math.min(12, Math.max(1, Number(breakoutCount) || 2));
    try {
      await createBreakoutRooms({ meeting_key: meetingKey, count });
      await refresh();
      toast({ title: "Breakout rooms ready" });
    } catch {
      toast({ variant: "destructive", title: "Could not create breakouts" });
    }
  };

  const autoAssign = async () => {
    if (rooms.length === 0 || participants.length === 0) return;
    const ids = participants.map((p) => p.session_id);
    const buckets: string[][] = rooms.map(() => []);
    ids.forEach((id, i) => {
      buckets[i % buckets.length].push(id);
    });
    try {
      await Promise.all(
        rooms.map((room, i) =>
          assignBreakoutRoom({
            meeting_key: meetingKey,
            room_id: room.id,
            session_ids: buckets[i] || [],
          }),
        ),
      );
      await refresh();
      toast({ title: "Participants assigned" });
    } catch {
      toast({ variant: "destructive", title: "Assign failed" });
    }
  };

  const moveStage = async (index: number, dir: -1 | 1) => {
    const next = [...stage];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    try {
      const res = await reorderStageMembers({
        meeting_key: meetingKey,
        members: next.map((m, i) => ({ ...m, sort_order: i })),
      });
      setStage(res.stage);
      onStageOrderChange?.(res.stage);
    } catch {
      toast({ variant: "destructive", title: "Could not reorder stage" });
    }
  };

  const addToStage = async (p: ParticipantLite) => {
    if (stage.some((m) => m.daily_session_id === p.session_id)) return;
    const members = [
      ...stage,
      {
        daily_session_id: p.session_id,
        display_name: p.user_name || "Panelist",
        stage_role: "panelist",
        spotlighted: false,
      },
    ];
    try {
      const res = await reorderStageMembers({ meeting_key: meetingKey, members });
      setStage(res.stage);
      onStageOrderChange?.(res.stage);
    } catch {
      toast({ variant: "destructive", title: "Could not update stage" });
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof MessageCircleQuestion; hostOnly?: boolean }> = [
    { id: "qa", label: "Q&A", icon: MessageCircleQuestion },
    { id: "polls", label: "Polls", icon: BarChart3 },
    { id: "breakouts", label: "Breakouts", icon: LayoutGrid, hostOnly: false },
    { id: "stage", label: "Stage", icon: Sparkles, hostOnly: !isWebinar },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-1 border-b border-white/10 p-2">
        {tabs
          .filter((t) => !t.hostOnly || trustedHost || isWebinar)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ${
                tab === t.id ? "bg-[#0e72ed] text-white" : "bg-black/20 text-zinc-300 hover:bg-white/10"
              }`}
            >
              <t.icon className="h-3 w-3" />
              {t.label}
            </button>
          ))}
      </div>

      {tab === "qa" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {questions.length === 0 ? (
              <p className="text-center text-xs text-zinc-500">No questions yet.</p>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="rounded-lg border border-white/10 bg-black/25 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] text-zinc-400">{q.author_name}</p>
                      <p className="text-sm text-white">{q.question}</p>
                      {q.answer ? <p className="mt-1 text-xs text-emerald-300">A: {q.answer}</p> : null}
                    </div>
                    <button
                      type="button"
                      className="rounded bg-white/5 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/10"
                      onClick={() =>
                        void upvoteMeetingQuestion({ meeting_key: meetingKey, question_id: q.id }).then(refresh)
                      }
                    >
                      ▲ {q.upvotes}
                    </button>
                  </div>
                  {trustedHost && q.status !== "answered" ? (
                    <div className="mt-2 flex gap-1">
                      <Input
                        value={answerDrafts[q.id] || ""}
                        onChange={(e) => setAnswerDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                        placeholder="Answer…"
                        className="h-8 border-white/10 bg-black/30 text-xs text-white"
                      />
                      <Button
                        size="sm"
                        className="h-8 bg-emerald-600 text-[11px] hover:bg-emerald-500"
                        onClick={() =>
                          void answerMeetingQuestion({
                            meeting_key: meetingKey,
                            question_id: q.id,
                            answer: answerDrafts[q.id] || "Noted",
                          }).then(refresh)
                        }
                      >
                        Answer
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 bg-[#2d2d2d] text-[11px]"
                        onClick={() =>
                          void answerMeetingQuestion({
                            meeting_key: meetingKey,
                            question_id: q.id,
                            status: "pinned",
                          }).then(refresh)
                        }
                      >
                        Pin
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 border-t border-white/10 p-2">
            <Input
              value={qaInput}
              onChange={(e) => setQaInput(e.target.value)}
              placeholder="Ask a question…"
              className="h-9 border-white/10 bg-black/30 text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitQuestion();
              }}
            />
            <Button className="h-9 bg-[#0e72ed] hover:bg-[#0b5fc7]" onClick={() => void submitQuestion()}>
              Ask
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "polls" ? (
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {trustedHost ? (
            <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-2">
              <Input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Poll question"
                className="h-8 border-white/10 bg-black/30 text-white"
              />
              <textarea
                value={pollOptions}
                onChange={(e) => setPollOptions(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-white/10 bg-black/30 p-2 text-xs text-white"
                placeholder="One option per line"
              />
              <Button className="h-8 w-full bg-[#0e72ed] text-xs hover:bg-[#0b5fc7]" onClick={() => void createPoll()}>
                Launch poll
              </Button>
            </div>
          ) : null}
          {(openPoll ? [openPoll] : polls.slice(0, 3)).map((poll) => (
            <div key={poll.id} className="rounded-lg border border-white/10 bg-black/25 p-2">
              <p className="mb-2 text-sm font-medium text-white">{poll.question}</p>
              <div className="space-y-1">
                {poll.options.map((opt, i) => {
                  const count = poll.counts?.[i] || 0;
                  const pct = poll.total_votes ? Math.round((count / poll.total_votes) * 100) : 0;
                  return (
                    <button
                      key={`${poll.id}-${i}`}
                      type="button"
                      disabled={poll.status !== "open"}
                      onClick={() => void vote(poll.id, i)}
                      className="relative w-full overflow-hidden rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-left text-xs text-zinc-100 disabled:opacity-70"
                    >
                      <span
                        className="absolute inset-y-0 left-0 bg-[#0e72ed]/25"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="relative flex justify-between">
                        <span>{opt}</span>
                        <span>
                          {count} ({pct}%)
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {trustedHost && poll.status === "open" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2 h-7 bg-[#2d2d2d] text-[11px]"
                  onClick={() => void closeMeetingPoll({ meeting_key: meetingKey, poll_id: poll.id }).then(refresh)}
                >
                  Close poll
                </Button>
              ) : null}
            </div>
          ))}
          {polls.length === 0 ? <p className="text-center text-xs text-zinc-500">No polls yet.</p> : null}
        </div>
      ) : null}

      {tab === "breakouts" ? (
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {trustedHost ? (
            <div className="mb-2 flex flex-wrap gap-2">
              <Input
                value={breakoutCount}
                onChange={(e) => setBreakoutCount(e.target.value)}
                className="h-8 w-16 border-white/10 bg-black/30 text-white"
              />
              <Button size="sm" className="h-8 bg-[#0e72ed] text-[11px]" onClick={() => void createRooms()}>
                Create rooms
              </Button>
              <Button size="sm" variant="secondary" className="h-8 bg-[#2d2d2d] text-[11px]" onClick={() => void autoAssign()}>
                Auto-assign
              </Button>
              <Button
                size="sm"
                className="h-8 bg-emerald-600 text-[11px]"
                onClick={() => void openBreakoutRooms(meetingKey).then((r) => setRooms(r.rooms))}
              >
                Open
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 bg-[#2d2d2d] text-[11px]"
                onClick={() => void closeBreakoutRooms(meetingKey).then((r) => setRooms(r.rooms))}
              >
                Close all
              </Button>
            </div>
          ) : null}
          {rooms.length === 0 ? (
            <p className="text-center text-xs text-zinc-500">No breakout rooms.</p>
          ) : (
            rooms.map((room) => {
              const assignedHere = sessionId ? room.assigned_session_ids?.includes(sessionId) : false;
              return (
                <div key={room.id} className="rounded-lg border border-white/10 bg-black/25 p-2">
                  <p className="text-sm text-white">{room.name}</p>
                  <p className="text-[11px] text-zinc-400">
                    {room.status} · {room.assigned_count} assigned
                  </p>
                  {(trustedHost || assignedHere) && room.daily_room_url && room.status === "open" ? (
                    <Button
                      size="sm"
                      className="mt-2 h-7 bg-[#0e72ed] text-[11px]"
                      onClick={() => onBreakoutJoin?.(room.daily_room_url!, room.name)}
                    >
                      Join breakout
                    </Button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {tab === "stage" ? (
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          <p className="text-[11px] text-zinc-400">
            Webinar stage order controls who appears first on the main stage.
          </p>
          {stage.length === 0 ? (
            <p className="text-center text-xs text-zinc-500">Stage is empty. Add panelists below.</p>
          ) : (
            stage.map((m, i) => (
              <div key={m.daily_session_id} className="flex items-center gap-2 rounded-lg bg-black/25 px-2 py-2">
                <span className="w-5 text-xs text-zinc-500">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{m.display_name || m.daily_session_id}</p>
                  <p className="text-[11px] text-zinc-500">{m.stage_role || "panelist"}</p>
                </div>
                {trustedHost ? (
                  <div className="flex gap-1">
                    <button type="button" className="rounded p-1 hover:bg-white/10" onClick={() => void moveStage(i, -1)}>
                      <ArrowUp className="h-3.5 w-3.5 text-zinc-300" />
                    </button>
                    <button type="button" className="rounded p-1 hover:bg-white/10" onClick={() => void moveStage(i, 1)}>
                      <ArrowDown className="h-3.5 w-3.5 text-zinc-300" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
          {trustedHost ? (
            <div className="mt-3 space-y-1 border-t border-white/10 pt-2">
              <p className="text-[11px] uppercase text-zinc-500">Add to stage</p>
              {participants.map((p) => (
                <button
                  key={p.session_id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md bg-black/20 px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/10"
                  onClick={() => void addToStage(p)}
                >
                  <span className="truncate">{p.user_name || p.session_id}</span>
                  <span className="text-[#6db3ff]">Add</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
