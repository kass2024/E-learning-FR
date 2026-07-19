import { useCallback, useEffect, useRef, useState, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Clock, AlertTriangle, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  getLearnerQuiz,
  submitLearnerQuiz,
  uploadQuizAnswerAudio,
  getQuizMarkingGuideUrl,
  type QuizQuestion,
  type QuizAttemptReviewRow,
} from "@/api/axios";
import { getStudentId } from "@/lib/dashboardUser";
import { sortQuizOptions } from "@/lib/quizOptions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { QuizAudioPlayer } from "@/components/quizzes/QuizAudioPlayer";
import { QuizAudioRecorder } from "@/components/quizzes/QuizAudioRecorder";

type SubmitResult = {
  attemptId?: number;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  feedback: string;
  pending_manual_review?: boolean;
  marking_provider: string;
  question_results: QuizAttemptReviewRow[];
  analytics?: {
    strengths?: string[];
    weaknesses?: string[];
    learning_gaps?: string[];
    recommendations?: string[];
    summary?: string;
  };
};

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const questionTypeLabel = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatPct = (value: number) => `${Number(value).toFixed(1)}%`;

const LearnerQuizTake = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const studentId = getStudentId();

  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [scheduledOpensAt, setScheduledOpensAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [courseId, setCourseId] = useState<number | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [detectTabSwitch, setDetectTabSwitch] = useState(true);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [focusLostSeconds, setFocusLostSeconds] = useState(0);
  const [deliveredQuestionIds, setDeliveredQuestionIds] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const autoSubmittedRef = useRef(false);
  const answersRef = useRef<Record<string, string>>({});
  const questionsRef = useRef<QuizQuestion[]>([]);
  const blurStartedRef = useRef<number | null>(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    if (!detectTabSwitch || result) return;

    const onVisibility = () => {
      if (document.hidden) {
        blurStartedRef.current = Date.now();
        setTabSwitchCount((c) => c + 1);
      } else if (blurStartedRef.current) {
        setFocusLostSeconds((s) => s + Math.round((Date.now() - blurStartedRef.current!) / 1000));
        blurStartedRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [detectTabSwitch, result]);

  const buildSubmitAnswers = useCallback((qs: QuizQuestion[], current: Record<string, string>) => {
    const payload: Record<string, string> = {};
    for (const q of qs) {
      payload[q.id] = (current[q.id] ?? "").trim();
    }
    return payload;
  }, []);

  const submitQuiz = useCallback(
    async (autoSubmitted = false) => {
      if (!studentId || !quizId || submitting || result) return;

      const qs = questionsRef.current;
      const payload = buildSubmitAnswers(qs, answersRef.current);

      setSubmitting(true);
      try {
        const res = await submitLearnerQuiz(Number(quizId), {
          student_id: studentId,
          answers: payload,
          started_at: startedAtRef.current ?? undefined,
          auto_submitted: autoSubmitted,
          tab_switch_count: tabSwitchCount,
          focus_lost_seconds: focusLostSeconds,
          delivered_question_ids: deliveredQuestionIds,
        });
        setResult({
          attemptId: res.attempt?.id,
          ...res.results,
          analytics: res.results.analytics ?? res.analytics,
          pending_manual_review: res.results.pending_manual_review,
        });
        toast({
          title: res.results.passed
            ? "Quiz passed!"
            : res.results.pending_manual_review
              ? "Submitted for review"
              : autoSubmitted
                ? "Time is up"
                : "Quiz submitted",
          description: res.results.pending_manual_review
            ? res.message || res.results.feedback
            : autoSubmitted
              ? "Unanswered questions were marked incorrect."
              : res.results.feedback,
        });
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Submit failed",
          description: err?.response?.data?.message || "Could not submit quiz.",
        });
        if (autoSubmitted) autoSubmittedRef.current = false;
      } finally {
        setSubmitting(false);
      }
    },
    [buildSubmitAnswers, deliveredQuestionIds, focusLostSeconds, quizId, result, studentId, submitting, tabSwitchCount, toast]
  );

  useEffect(() => {
    if (!scheduledOpensAt) return;

    const opensMs = new Date(scheduledOpensAt).getTime();
    if (Number.isNaN(opensMs)) return;

    const msUntilOpen = opensMs - Date.now();
    if (msUntilOpen <= 0) {
      setReloadKey((key) => key + 1);
      return;
    }

    const timer = window.setTimeout(() => setReloadKey((key) => key + 1), msUntilOpen + 1000);
    return () => window.clearTimeout(timer);
  }, [scheduledOpensAt]);

  useEffect(() => {
    if (!studentId || !quizId) {
      setLoading(false);
      return;
    }

    setScheduledOpensAt(null);
    setLoading(true);

    void getLearnerQuiz(Number(quizId), studentId)
      .then((data) => {
        setQuizTitle(data.quiz.title ?? "Quiz");
        setCourseId(data.quiz.course_id ?? null);
        setTopic(data.quiz.topic ?? null);
        setPassingScore(data.quiz.passing_score ?? 70);
        setTimeLimitMinutes(data.quiz.time_limit_minutes ?? null);
        setDetectTabSwitch(data.quiz.detect_tab_switch ?? true);
        setDeliveredQuestionIds(data.delivered_question_ids ?? []);
        setQuestions(data.questions ?? []);

        const latest = data.latest_attempt ?? data.attempts?.[0];
        if (latest && (data.quiz.view_mode === "results" || latest.marked_at || latest.pending_review)) {
          const rows = data.question_results?.length
            ? data.question_results
            : latest.question_results ?? [];
          setResult({
            attemptId: latest.id,
            score: latest.score,
            max_score: latest.max_score,
            percentage: latest.percentage,
            passed: latest.passed,
            feedback: latest.feedback ?? "",
            marking_provider: latest.marking_provider ?? "auto",
            question_results: rows,
            pending_manual_review: latest.pending_review ?? !latest.marked_at,
          });
          return;
        }

        startedAtRef.current = new Date().toISOString();
        if (data.quiz.time_limit_minutes) {
          setSecondsLeft(data.quiz.time_limit_minutes * 60);
        }
      })
      .catch((err: any) => {
        const opensAt = err?.response?.data?.opens_at as string | undefined;
        if (err?.response?.data?.scheduled && opensAt) {
          setScheduledOpensAt(opensAt);
          setQuizTitle("Scheduled assessment");
          return;
        }
        toast({
          variant: "destructive",
          title: "Could not load quiz",
          description: err?.response?.data?.message || "Try again later.",
        });
      })
      .finally(() => setLoading(false));
  }, [quizId, studentId, toast, reloadKey]);

  useEffect(() => {
    if (secondsLeft === null || result || loading) return;
    if (secondsLeft <= 0) {
      if (!autoSubmittedRef.current && !submitting) {
        autoSubmittedRef.current = true;
        void submitQuiz(true);
      }
      return;
    }
    const timer = window.setInterval(() => setSecondsLeft((prev) => (prev === null ? prev : prev - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [loading, result, secondsLeft, submitQuiz, submitting]);

  const setAnswer = (qid: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const toggleMultiResponse = (qid: string, option: string) => {
    setAnswers((prev) => {
      const current = (prev[qid] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
      return { ...prev, [qid]: next.join(", ") };
    });
  };

  const downloadMarkingGuide = () => {
    if (!studentId || !quizId || !result?.attemptId) return;
    const url = getQuizMarkingGuideUrl(Number(quizId), result.attemptId, { studentId });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const renderQuestionInput = (q: QuizQuestion) => {
    const disabled = submitting || timeUp;
    const type = q.type;

    if (type === "multiple_choice" || type === "true_false") {
      const options = type === "true_false" ? ["True", "False"] : sortQuizOptions(q.options ?? []);
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt}
              className={`flex items-center gap-3 cursor-pointer rounded-md border p-3 hover:bg-muted/50 ${
                answers[q.id] === opt ? "border-primary bg-primary/5" : ""
              }`}
            >
              <input
                type="radio"
                name={q.id}
                value={opt}
                checked={answers[q.id] === opt}
                disabled={disabled}
                onChange={() => setAnswer(q.id, opt)}
                className="h-4 w-4"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    if (type === "multiple_response") {
      const selected = (answers[q.id] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Select all that apply</p>
          {sortQuizOptions(q.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                disabled={disabled}
                onChange={() => toggleMultiResponse(q.id, opt)}
                className="h-4 w-4"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    if (type === "fill_blank") {
      return (
        <Input
          value={answers[q.id] ?? ""}
          disabled={disabled}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          placeholder="Type your answer"
        />
      );
    }

    if (type === "oral_listen") {
      const responseFormat = q.response_format ?? "text";
      const hasPromptAudio = !!q.prompt_audio_url?.trim();
      return (
        <div className="space-y-4">
          {hasPromptAudio && courseId ? (
            <QuizAudioPlayer
              src={q.prompt_audio_url!}
              courseId={courseId}
              filename={q.prompt_audio_filename ?? undefined}
              label="Listen to the audio"
            />
          ) : (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Audio prompt not available</p>
              <p className="text-xs mt-1 text-amber-800">
                Your instructor must upload the listening audio. Please contact them or try again later.
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {responseFormat === "audio"
              ? "Reply by recording your voice (microphone below)."
              : "Reply by typing your written answer below."}
          </p>
          {responseFormat === "text" ? (
            <Textarea
              value={answers[q.id] ?? ""}
              disabled={disabled}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder="Type your written answer (summary, translation, etc.)"
              rows={5}
            />
          ) : (
            <QuizAudioRecorder
              disabled={disabled || !courseId}
              value={answers[q.id]}
              courseId={courseId ?? 0}
              onRecorded={(val) => setAnswer(q.id, val)}
              onClear={() => setAnswer(q.id, "")}
              uploadAudio={(blob) =>
                uploadQuizAnswerAudio(Number(quizId), {
                  student_id: studentId!,
                  question_id: q.id,
                  audio: blob,
                })
              }
            />
          )}
        </div>
      );
    }

    if (type === "matching") {
      const pairs = q.pairs ?? [];
      const options = q.match_options ?? pairs.map((p) => p.right).filter(Boolean);
      return (
        <div className="space-y-3">
          {pairs.map((pair) => (
            <div key={pair.left} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm font-medium sm:w-1/2">{pair.left}</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-1/2"
                value={(() => {
                  try {
                    return JSON.parse(answers[q.id] || "{}")[pair.left] ?? "";
                  } catch {
                    return "";
                  }
                })()}
                disabled={disabled}
                onChange={(e) => {
                  let map: Record<string, string> = {};
                  try {
                    map = JSON.parse(answers[q.id] || "{}");
                  } catch {
                    map = {};
                  }
                  map[pair.left] = e.target.value;
                  setAnswer(q.id, JSON.stringify(map));
                }}
              >
                <option value="">Select match…</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }

    const isLong = ["long_answer", "essay", "case_study", "problem_solving", "scenario", "hots"].includes(type);
    return (
      <Textarea
        value={answers[q.id] ?? ""}
        disabled={disabled}
        onChange={(e) => setAnswer(q.id, e.target.value)}
        placeholder={isLong ? "Write your detailed answer…" : "Write your answer…"}
        rows={isLong ? 6 : 3}
      />
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentId || !quizId) return;
    await submitQuiz(false);
  };

  const timeUp = secondsLeft !== null && secondsLeft <= 0;

  if (!studentId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not logged in</CardTitle>
          <CardDescription>Please log in as a learner to take this quiz.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (scheduledOpensAt) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Assessment not open yet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            This assessment opens on{" "}
            <span className="font-medium text-foreground">
              {new Date(scheduledOpensAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
            </span>
            .
          </p>
          <p>You will receive an email reminder 1 hour 30 minutes before it starts.</p>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    const pendingReview = result.pending_manual_review;
    const pct = formatPct(result.percentage);

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card className={result.passed ? "border-green-500/50" : "border-amber-500/50"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {pendingReview ? (
                <>
                  <Clock className="h-6 w-6 text-amber-600" />
                  Submitted — awaiting instructor review
                </>
              ) : result.passed ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  Quiz passed
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-amber-600" />
                  Quiz not passed
                </>
              )}
            </CardTitle>
            <CardDescription>
              {pendingReview
                ? "Your oral answers were saved. Your instructor will mark them and publish your final score."
                : `Pass mark: ${passingScore}% · Score ${result.score}/${result.max_score} points`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              className={`rounded-xl border-2 p-5 flex flex-wrap items-center justify-between gap-4 ${
                pendingReview
                  ? "border-amber-300 bg-amber-50"
                  : result.passed
                    ? "border-green-400 bg-green-50"
                    : "border-amber-400 bg-amber-50"
              }`}
            >
              <div>
                <p className="text-4xl font-bold tracking-tight">{pct}</p>
                <p className="text-sm text-muted-foreground mt-1">Final score out of 100%</p>
              </div>
              {!pendingReview && (
                <Badge
                  className={`text-sm px-4 py-1.5 ${
                    result.passed ? "bg-green-700 hover:bg-green-700" : "bg-amber-700 hover:bg-amber-700"
                  }`}
                >
                  {result.passed ? "PASSED" : "NOT PASSED"}
                </Badge>
              )}
            </div>

            <p>{result.feedback}</p>

            {result.question_results.length > 0 && (
              <div className="space-y-3">
                <p className="font-medium text-sm">Question breakdown</p>
                {result.question_results.map((row, idx) => (
                  <div
                    key={row.question_id}
                    className={`rounded-lg border p-3 text-sm ${
                      row.pending_review
                        ? "border-amber-200 bg-amber-50/50"
                        : row.correct
                          ? "border-green-200 bg-green-50/40"
                          : row.correct === false
                            ? "border-red-200 bg-red-50/30"
                            : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <p className="font-medium">
                        {idx + 1}. {row.question || row.instruction || "Question"}
                      </p>
                      <Badge variant="outline">
                        {row.score ?? 0}/{row.max_score ?? 1} pt
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Your answer: {row.student_answer?.trim() || "—"}
                    </p>
                    {row.correct_answer && (
                      <p className="text-muted-foreground">
                        Correct answer: {row.correct_answer}
                      </p>
                    )}
                    {row.explanation && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{row.explanation}</p>
                    )}
                    <p className="text-xs mt-2 font-medium">
                      {row.pending_review
                        ? "Awaiting review"
                        : row.correct
                          ? "Correct"
                          : row.correct === false
                            ? "Incorrect"
                            : row.feedback || ""}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {result.analytics?.strengths?.length ? (
              <div className="text-sm">
                <p className="font-medium">Strengths</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {result.analytics.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.analytics?.recommendations?.length ? (
              <div className="text-sm">
                <p className="font-medium">Recommendations</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {result.analytics.recommendations.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">Marked by {result.marking_provider}</p>
            <div className="flex flex-wrap gap-2">
              {result.attemptId && (
                <Button variant="outline" onClick={downloadMarkingGuide}>
                  <Download className="mr-2 h-4 w-4" />
                  Download marking guide
                </Button>
              )}
              <Button onClick={() => navigate("/dashboard/learner/materials")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to materials
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timeCritical = secondsLeft !== null && secondsLeft <= 60;

  return (
    <div className="space-y-6 max-w-3xl">
      <AdminPageHeader
        eyebrow="Quiz"
        title={quizTitle}
        description={topic ? `Topic: ${topic} · Pass mark ${passingScore}%` : `Pass mark ${passingScore}%`}
      >
        <div className="flex items-center gap-2">
          {secondsLeft !== null && (
            <Badge variant={timeCritical ? "destructive" : "secondary"} className="text-sm px-3 py-1">
              <Clock className="mr-1 h-4 w-4 inline" />
              {formatTime(Math.max(0, secondsLeft))}
            </Badge>
          )}
          <Button variant="outline" onClick={() => navigate("/dashboard/learner/materials")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </AdminPageHeader>

      {detectTabSwitch && tabSwitchCount > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Tab switches recorded: {tabSwitchCount} (monitored for integrity)
        </div>
      )}

      {timeLimitMinutes && (
        <div
          className={`rounded-lg border px-4 py-3 mb-4 flex items-center justify-between ${
            timeCritical || timeUp ? "border-destructive/50 bg-destructive/10" : "border-primary/30 bg-primary/5"
          }`}
        >
          <span className="text-sm font-medium">
            {timeUp ? "Time is up — submitting…" : "Timer active — unanswered questions score zero when time ends"}
          </span>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {questions.map((q, idx) => {
          const unanswered = !(answers[q.id] ?? "").trim();
          const cardTitle =
            q.type === "oral_listen"
              ? q.instruction?.trim() || q.question || "Oral listening task"
              : q.question;
          return (
            <Card key={q.id} className={timeUp && unanswered ? "border-amber-300/80" : undefined}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex flex-wrap items-start gap-2">
                  <span className="text-muted-foreground">{idx + 1}.</span>
                  <span className="flex-1">{cardTitle}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {questionTypeLabel(q.type)}
                  </Badge>
                  <Badge variant="outline" className="shrink-0">
                    {q.points ?? 1} pt{(q.points ?? 1) > 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderQuestionInput(q)}
                {unanswered && timeUp && <p className="text-xs text-amber-700 mt-2">Not answered — scored as incorrect</p>}
              </CardContent>
            </Card>
          );
        })}

        <Button type="submit" size="lg" disabled={submitting || questions.length === 0 || timeUp} className="w-full sm:w-auto">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit quiz
        </Button>
      </form>
    </div>
  );
};

export default LearnerQuizTake;
