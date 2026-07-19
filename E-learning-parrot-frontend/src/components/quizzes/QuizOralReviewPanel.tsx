import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mic, CheckCircle2, Download } from "lucide-react";
import { QuizAudioPlayer } from "@/components/quizzes/QuizAudioPlayer";
import {
  getQuizAttempts,
  gradeQuizAttempt,
  getQuizMarkingGuideUrl,
  type QuizAttemptReviewRow,
  type QuizAttemptSummary,
} from "@/api/axios";
import { useToast } from "@/hooks/use-toast";

type Props = {
  quizId: number;
  courseId: number;
  instructorEmail: string;
  onClose: () => void;
};

type GradeDraft = { score: string; feedback: string };

const staffMarkingAuth = (email: string) => {
  const role = (typeof window !== "undefined" ? localStorage.getItem("parrot_user_role") : "")?.toLowerCase() ?? "";
  if (["admin", "superadmin", "staff"].includes(role)) {
    return { adminEmail: email };
  }
  return { instructorEmail: email };
};

export const QuizOralReviewPanel = ({ quizId, courseId, instructorEmail, onClose }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [drafts, setDrafts] = useState<Record<string, GradeDraft>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await getQuizAttempts(quizId, instructorEmail);
      setQuizTitle(res.quiz_title ?? "Assessment");
      setAttempts(res.attempts ?? []);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not load submissions",
        description: err?.response?.data?.message || "Try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [quizId, instructorEmail]);

  const pendingAttempts = attempts.filter((a) => a.pending_oral_count > 0);

  const downloadGuide = (attemptId: number) => {
    const url = getQuizMarkingGuideUrl(quizId, attemptId, staffMarkingAuth(instructorEmail));
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const setDraft = (key: string, patch: Partial<GradeDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: { score: prev[key]?.score ?? "0", feedback: prev[key]?.feedback ?? "", ...patch },
    }));
  };

  const saveAttemptGrades = async (attempt: QuizAttemptSummary) => {
    const oralPending = attempt.question_results.filter(
      (r) => r.type === "oral_listen" && r.pending_review
    );
    const grades = oralPending.map((row) => {
      const key = `${attempt.id}-${row.question_id}`;
      const draft = drafts[key] ?? { score: "0", feedback: "" };
      return {
        question_id: row.question_id,
        score: Number(draft.score) || 0,
        feedback: draft.feedback.trim() || undefined,
      };
    });

    setSavingId(attempt.id);
    try {
      await gradeQuizAttempt(quizId, attempt.id, {
        instructor_email: instructorEmail,
        grades,
      });
      toast({ title: "Grades saved", description: `${attempt.student_name} marked.` });
      await load();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not save grades",
        description: err?.response?.data?.message || "Try again.",
      });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 rounded-lg border p-8 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading submissionsâ€¦
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border p-4 space-y-4 bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            Mark oral submissions â€” {quizTitle}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Listen to learner replies and assign points manually. No AI auto-correction for oral tasks.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {pendingAttempts.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-md border border-dashed p-4">
          No oral submissions awaiting review.
        </p>
      ) : (
        <div className="space-y-4">
          {pendingAttempts.map((attempt) => (
            <div key={attempt.id} className="rounded-xl border bg-background p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{attempt.student_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {attempt.created_at ? new Date(attempt.created_at).toLocaleString() : "â€”"}
                    {" Â· "}
                    {Number(attempt.percentage).toFixed(1)}% â€” {attempt.passed ? "PASSED" : "NOT PASSED"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadGuide(attempt.id)}>
                    <Download className="mr-1 h-3 w-3" />
                    Marking guide
                  </Button>
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    {attempt.pending_oral_count} oral task(s) to mark
                  </Badge>
                </div>
              </div>

              {attempt.question_results
                .filter((r) => r.type === "oral_listen" && r.pending_review)
                .map((row: QuizAttemptReviewRow, idx) => {
                  const key = `${attempt.id}-${row.question_id}`;
                  const draft = drafts[key] ?? { score: "0", feedback: "" };
                  const isAudio =
                    row.response_format === "audio" ||
                    String(row.student_answer ?? "").startsWith("audio:");

                  return (
                    <div key={row.question_id} className="rounded-lg border border-primary/20 p-4 space-y-3 bg-primary/5">
                      <p className="text-sm font-medium">
                        Oral task {idx + 1}
                        {row.instruction ? `: ${row.instruction}` : ""}
                      </p>

                      {row.prompt_audio_url && (
                        <QuizAudioPlayer
                          src={row.prompt_audio_url}
                          courseId={courseId}
                          filename={row.prompt_audio_filename ?? undefined}
                          label="Prompt audio (learner heard this)"
                        />
                      )}

                      {isAudio && row.student_answer ? (
                        <QuizAudioPlayer
                          src={row.student_answer}
                          courseId={courseId}
                          label="Learner's oral reply"
                        />
                      ) : (
                        <div className="rounded-md border bg-white p-3 text-sm">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Written reply</p>
                          <p className="whitespace-pre-wrap">{row.student_answer || "â€”"}</p>
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                        <div className="space-y-1">
                          <Label className="text-xs">Score / {row.max_score ?? 1}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={row.max_score ?? 99}
                            value={draft.score}
                            onChange={(e) => setDraft(key, { score: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Feedback for learner</Label>
                          <Textarea
                            rows={2}
                            value={draft.feedback}
                            onChange={(e) => setDraft(key, { feedback: e.target.value })}
                            placeholder="Optional commentâ€¦"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90"
                disabled={savingId === attempt.id}
                onClick={() => void saveAttemptGrades(attempt)}
              >
                {savingId === attempt.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Save marks for {attempt.student_name}
              </Button>
            </div>
          ))}
        </div>
      )}

      {attempts.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-sm font-medium">All submissions â€” marking guides</p>
          <div className="space-y-2">
            {attempts.map((attempt) => (
              <div
                key={`all-${attempt.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{attempt.student_name}</span>
                  <span className="text-muted-foreground ml-2">
                    {Number(attempt.percentage).toFixed(1)}% Â· {attempt.score}/{attempt.max_score} Â·{" "}
                    {attempt.passed ? "PASSED" : "NOT PASSED"}
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => downloadGuide(attempt.id)}>
                  <Download className="mr-1 h-3 w-3" />
                  Download marking guide
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizOralReviewPanel;
