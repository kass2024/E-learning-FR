import { useCallback, useEffect, useMemo, useRef, useState, FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ClipboardList, Plus, Sparkles, Bot, PenLine, Trash2, Clock, Send, Pencil, Users, BarChart3, Mic, ChevronRight, ChevronLeft, UserCheck, CalendarClock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  createAiInstructorQuiz,
  analyzeQuizMaterial,
  generateQuizQuestions,
  getInstructorAssignedCourses,
  getInstructorQuiz,
  getInstructorQuizzes,
  getInstructorStudents,
  getQuizAiStatus,
  getQuizAnalytics,
  getQuizCourseTopics,
  publishInstructorQuiz,
  updateInstructorQuiz,
  uploadQuizPromptAudio,
  type InstructorQuiz,
  type InstructorStudentRow,
  type QuizCourseTopicsResponse,
  type QuizAnalyticsPayload,
  type QuizMaterialSummary,
  type QuizQuestion,
} from "@/api/axios";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { dashboardCacheKey, resolveInstructorEmail } from "@/lib/dashboardUser";
import { sortQuizOptions } from "@/lib/quizOptions";
import { invalidateDashboardCache } from "@/lib/dashboardCache";
import { unlockDashboardPageScroll } from "@/lib/dashboardPageScroll";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { QuizStepIndicator } from "@/components/quizzes/QuizStepIndicator";
import { QuizAudioPlayer } from "@/components/quizzes/QuizAudioPlayer";
import { OralQuestionEditor } from "@/components/quizzes/OralQuestionEditor";
import { StandardQuestionEditor } from "@/components/quizzes/StandardQuestionEditor";
import { QuizOralReviewPanel } from "@/components/quizzes/QuizOralReviewPanel";
import { QuizScheduledOpenPicker } from "@/components/quizzes/QuizScheduledOpenPicker";
import { resolveDefaultTimezone } from "@/lib/commonTimezones";
import {
  formatScheduledLabel,
  isoToLocalDatetime,
  isFutureScheduled,
  localDatetimeToIso,
} from "@/lib/scheduledDateTime";

type AssessmentKind = "quiz" | "test" | "exam";
type BuilderStep = 1 | 2 | 3 | 4;

const BUILDER_STEPS = [
  { id: 1, label: "Setup" },
  { id: 2, label: "Questions" },
  { id: 3, label: "Settings" },
  { id: 4, label: "Publish" },
] as const;

const ASSESSMENT_KIND_META: Record<
  AssessmentKind,
  { label: string; hint: string; suggestedQuestions: number; pass: number; time: number; mode: "quick" | "standard" | "comprehensive" | "final_exam" | "custom" }
> = {
  quiz: {
    label: "Quiz",
    hint: "Short check — adjust question count anytime in Settings.",
    suggestedQuestions: 10,
    pass: 70,
    time: 30,
    mode: "standard",
  },
  test: {
    label: "Test",
    hint: "Mid-term style — set your own length and difficulty.",
    suggestedQuestions: 20,
    pass: 75,
    time: 45,
    mode: "comprehensive",
  },
  exam: {
    label: "Final exam",
    hint: "Full assessment — use Settings to set total questions and time.",
    suggestedQuestions: 50,
    pass: 80,
    time: 90,
    mode: "final_exam",
  },
};

type QuizMode = "quick" | "standard" | "comprehensive" | "final_exam" | "custom";

const QUIZ_MODE_LABELS: Record<QuizMode, string> = {
  quick: "Quick",
  standard: "Standard",
  comprehensive: "Comprehensive",
  final_exam: "Final exam",
  custom: "Custom",
};

type BuildMode = "ai" | "manual" | "oral";

const isManualBuild = (mode: BuildMode) => mode === "manual" || mode === "oral";

const emptyOralQuestion = (overrides?: Partial<QuizQuestion>): QuizQuestion => ({
  id: `q${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type: "oral_listen",
  question: "Oral listening task",
  instruction: "Écoutez et donnez votre réponse.",
  response_format: "text",
  prompt_audio_url: "",
  points: 2,
  ...overrides,
});

/** Sample-style: listen → reply by microphone */
const oralTaskWithAudioReply = () =>
  emptyOralQuestion({
    instruction: "Pour cet audio, écoutez et donnez moi le résumé oral.",
    question: "Oral task — microphone reply",
    response_format: "audio",
  });

/** Sample-style: listen → reply in writing */
const oralTaskWithWrittenReply = () =>
  emptyOralQuestion({
    instruction: "Pour cet audio, écoutez et donnez moi le résumé écrit.",
    question: "Oral task — written reply",
    response_format: "text",
  });

const emptyManualQuestion = (suffix = ""): QuizQuestion => ({
  id: `q${Date.now()}${suffix}`,
  type: "true_false",
  question: "",
  options: ["True", "False"],
  correct_answer: "True",
  points: 1,
});

const clampQuestionCount = (value: number) => Math.min(100, Math.max(1, Number.isFinite(value) ? value : 1));

const InstructorQuizzes = () => {
  const { toast } = useToast();
  const email = resolveInstructorEmail();
  const {
    data,
    loading,
    reload,
    error: quizzesError,
  } = useDashboardQuery<{ quizzes: InstructorQuiz[]; courses: Array<{ id: number; title?: string }> }>(
    dashboardCacheKey("instructor-quizzes", email),
    () => getInstructorQuizzes(email),
    { enabled: !!email }
  );
  const {
    data: assignedData,
    loading: coursesLoading,
  } = useDashboardQuery<{ courses: Array<{ id: number; title?: string }> }>(
    dashboardCacheKey("instructor-courses", email),
    () => getInstructorAssignedCourses(email),
    { enabled: !!email }
  );
  const quizzes = data?.quizzes ?? [];
  const courses = useMemo(() => {
    const merged = new Map<number, { id: number; title?: string }>();
    for (const c of assignedData?.courses ?? []) {
      merged.set(c.id, { id: c.id, title: c.title });
    }
    for (const c of data?.courses ?? []) {
      merged.set(c.id, c);
    }
    return Array.from(merged.values()).sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  }, [assignedData?.courses, data?.courses]);
  const coursesLoadFailed = !!quizzesError;
  const pageLoading = loading && !data;

  const [aiStatus, setAiStatus] = useState<{
    configured: boolean;
    generation_provider?: string;
    generation_model?: string;
    marking_primary?: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [buildMode, setBuildMode] = useState<BuildMode>("ai");
  const [courseId, setCourseId] = useState("");
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [topicData, setTopicData] = useState<QuizCourseTopicsResponse | null>(null);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsLoadError, setTopicsLoadError] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [quizMode, setQuizMode] = useState<"quick" | "standard" | "comprehensive" | "final_exam" | "custom">("standard");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("medium");
  const [bloomLevels, setBloomLevels] = useState<string[]>(["remember", "understand", "apply", "analyze"]);
  const [questionTypes, setQuestionTypes] = useState<string[]>(["multiple_choice", "true_false"]);
  const [knowledgeMap, setKnowledgeMap] = useState<Record<string, unknown> | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [useTimeLimit, setUseTimeLimit] = useState(true);
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);
  const [manualQuestions, setManualQuestions] = useState<QuizQuestion[]>([]);
  const [generationProvider, setGenerationProvider] = useState<string | null>(null);
  const [assessmentLanguage, setAssessmentLanguage] = useState<string | null>(null);
  const [assessmentLanguageLabel, setAssessmentLanguageLabel] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishToAll, setPublishToAll] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [courseStudents, setCourseStudents] = useState<InstructorStudentRow[]>([]);
  const [publishingQuizId, setPublishingQuizId] = useState<number | null>(null);
  const [publishDraftToAll, setPublishDraftToAll] = useState(true);
  const [publishDraftStudentIds, setPublishDraftStudentIds] = useState<number[]>([]);
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [editingQuizStatus, setEditingQuizStatus] = useState<"draft" | "published">("draft");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [isRepublishDialog, setIsRepublishDialog] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [deliverCount, setDeliverCount] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(0);
  const [detectTabSwitch, setDetectTabSwitch] = useState(true);
  const [analyticsQuizId, setAnalyticsQuizId] = useState<number | null>(null);
  const [analyticsData, setAnalyticsData] = useState<QuizAnalyticsPayload | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [builderStep, setBuilderStep] = useState<BuilderStep>(1);
  const [assessmentKind, setAssessmentKind] = useState<AssessmentKind>("quiz");
  const [availabilityMode, setAvailabilityMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [scheduledTimezone, setScheduledTimezone] = useState(resolveDefaultTimezone);
  const [publishAvailabilityMode, setPublishAvailabilityMode] = useState<"immediate" | "scheduled">("immediate");
  const [publishScheduledAtLocal, setPublishScheduledAtLocal] = useState("");
  const [publishScheduledTimezone, setPublishScheduledTimezone] = useState(resolveDefaultTimezone);
  const [uploadingPromptIdx, setUploadingPromptIdx] = useState<number | null>(null);
  const [reviewQuizId, setReviewQuizId] = useState<number | null>(null);
  const oralTasksEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    unlockDashboardPageScroll();
    if (!showForm) return;
    unlockDashboardPageScroll();
    const id = window.setInterval(unlockDashboardPageScroll, 800);
    return () => window.clearInterval(id);
  }, [showForm]);

  const activeQuestions = editingQuizId
    ? manualQuestions
    : buildMode === "ai"
      ? generatedQuestions
      : manualQuestions;
  const resolvedTopic = customTopic.trim() || topic;
  const materialRequired = buildMode === "ai";
  const canProceedFromSetup =
    !!courseId && (materialRequired ? !!resolvedTopic && !!topicData?.has_materials : !!resolvedTopic);

  const proceedFromSetup = useCallback(() => {
    if (!canProceedFromSetup) {
      toast({
        variant: "destructive",
        title: materialRequired
          ? "Select course, topic, and upload materials first"
          : "Select course and enter an assessment name",
        description: materialRequired
          ? undefined
          : 'Use the "Assessment name / topic" field above.',
      });
      return;
    }
    if (buildMode === "oral" && customTopic.trim() && !title.trim()) {
      setTitle(customTopic.trim());
    }
    setBuilderStep(2);
  }, [buildMode, canProceedFromSetup, customTopic, materialRequired, title, toast]);

  const startOralBuild = () => {
    setBuildMode("oral");
    setGeneratedQuestions([]);
    setManualQuestions([]);
    if (!customTopic.trim()) setCustomTopic("Oral listening assessment");
  };

  const addOralTask = (factory: () => QuizQuestion) => {
    setManualQuestions((prev) => [...prev, factory()]);
    window.setTimeout(() => {
      oralTasksEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
  };

  const startManualBuild = () => {
    setBuildMode("manual");
    setGeneratedQuestions([]);
    setManualQuestions([]);
  };

  const startAiBuild = () => {
    setBuildMode("ai");
    setManualQuestions([]);
    setGeneratedQuestions([]);
  };
  const pdfMaterials = topicData?.pdf_materials ?? [];
  const needsPdfPick = pdfMaterials.length > 1;

  useEffect(() => {
    void getQuizAiStatus().then(setAiStatus).catch(() => setAiStatus({ configured: false }));
  }, []);

  useEffect(() => {
    if (courses.length && !courseId) {
      setCourseId(String(courses[0].id));
    }
  }, [courses, courseId]);

  useEffect(() => {
    if (courseId && courses.length && !courses.some((c) => String(c.id) === courseId)) {
      setCourseId(String(courses[0].id));
    }
  }, [courses, courseId]);

  useEffect(() => {
    if (!email || !courseId) return;
    setTopicsLoading(true);
    setTopicsLoadError(null);
    void getQuizCourseTopics(Number(courseId), email)
      .then((res) => {
        setTopicData(res);
        if (res.assessment_language_label) {
          setAssessmentLanguage(res.assessment_language ?? null);
          setAssessmentLanguageLabel(res.assessment_language_label);
        }
        if (res.pdf_materials?.length === 1) {
          setSelectedMaterialId(String(res.pdf_materials[0].id));
        } else {
          setSelectedMaterialId("");
        }
      })
      .catch((err: unknown) => {
        setTopicData(null);
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Could not load topics from the server. Check that the backend is running and try again.";
        setTopicsLoadError(message);
        toast({ variant: "destructive", title: "Topic extraction failed", description: message });
      })
      .finally(() => setTopicsLoading(false));
  }, [email, courseId, toast]);

  useEffect(() => {
    if (!email) return;
    void getInstructorStudents(email)
      .then((res) => setCourseStudents(res.students ?? []))
      .catch(() => setCourseStudents([]));
  }, [email]);

  useEffect(() => {
    if (topic && !title) {
      const course = courses.find((c) => String(c.id) === courseId);
      setTitle(`Quiz: ${topic}${course?.title ? ` — ${course.title}` : ""}`);
    }
  }, [topic, courseId, courses, title]);

  useEffect(() => {
    if (!materialRequired && customTopic.trim() && !title.trim()) {
      setTitle(customTopic.trim());
    }
  }, [customTopic, materialRequired, title]);

  const enrolledForCourse = useMemo(
    () => courseStudents.filter((s) => s.course_id === Number(courseId)),
    [courseStudents, courseId]
  );

  const publishingQuiz = quizzes.find((q) => q.id === publishingQuizId);
  const enrolledForPublishingQuiz = useMemo(
    () =>
      publishingQuiz
        ? courseStudents.filter((s) => s.course_id === publishingQuiz.course_id)
        : [],
    [courseStudents, publishingQuiz]
  );

  const load = async () => {
    invalidateDashboardCache(dashboardCacheKey("instructor-quizzes", email));
    invalidateDashboardCache(dashboardCacheKey("instructor-courses", email));
    await reload();
  };

  const resetBuilder = () => {
    setGeneratedQuestions([]);
    setManualQuestions([]);
    setTitle("");
    setDescription("");
    setTopic("");
    setCustomTopic("");
    setSelectedMaterialId("");
    setGenerationProvider(null);
    setEditingQuizId(null);
    setEditingQuizStatus("draft");
    setPublishToAll(true);
    setSelectedStudentIds([]);
    setBuilderStep(1);
    setAssessmentKind("quiz");
    setAvailabilityMode("immediate");
    setScheduledAtLocal("");
    setQuizMode("standard");
    setQuestionCount(10);
    startAiBuild();
  };

  const applyAssessmentKind = (kind: AssessmentKind) => {
    setAssessmentKind(kind);
    const preset = ASSESSMENT_KIND_META[kind];
    setQuizMode(preset.mode);
    setQuestionCount(preset.suggestedQuestions);
    setPassingScore(preset.pass);
    setTimeLimitMinutes(preset.time);
    setUseTimeLimit(true);
  };

  const handleGenerate = async () => {
    if (!email || !courseId || !resolvedTopic) {
      toast({ variant: "destructive", title: "Select course and topic first." });
      return;
    }
    if (!topicData?.has_materials) {
      toast({
        variant: "destructive",
        title: "No materials found",
        description: "Upload course PDFs or lessons with module/chapter/topic labels first.",
      });
      return;
    }
    if (questionCount < 1 || questionCount > 100) {
      toast({ variant: "destructive", title: "Set question count between 1 and 100." });
      return;
    }
    if (needsPdfPick && !selectedMaterialId && !resolvedTopic) {
      toast({ variant: "destructive", title: "Select a topic or PDF material to base questions on." });
      return;
    }

    setGenerating(true);
    setKnowledgeMap(null);
    try {
      const result = await generateQuizQuestions({
        instructor_email: email,
        course_id: Number(courseId),
        topic: resolvedTopic,
        question_count: questionCount,
        difficulty,
        material_id: selectedMaterialId ? Number(selectedMaterialId) : undefined,
        quiz_mode: quizMode,
        bloom_levels: bloomLevels,
        question_types: questionTypes,
      });
      setGeneratedQuestions(result.questions);
      setGenerationProvider(result.provider);
      setAssessmentLanguage(result.assessment_language ?? null);
      setAssessmentLanguageLabel(result.assessment_language_label ?? null);
      setKnowledgeMap(result.knowledge_map ?? null);
      toast({
        title: "Questions generated from material",
        description: `${result.questions.length} questions created${result.rejected_count ? ` (${result.rejected_count} rejected by quality check)` : ""}${result.assessment_language_label ? ` · Language: ${result.assessment_language_label}` : ""}. Review before saving.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "AI generation failed",
        description: err?.response?.data?.message || "Could not generate questions.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleAnalyzeMaterial = async () => {
    if (!email || !selectedMaterialId) {
      toast({ variant: "destructive", title: "Select a source material to analyze." });
      return;
    }
    setAnalyzing(true);
    try {
      const analysis = await analyzeQuizMaterial({
        instructor_email: email,
        material_id: Number(selectedMaterialId),
      });
      setKnowledgeMap(analysis.knowledge_map ?? null);
      toast({
        title: "Material analyzed",
        description: `${analysis.word_count ?? 0} words · ${analysis.chunk_count ?? 0} chunks · ${analysis.difficulty_level ?? "intermediate"}`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: err?.response?.data?.message || "Could not analyze material.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const applyQuizMode = (mode: typeof quizMode) => {
    setQuizMode(mode);
    const presets: Record<typeof quizMode, number> = {
      quick: 5,
      standard: 10,
      comprehensive: 20,
      final_exam: 50,
      custom: questionCount,
    };
    if (mode !== "custom") {
      setQuestionCount(presets[mode]);
    }
  };

  const toggleBloom = (level: string) => {
    setBloomLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const toggleQuestionType = (type: string) => {
    setQuestionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const addManualQuestion = () => {
    setManualQuestions((prev) => [...prev, emptyManualQuestion(`_${prev.length}`)]);
  };

  const createManualQuestionSlots = () => {
    const target = clampQuestionCount(questionCount);
    if (manualQuestions.length >= target) {
      toast({
        title: "Question slots ready",
        description: `You already have ${manualQuestions.length} question(s). Target is ${target}.`,
      });
      return;
    }
    const needed = target - manualQuestions.length;
    const start = manualQuestions.length;
    setManualQuestions((prev) => [
      ...prev,
      ...Array.from({ length: needed }, (_, i) => emptyManualQuestion(`_${start + i}`)),
    ]);
    toast({
      title: "Question slots created",
      description: `Added ${needed} blank question(s). ${target} total slots — fill in each one below.`,
    });
  };

  const updateManualQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setManualQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const removeManualQuestion = (index: number) => {
    setManualQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const validateQuestions = (questions: QuizQuestion[], relaxed = false): boolean => {
    if (questions.length === 0) return false;
    return questions.every((q) => {
      if (q.type === "oral_listen") {
        if (!q.prompt_audio_url?.trim()) return false;
        return !!(q.question?.trim() || q.instruction?.trim());
      }
      if (!q.question?.trim()) return false;
      if (relaxed) return true;
      if (q.type === "true_false") {
        return q.correct_answer === "True" || q.correct_answer === "False";
      }
      if (q.type === "multiple_choice") {
        return !!(q.options?.filter(Boolean).length && q.correct_answer?.trim());
      }
      return !!(q.model_answer?.trim() || q.correct_answer?.trim());
    });
  };

  const uploadOralPrompt = async (index: number, file: File) => {
    if (!email || !courseId) return;
    setUploadingPromptIdx(index);
    try {
      const res = await uploadQuizPromptAudio({
        instructor_email: email,
        course_id: Number(courseId),
        audio: file,
        filename: file.name,
      });
      updateManualQuestion(index, {
        prompt_audio_url: res.path,
        prompt_audio_filename: res.filename ?? file.name,
      });
      toast({ title: "Audio saved to pCloud", description: "Prompt audio is ready for learners." });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err?.response?.data?.message || "Could not upload audio.",
      });
    } finally {
      setUploadingPromptIdx(null);
    }
  };

  const normalizeLoadedQuestions = (questions: QuizQuestion[]): QuizQuestion[] =>
    questions.map((q) => ({
      ...q,
      question: q.question ?? "",
      instruction: q.instruction ?? "",
      prompt_audio_url: q.prompt_audio_url ?? "",
      prompt_audio_filename: q.prompt_audio_filename ?? "",
      response_format: q.response_format ?? "text",
      model_answer: q.model_answer ?? q.correct_answer ?? "",
      correct_answer: q.correct_answer ?? q.model_answer ?? "",
      options:
        q.type === "multiple_choice"
          ? q.options?.length
            ? sortQuizOptions(q.options.filter(Boolean))
            : ["", "", "", ""]
          : q.type === "true_false"
            ? ["True", "False"]
            : q.type === "multiple_response" && q.options?.length
              ? sortQuizOptions(q.options.filter(Boolean))
              : q.options,
    }));

  const saveQuiz = async (status: "draft" | "published") => {
    if (!email || !courseId || !title.trim() || !resolvedTopic) {
      toast({ variant: "destructive", title: "Fill in course, topic, and title." });
      return;
    }
    if (!validateQuestions(activeQuestions, !!editingQuizId)) {
      toast({
        variant: "destructive",
        title: editingQuizId ? "Quiz has no questions" : "Add valid questions before saving.",
        description: buildMode === "oral"
          ? "Add at least one oral task, upload prompt audio, and write an instruction."
          : editingQuizId
            ? "This quiz must keep at least one question with text."
            : undefined,
      });
      return;
    }

    const publishedStudentIds =
      status === "published" && !publishToAll ? selectedStudentIds : undefined;

    if (status === "published" && !publishToAll && selectedStudentIds.length === 0) {
      toast({ variant: "destructive", title: "Select at least one learner or publish to all." });
      return;
    }

    if (status === "published" && availabilityMode === "scheduled") {
      if (!scheduledAtLocal) {
        toast({ variant: "destructive", title: "Choose when the assessment opens." });
        return;
      }
      if (!isFutureScheduled(scheduledAtLocal, scheduledTimezone)) {
        toast({ variant: "destructive", title: "Scheduled time must be in the future." });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        instructor_email: email,
        title: title.trim(),
        topic: resolvedTopic,
        description: description || undefined,
        passing_score: passingScore,
        time_limit_minutes: useTimeLimit ? timeLimitMinutes : null,
        questions: activeQuestions,
        ai_generated: buildMode === "ai" && !editingQuizId,
        generation_provider: generationProvider ?? undefined,
        assessment_language: assessmentLanguage ?? undefined,
        assessment_language_label: assessmentLanguageLabel ?? undefined,
        material_id: selectedMaterialId ? Number(selectedMaterialId) : undefined,
        status,
        published_student_ids: publishedStudentIds,
        anti_cheat: {
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
          deliver_count: deliverCount > 0 ? deliverCount : 0,
          max_attempts: maxAttempts > 0 ? maxAttempts : 0,
          detect_tab_switch: detectTabSwitch,
        },
        assessment_kind: assessmentKind,
        availability_mode: availabilityMode,
        scheduled_at:
          availabilityMode === "scheduled" && scheduledAtLocal
            ? localDatetimeToIso(scheduledAtLocal, scheduledTimezone) ?? undefined
            : undefined,
        question_pool: deliverCount > 0 && deliverCount < activeQuestions.length ? activeQuestions : undefined,
      };

      if (editingQuizId) {
        await updateInstructorQuiz(editingQuizId, payload);
      } else {
        await createAiInstructorQuiz({
          instructor_email: email,
          course_id: Number(courseId),
          ...payload,
        });
      }
      toast({
        title: editingQuizId
          ? status === "published"
            ? "Quiz updated & published"
            : "Quiz updated"
          : status === "published"
            ? "Quiz published"
            : "Quiz saved as draft",
        description:
          status === "published"
            ? availabilityMode === "scheduled"
              ? "Learners will be notified 1 hour 30 minutes before it opens."
              : publishToAll
                ? "All enrolled learners can take this quiz."
                : `Published to ${selectedStudentIds.length} learner(s).`
            : "Publish later from the quiz list when ready.",
      });
      resetBuilder();
      setShowForm(false);
      await load();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.response?.data?.message || "Could not save quiz.",
      });
    } finally {
      setSaving(false);
    }
  };

  const openQuizAnalytics = async (quizId: number) => {
    if (!email) return;
    setAnalyticsQuizId(quizId);
    setLoadingAnalytics(true);
    try {
      const data = await getQuizAnalytics(quizId, email);
      setAnalyticsData(data);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Analytics unavailable",
        description: err?.response?.data?.message || "Could not load analytics.",
      });
      setAnalyticsQuizId(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleSaveDraft = (e: FormEvent) => {
    e.preventDefault();
    void saveQuiz("draft");
  };

  const handlePublish = (e: FormEvent) => {
    e.preventDefault();
    void saveQuiz("published");
  };

  const handleSaveChanges = (e: FormEvent) => {
    e.preventDefault();
    void saveQuiz(editingQuizStatus);
  };

  const openPublishDialog = (quiz: InstructorQuiz, republish = false) => {
    const ids = quiz.published_student_ids ?? [];
    setPublishingQuizId(quiz.id);
    setIsRepublishDialog(republish);
    setPublishDraftToAll(ids.length === 0);
    setPublishDraftStudentIds(ids);
    setPublishAvailabilityMode(quiz.availability_mode === "scheduled" ? "scheduled" : "immediate");
    const publishTz = resolveDefaultTimezone();
    setPublishScheduledTimezone(publishTz);
    setPublishScheduledAtLocal(isoToLocalDatetime(quiz.scheduled_at, publishTz));
  };

  const openEditQuiz = async (quiz: InstructorQuiz) => {
    if (!email || !quiz.id) return;
    setLoadingEdit(true);
    try {
      const { quiz: detail } = await getInstructorQuiz(quiz.id, email);
      setEditingQuizId(quiz.id);
      setEditingQuizStatus((detail.status as "draft" | "published") ?? "draft");
      setCourseId(String(detail.course_id));
      setTopic(detail.topic ?? "");
      setCustomTopic("");
      setTitle(detail.title ?? "");
      setDescription(detail.description ?? "");
      setPassingScore(detail.passing_score ?? 70);
      setUseTimeLimit(!!detail.time_limit_minutes);
      setTimeLimitMinutes(detail.time_limit_minutes ?? 30);
      const loaded = normalizeLoadedQuestions(detail.questions ?? []);
      const allOral = loaded.length > 0 && loaded.every((q) => q.type === "oral_listen");
      setBuildMode(allOral ? "oral" : "manual");
      setManualQuestions(loaded);
      setBuilderStep(2);
      setAssessmentKind((detail.assessment_kind as AssessmentKind) ?? "quiz");
      setGeneratedQuestions([]);
      setGenerationProvider(detail.generation_provider ?? null);
      setSelectedMaterialId(detail.source_material_id ? String(detail.source_material_id) : "");
      const pubIds = detail.published_student_ids ?? [];
      setPublishToAll(pubIds.length === 0);
      setSelectedStudentIds(pubIds);
      setAvailabilityMode(detail.availability_mode === "scheduled" ? "scheduled" : "immediate");
      const editTz = resolveDefaultTimezone();
      setScheduledTimezone(editTz);
      setScheduledAtLocal(isoToLocalDatetime(detail.scheduled_at, editTz));
      setShowForm(true);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not load quiz",
        description: err?.response?.data?.message || "Try again.",
      });
    } finally {
      setLoadingEdit(false);
    }
  };

  const handlePublishDraft = async (quizId: number) => {
    if (!email) return;
    if (!publishDraftToAll && publishDraftStudentIds.length === 0) {
      toast({ variant: "destructive", title: "Select learners or publish to all." });
      return;
    }

    if (publishAvailabilityMode === "scheduled") {
      if (!publishScheduledAtLocal) {
        toast({ variant: "destructive", title: "Choose when the assessment opens." });
        return;
      }
      if (!isFutureScheduled(publishScheduledAtLocal, publishScheduledTimezone)) {
        toast({ variant: "destructive", title: "Scheduled time must be in the future." });
        return;
      }
    }

    setSaving(true);
    try {
      const res = await publishInstructorQuiz(quizId, {
        instructor_email: email,
        published_student_ids: publishDraftToAll ? undefined : publishDraftStudentIds,
        availability_mode: publishAvailabilityMode,
        scheduled_at:
          publishAvailabilityMode === "scheduled" && publishScheduledAtLocal
            ? localDatetimeToIso(publishScheduledAtLocal, publishScheduledTimezone) ?? undefined
            : undefined,
      });
      toast({
        title: isRepublishDialog ? "Quiz re-published" : "Quiz published",
        description: res.message,
      });
      setPublishingQuizId(null);
      setIsRepublishDialog(false);
      await load();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Publish failed",
        description: err?.response?.data?.message || "Could not publish quiz.",
      });
    } finally {
      setSaving(false);
    }
  };

  const onTopicSelect = (value: string) => {
    setTopic(value);
    setCustomTopic("");
    setGeneratedQuestions([]);
    setKnowledgeMap(null);
    const group = topicData?.topic_groups?.find((g) => g.label === value);
    const groupPdfs = group?.materials?.filter((m) => m.is_pdf) ?? [];
    if (groupPdfs.length === 1) {
      setSelectedMaterialId(String(groupPdfs[0].id));
    } else if (groupPdfs.length > 1) {
      setSelectedMaterialId("");
    }
  };

  const switchQuestionType = (index: number, type: QuizQuestion["type"]) => {
    if (type === "oral_listen") {
      updateManualQuestion(index, oralTaskWithAudioReply());
      return;
    }
    updateManualQuestion(index, {
      type,
      question: "",
      options: type === "multiple_choice" ? ["", "", "", ""] : type === "true_false" ? ["True", "False"] : undefined,
      correct_answer: type === "true_false" ? "True" : "",
      instruction: undefined,
      prompt_audio_url: undefined,
      response_format: undefined,
    });
  };

  const renderQuestionPreview = (questions: QuizQuestion[], editable = false) => {
    const oralOnlyFlow = buildMode === "oral" && editable;

    return (
      <div className="space-y-4">
        {!oralOnlyFlow && (
          <p className="font-medium text-sm text-muted-foreground">
            {editable ? `${questions.length} question(s)` : `Preview (${questions.length})`}
            {generationProvider && buildMode === "ai" && (
              <Badge variant="secondary" className="ml-2">
                {generationProvider}
              </Badge>
            )}
          </p>
        )}

        {editable ? (
          <div className="space-y-4">
            {questions.map((q, idx) =>
              q.type === "oral_listen" ? (
                <OralQuestionEditor
                  key={q.id}
                  index={idx}
                  question={q}
                  courseId={courseId}
                  uploading={uploadingPromptIdx === idx}
                  oralOnly={oralOnlyFlow}
                  onChange={(patch) => updateManualQuestion(idx, patch)}
                  onRemove={() => removeManualQuestion(idx)}
                  onUpload={(file) => void uploadOralPrompt(idx, file)}
                  onSwitchType={oralOnlyFlow ? undefined : (type) => switchQuestionType(idx, type)}
                />
              ) : (
                <StandardQuestionEditor
                  key={q.id}
                  index={idx}
                  question={q}
                  onChange={(patch) => updateManualQuestion(idx, patch)}
                  onRemove={() => removeManualQuestion(idx)}
                  onSwitchType={(type) => switchQuestionType(idx, type)}
                />
              )
            )}
            <div ref={oralTasksEndRef} />
          </div>
        ) : (
          questions.map((q, idx) => (
            <div key={q.id} className="rounded-md border bg-background p-3 text-sm space-y-2">
              <>
                <p className="font-medium">
                  {idx + 1}. {q.question}{" "}
                  <Badge variant="outline" className="ml-1">
                    {q.type.replace(/_/g, " ")}
                  </Badge>
                  {q.bloom_level && (
                    <Badge variant="secondary" className="ml-1">
                      {q.bloom_level}
                    </Badge>
                  )}
                </p>
                {q.source_section && (
                  <p className="text-xs text-muted-foreground">Source: {q.source_section}</p>
                )}
                {q.explanation && <p className="text-xs text-muted-foreground">{q.explanation}</p>}
                {q.type === "multiple_choice" && q.options?.length ? (
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {sortQuizOptions(q.options.filter(Boolean)).map((opt) => (
                      <li key={opt} className={opt === q.correct_answer ? "text-green-700 font-medium" : ""}>
                        {opt}
                      </li>
                    ))}
                  </ul>
                ) : q.type === "true_false" ? (
                  <p className="text-muted-foreground text-xs">Correct: {q.correct_answer ?? "True"}</p>
                ) : q.type === "oral_listen" ? (
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>Response: {q.response_format === "audio" ? "Oral recording" : "Written text"}</p>
                    {q.instruction && <p className="italic">&quot;{q.instruction}&quot;</p>}
                    {q.prompt_audio_url && courseId && (
                      <QuizAudioPlayer
                        src={q.prompt_audio_url}
                        courseId={Number(courseId)}
                        filename={q.prompt_audio_filename ?? undefined}
                        label="Prompt audio"
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">Model answer: {q.model_answer ?? q.correct_answer}</p>
                )}
              </>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Instructor"
        title="Assessments"
        description="Create quizzes, tests & exams with Gemini AI, oral tasks, and learner access control. Media stored on pCloud."
      >
        <Button
          onClick={() => {
            if (!showForm) resetBuilder();
            setShowForm((v) => !v);
          }}
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
        >
          <Plus className="mr-2 h-4 w-4" />
          New assessment
        </Button>
      </AdminPageHeader>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 flex flex-wrap items-center gap-3 text-sm">
          <Bot className="h-5 w-5 text-primary" />
          <span>
            {aiStatus?.configured
              ? `Gemini AI · ${aiStatus.generation_model ?? "gemini-2.0-flash"} · Auto questions & correction · Oral tasks · Media on pCloud`
              : "Manual assessments always work. Add GOOGLE_AI_API_KEY for Gemini auto-generation and marking."}
          </span>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="flex max-h-[calc(100dvh-13rem)] flex-col overflow-hidden">
          <CardHeader className="shrink-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              {editingQuizId ? "Edit assessment" : "Assessment builder"}
            </CardTitle>
            <CardDescription>
              {editingQuizId
                ? "Update questions, timing, then save or re-publish to selected learners."
                : "Step 1: pick type & source · Step 2: questions (AI or manual + oral) · Step 3: settings · Step 4: who can access."}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-4">
            <form className="space-y-5 max-w-3xl pb-2">
              {!editingQuizId && <QuizStepIndicator steps={[...BUILDER_STEPS]} current={builderStep} />}

              {editingQuizId && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2 text-sm">
                  <p className="font-medium text-primary">Questions &amp; audio</p>
                  <p className="text-xs text-muted-foreground">
                    Verify each oral task has uploaded audio (green preview player). Learners cannot hear prompts without it.
                  </p>
                </div>
              )}

              {builderStep === 1 && !editingQuizId && (
                <>
              {!editingQuizId && (
                <div className="space-y-3">
                  <Label>Assessment type</Label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(Object.keys(ASSESSMENT_KIND_META) as AssessmentKind[]).map((kind) => {
                      const meta = ASSESSMENT_KIND_META[kind];
                      const active = assessmentKind === kind;
                      return (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => applyAssessmentKind(kind)}
                          className={`rounded-xl border p-4 text-left transition-all ${
                            active
                              ? "border-accent bg-accent/10 shadow-sm ring-1 ring-accent/30"
                              : "border-border bg-background hover:border-accent/40 hover:bg-muted/30"
                          }`}
                        >
                          <p className="font-semibold text-sm">{meta.label}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{meta.hint}</p>
                          {active && (
                            <p className="text-[11px] text-accent-foreground mt-2 font-medium">
                              Suggested start: {questionCount} questions · {passingScore}% pass · {timeLimitMinutes} min
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label>Question source</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {!editingQuizId && (
                    <>
                      <button
                        type="button"
                        onClick={startOralBuild}
                        className={`rounded-xl border p-4 text-left transition-all ${
                          buildMode === "oral"
                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                            : "border-border bg-background hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold text-sm text-primary">
                          <Mic className="h-4 w-4" />
                          Oral listening
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          Upload audio prompts on pCloud. Learners listen and reply by microphone or text.{" "}
                          <strong>No course PDFs required.</strong>
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          startManualBuild();
                          setBuilderStep(1);
                        }}
                        className={`rounded-xl border p-4 text-left transition-all ${
                          buildMode === "manual"
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border bg-background hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          <PenLine className="h-4 w-4" />
                          Manual setup
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          Build MCQ, true/false, short answer, or mix with oral tasks. No materials required.
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          startAiBuild();
                          setBuilderStep(1);
                        }}
                        className={`rounded-xl border p-4 text-left transition-all ${
                          buildMode === "ai"
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border bg-background hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          <Sparkles className="h-4 w-4" />
                          AI from materials
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          Gemini generates questions from uploaded PDFs/lessons. Requires course materials.
                        </p>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {buildMode === "oral" && !editingQuizId && builderStep === 1 && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2 text-sm">
                  <p className="font-medium text-primary">How oral assessments work (like your sample)</p>
                  <ol className="list-decimal pl-5 text-primary/90 space-y-1 text-xs">
                    <li>Upload an audio file → learner hears it in the app</li>
                    <li>Add instruction: e.g. &quot;Pour cet audio, écoutez et donnez le résumé oral&quot;</li>
                    <li>Choose reply type: <strong>microphone</strong> or <strong>written text</strong></li>
                    <li>Repeat for each audio clip — then publish to all or selected learners</li>
                  </ol>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Course</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                    value={courseId}
                    onChange={(e) => {
                      setCourseId(e.target.value);
                      setTopic("");
                      setCustomTopic("");
                      setGeneratedQuestions([]);
                      setManualQuestions([]);
                      setSelectedMaterialId("");
                    }}
                    required
                    disabled={coursesLoading || courses.length === 0}
                  >
                    <option value="" disabled>
                      {coursesLoading
                        ? "Loading courses…"
                        : courses.length === 0
                          ? "No courses assigned yet"
                          : "Select a course…"}
                    </option>
                    {courses.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.title ?? `Course #${c.id}`}
                      </option>
                    ))}
                  </select>
                  {coursesLoading && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading your courses…
                    </p>
                  )}
                  {!coursesLoading && courses.length === 0 && (
                    <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-3 text-sm space-y-2">
                      <p className="text-muted-foreground">
                        No courses are assigned to this instructor yet. Create a course first, then return here to build an assessment.
                      </p>
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link to="/dashboard/instructor/create-course">Create a course</Link>
                      </Button>
                    </div>
                  )}
                  {coursesLoadFailed && !coursesLoading && courses.length === 0 && (
                    <p className="text-xs text-destructive">
                      Could not load courses.{" "}
                      <button
                        type="button"
                        className="underline font-medium"
                        onClick={() => void load()}
                      >
                        Retry
                      </button>
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>
                    {materialRequired ? "Topic / module / chapter" : "Assessment name (optional if using custom below)"}
                  </Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={topic}
                    onChange={(e) => onTopicSelect(e.target.value)}
                    disabled={topicsLoading || !materialRequired}
                  >
                    <option value="">
                      {topicsLoading
                        ? "Reading PDF and extracting modules…"
                        : materialRequired
                          ? "Select a module / chapter / topic…"
                          : "Optional — or use custom name below"}
                    </option>
                    {(topicData?.topics ?? []).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {topicsLoading && materialRequired && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Reading your PDF and extracting modules/chapters…
                </p>
              )}

              {topicsLoadError && !topicsLoading && (
                <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  {topicsLoadError}
                </p>
              )}

              {!topicsLoading && topicData?.extraction_errors && topicData.extraction_errors.length > 0 && (
                <div className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  <p className="font-medium">Could not extract topics from PDF</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    {topicData.extraction_errors.map((err) => (
                      <li key={`${err.material_id}-${err.code}`}>
                        {err.material_title ? <strong>{err.material_title}: </strong> : null}
                        {err.message}
                      </li>
                    ))}
                  </ul>
                  {topicData.pdf_analysis?.some((a) => (a.ai_warnings?.length ?? 0) > 0) && (
                    <ul className="list-disc pl-5 space-y-1 text-xs text-amber-800">
                      {topicData.pdf_analysis.flatMap((a) =>
                        (a.ai_warnings ?? []).map((w, i) => (
                          <li key={`${a.material_id}-warn-${i}`}>{w}</li>
                        ))
                      )}
                    </ul>
                  )}
                  <p className="text-xs">
                    Fix the PDF or API key, then re-select the course. You can still enter a custom topic below.
                  </p>
                </div>
              )}

              {!topicsLoading && topicData && !topicData.has_materials && materialRequired && (
                <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  No study materials found for this course. Upload PDFs or lessons first — or switch to{" "}
                  <strong>Oral listening</strong> / <strong>Manual setup</strong> (no materials needed).
                </p>
              )}

              {!materialRequired && !editingQuizId && (
                <p className="text-sm text-primary rounded-md border border-primary/30 bg-primary/5 p-3">
                  Course materials are <strong>not required</strong> for this mode. Enter an assessment name below, then add
                  your oral audio tasks.
                </p>
              )}

              {topicData?.has_materials && (
                <p className="text-xs text-muted-foreground">
                  {topicData.materials_count} material(s) found
                  {topicData.pdf_materials.length > 0 ? ` · ${topicData.pdf_materials.length} PDF(s)` : ""}
                  {topicData.topics.length > 0 && topicData.topics_source !== "failed"
                    ? ` · ${topicData.topics.length} topic(s) extracted from PDF`
                    : ""}
                  {topicData.topics_source === "local_pdf" && topicData.topics.length > 0
                    ? " (local text extraction — AI unavailable)"
                    : ""}
                  {(topicData.assessment_language_label || assessmentLanguageLabel) && buildMode === "ai"
                    ? ` · Assessment language: ${topicData.assessment_language_label ?? assessmentLanguageLabel} (from material)`
                    : ""}
                </p>
              )}

              {(needsPdfPick || pdfMaterials.length > 0) && buildMode === "ai" && (
                <div className="space-y-2">
                  <Label>Source PDF {needsPdfPick ? "(required — multiple PDFs)" : "(optional)"}</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedMaterialId}
                    onChange={(e) => {
                      setSelectedMaterialId(e.target.value);
                      setGeneratedQuestions([]);
                    }}
                  >
                    <option value="">{needsPdfPick ? "Choose a PDF…" : "Auto (single PDF or all materials)"}</option>
                    {pdfMaterials.map((m: QuizMaterialSummary) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.title ?? m.filename} {m.topic ? `· ${m.topic}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="custom-topic">
                  {materialRequired ? "Or enter a custom topic" : "Assessment name / topic"}
                </Label>
                <Input
                  id="custom-topic"
                  placeholder={
                    buildMode === "oral"
                      ? "e.g. Oral comprehension — Advanced Conversation"
                      : "e.g. Module 2 — Past tense verbs"
                  }
                  value={customTopic}
                  onChange={(e) => {
                    setCustomTopic(e.target.value);
                    setGeneratedQuestions([]);
                  }}
                  required={!materialRequired}
                />
              </div>

              {(buildMode === "manual" || buildMode === "oral") && !editingQuizId && builderStep === 1 && (
                <div className="space-y-2 max-w-xs rounded-lg border p-4 bg-muted/20">
                  <Label htmlFor="question-count-manual-setup">
                    {buildMode === "oral" ? "Number of oral tasks" : "Number of questions"}
                  </Label>
                  <Input
                    id="question-count-manual-setup"
                    type="number"
                    min={1}
                    max={100}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(clampQuestionCount(Number(e.target.value)))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Set how many {buildMode === "oral" ? "tasks" : "questions"} you plan to add. On the next step, create blank slots in one click.
                  </p>
                </div>
              )}

              {buildMode === "ai" && !editingQuizId && (
                <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="mr-2">Quiz mode</Label>
                    {(["quick", "standard", "comprehensive", "final_exam", "custom"] as const).map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        size="sm"
                        variant={quizMode === mode ? "default" : "outline"}
                        onClick={() => applyQuizMode(mode)}
                      >
                        {QUIZ_MODE_LABELS[mode]}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2 max-w-xs">
                    <Label htmlFor="question-count-setup">Number of questions</Label>
                    <Input
                      id="question-count-setup"
                      type="number"
                      min={1}
                      max={100}
                      value={questionCount}
                      onChange={(e) => {
                        const n = clampQuestionCount(Number(e.target.value));
                        setQuestionCount(n);
                        setQuizMode("custom");
                        setGeneratedQuestions([]);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Quiz mode presets suggest a starting count — you can change it anytime (1–100).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Bloom levels</Label>
                    <div className="flex flex-wrap gap-2">
                      {(aiStatus?.bloom_levels ?? ["remember", "understand", "apply", "analyze", "evaluate", "create"]).map((level) => (
                        <Button
                          key={level}
                          type="button"
                          size="sm"
                          variant={bloomLevels.includes(level) ? "default" : "outline"}
                          onClick={() => toggleBloom(level)}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Question types</Label>
                    <div className="flex flex-wrap gap-2">
                      {["multiple_choice", "true_false", "multiple_response", "fill_blank", "short_answer"].map((type) => (
                        <Button
                          key={type}
                          type="button"
                          size="sm"
                          variant={questionTypes.includes(type) ? "default" : "outline"}
                          onClick={() => toggleQuestionType(type)}
                        >
                          {type.replace(/_/g, " ")}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {selectedMaterialId && (
                    <Button type="button" variant="outline" size="sm" disabled={analyzing} onClick={() => void handleAnalyzeMaterial()}>
                      {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Analyze material (local indexing — no API cost)
                    </Button>
                  )}

                  {knowledgeMap && (
                    <div className="text-xs rounded-md border bg-background p-3 space-y-1">
                      <p className="font-medium">Knowledge map from uploaded material</p>
                      {Array.isArray((knowledgeMap as any).main_topics) && (
                        <p>Topics: {((knowledgeMap as any).main_topics as string[]).slice(0, 5).join(", ")}</p>
                      )}
                      {(knowledgeMap as any).difficulty_level && (
                        <p>Difficulty: {(knowledgeMap as any).difficulty_level}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

                </>
              )}

              {(builderStep === 2 || editingQuizId) && (
                <>
              {(buildMode === "oral" || manualQuestions.some((q) => q.type === "oral_listen")) && (
                <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-white to-white p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="font-semibold text-primary flex items-center gap-2 text-base">
                        <Mic className="h-5 w-5" />
                        {manualQuestions.length === 0 ? "Create your first oral task" : "Add another oral task"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-lg">
                        Choose reply type below — each click adds a new task. You mark learner answers manually (no AI).
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button
                        type="button"
                        className="bg-primary hover:bg-primary/90"
                        size="sm"
                        onClick={() => addOralTask(oralTaskWithAudioReply)}
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        + Oral reply (mic)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-primary/40"
                        onClick={() => addOralTask(oralTaskWithWrittenReply)}
                      >
                        <PenLine className="mr-2 h-4 w-4" />
                        + Written reply
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {buildMode === "ai" && !editingQuizId ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="space-y-2 w-full sm:w-40 shrink-0">
                      <Label htmlFor="question-count-generate">Number of questions</Label>
                      <Input
                        id="question-count-generate"
                        type="number"
                        min={1}
                        max={100}
                        value={questionCount}
                        onChange={(e) => {
                          const n = clampQuestionCount(Number(e.target.value));
                          setQuestionCount(n);
                          setQuizMode("custom");
                          setGeneratedQuestions([]);
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="sm:mb-0.5"
                      disabled={generating || !aiStatus?.configured || !topicData?.has_materials}
                      onClick={() => void handleGenerate()}
                    >
                      {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Generate {questionCount} questions with Gemini
                    </Button>
                  </div>
                  {generating && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating {questionCount} questions — using parallel batches for faster results when count &gt; 10…
                    </p>
                  )}
                </div>
              ) : buildMode === "manual" && !editingQuizId ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="space-y-2 w-full sm:w-40 shrink-0">
                      <Label htmlFor="question-count-manual">Number of questions</Label>
                      <Input
                        id="question-count-manual"
                        type="number"
                        min={1}
                        max={100}
                        value={questionCount}
                        onChange={(e) => setQuestionCount(clampQuestionCount(Number(e.target.value)))}
                      />
                    </div>
                    <Button type="button" variant="secondary" className="sm:mb-0.5" onClick={createManualQuestionSlots}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create {questionCount} question slots
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {manualQuestions.length} / {questionCount} question slot(s) added
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={addManualQuestion}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add one more
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setManualQuestions((p) => [...p, oralTaskWithAudioReply()])}
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      Add oral task
                    </Button>
                  </div>
                </div>
              ) : buildMode === "oral" && !editingQuizId ? (
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="question-count-oral">Number of oral tasks</Label>
                  <Input
                    id="question-count-oral"
                    type="number"
                    min={1}
                    max={100}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(clampQuestionCount(Number(e.target.value)))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {manualQuestions.length} / {questionCount} task(s) added
                  </p>
                </div>
              ) : editingQuizId ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={addManualQuestion}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add MCQ / True-False
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setManualQuestions((p) => [...p, oralTaskWithAudioReply()])}
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    Add oral task
                  </Button>
                </div>
              ) : null}

              {buildMode === "manual" && !editingQuizId && manualQuestions.length === 0 && (
                <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
                  Set the number of questions above, then click <strong>Create N question slots</strong> to add blank
                  MCQ/true-false forms — or add oral tasks one at a time.
                </p>
              )}

              {buildMode === "oral" && manualQuestions.length === 0 && (
                <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
                  Click <strong>+ Oral reply (mic)</strong> or <strong>+ Written reply</strong> above to add your first task.
                </p>
              )}

              {buildMode === "ai" && !editingQuizId && generatedQuestions.length > 0 && renderQuestionPreview(generatedQuestions)}
              {(editingQuizId || isManualBuild(buildMode)) && manualQuestions.length > 0 && renderQuestionPreview(manualQuestions, true)}

                </>
              )}

              {(builderStep === 3 || editingQuizId) && (
                <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(buildMode === "ai" || buildMode === "manual" || buildMode === "oral") && (
                  <div className="space-y-2">
                    <Label>
                      {buildMode === "oral" ? "Number of oral tasks" : "Number of questions"}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={questionCount}
                      onChange={(e) => {
                        setQuestionCount(clampQuestionCount(Number(e.target.value)));
                        if (buildMode === "ai") setQuizMode("custom");
                      }}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard" | "mixed")}
                    disabled={buildMode === "manual"}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Pass mark (%)</Label>
                  <Input
                    type="number"
                    min={40}
                    max={100}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value) || 70)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time limit
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={useTimeLimit} onCheckedChange={(v) => setUseTimeLimit(!!v)} id="use-time" />
                    <Input
                      type="number"
                      min={5}
                      max={240}
                      value={timeLimitMinutes}
                      disabled={!useTimeLimit}
                      onChange={(e) => setTimeLimitMinutes(Number(e.target.value) || 30)}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">min</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                <p className="text-sm font-medium">Anti-cheating & delivery</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={shuffleQuestions} onCheckedChange={(v) => setShuffleQuestions(!!v)} />
                    Shuffle question order
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={shuffleOptions} onCheckedChange={(v) => setShuffleOptions(!!v)} />
                    Shuffle MCQ options
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={detectTabSwitch} onCheckedChange={(v) => setDetectTabSwitch(!!v)} />
                    Monitor tab switching
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Question pool — deliver N from total (0 = all)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={deliverCount}
                      onChange={(e) => setDeliverCount(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max attempts per learner (0 = unlimited)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              {activeQuestions.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="quiz-title">Assessment title</Label>
                    <Input id="quiz-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiz-desc">Description (optional)</Label>
                    <Textarea id="quiz-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                  </div>
                </>
              )}

                </>
              )}

              {(builderStep === 4 || editingQuizId) && activeQuestions.length > 0 && (
                <>
                  <div className="rounded-lg border p-4 space-y-3 bg-primary/5">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      When should learners access this?
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex items-start gap-2 text-sm cursor-pointer rounded-md border p-3 bg-background">
                        <input
                          type="radio"
                          name="availability-mode"
                          checked={availabilityMode === "immediate"}
                          onChange={() => setAvailabilityMode("immediate")}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-medium block">Available immediately</span>
                          <span className="text-xs text-muted-foreground">Learners can start as soon as you publish.</span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 text-sm cursor-pointer rounded-md border p-3 bg-background">
                        <input
                          type="radio"
                          name="availability-mode"
                          checked={availabilityMode === "scheduled"}
                          onChange={() => setAvailabilityMode("scheduled")}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-medium block">Schedule for later</span>
                          <span className="text-xs text-muted-foreground">Opens at a set time; reminder email 1h 30m before.</span>
                        </span>
                      </label>
                    </div>
                    {availabilityMode === "scheduled" && (
                      <QuizScheduledOpenPicker
                        idPrefix="quiz-scheduled"
                        datetimeLocal={scheduledAtLocal}
                        timezone={scheduledTimezone}
                        onDatetimeChange={setScheduledAtLocal}
                        onTimezoneChange={setScheduledTimezone}
                      />
                    )}
                  </div>

                  <div className="rounded-lg border p-4 space-y-3 bg-primary/5">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Who can take this assessment?
                    </p>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={publishToAll} onCheckedChange={(v) => setPublishToAll(!!v)} />
                      All enrolled learners in this course
                    </label>
                    {!publishToAll && (
                      <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3 bg-background">
                        {enrolledForCourse.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No enrolled learners for this course yet.</p>
                        ) : (
                          enrolledForCourse.map((s) => (
                            <label key={s.student_id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={selectedStudentIds.includes(s.student_id)}
                                onCheckedChange={(checked) => {
                                  setSelectedStudentIds((prev) =>
                                    checked ? [...prev, s.student_id] : prev.filter((id) => id !== s.student_id)
                                  );
                                }}
                              />
                              {(s.name ?? s.email ?? `Student #${s.student_id}`)}
                            </label>
                          ))
                        )}
                      </div>
                    )}
                    {!publishToAll && selectedStudentIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">{selectedStudentIds.length} learner(s) selected</p>
                    )}
                  </div>

                  {!editingQuizId && (
                    <Button type="button" variant="outline" onClick={() => setBuilderStep(3)}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back to settings
                    </Button>
                  )}
                </>
              )}

              {activeQuestions.length > 0 && (builderStep === 4 || editingQuizId) && (
                <div className="flex flex-wrap gap-2">
                  {editingQuizId ? (
                    <>
                      <Button type="button" disabled={saving} onClick={handleSaveChanges}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
                        Save changes
                      </Button>
                      <Button type="button" variant="secondary" disabled={saving} onClick={handlePublish}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                        {editingQuizStatus === "published" ? "Re-publish to learners" : "Publish to learners"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" variant="outline" disabled={saving} onClick={handleSaveDraft}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save draft
                      </Button>
                      <Button type="button" disabled={saving} onClick={handlePublish}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Publish now
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      resetBuilder();
                      setShowForm(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {showForm &&
        !editingQuizId &&
        builderStep >= 1 &&
        builderStep <= 3 &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-8px_24px_rgba(0,0,0,0.08)] px-4 py-3 sm:px-6 lg:left-64"
            role="navigation"
            aria-label="Assessment builder steps"
          >
            <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3">
              {builderStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBuilderStep((builderStep - 1) as BuilderStep)}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div className="hidden w-[88px] sm:block" aria-hidden />
              )}
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                Step {builderStep} of 4 — {BUILDER_STEPS.find((s) => s.id === builderStep)?.label}
              </p>
              {builderStep === 1 && (
                <Button
                  type="button"
                  disabled={coursesLoading || courses.length === 0}
                  onClick={proceedFromSetup}
                >
                  {buildMode === "oral" ? "Continue to oral tasks" : "Next: Questions"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {builderStep === 2 && (
                <Button
                  type="button"
                  disabled={activeQuestions.length === 0}
                  onClick={() => setBuilderStep(3)}
                >
                  Next: Settings
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {builderStep === 3 && (
                <Button
                  type="button"
                  disabled={activeQuestions.length === 0}
                  onClick={() => setBuilderStep(4)}
                >
                  Next: Who can access
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>,
          document.body,
        )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Your assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pageLoading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : quizzes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessments yet. Click New assessment to create one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kind</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizzes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {(q as InstructorQuiz).assessment_kind ?? "quiz"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {q.title}
                      {q.ai_generated && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          AI
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{q.course_title}</TableCell>
                    <TableCell>{q.topic ?? "—"}</TableCell>
                    <TableCell>{q.question_count ?? 0}</TableCell>
                    <TableCell>{q.time_limit_minutes ? `${q.time_limit_minutes} min` : "—"}</TableCell>
                    <TableCell>
                      {q.status === "published" &&
                      q.availability_mode === "scheduled" &&
                      q.scheduled_at &&
                      q.is_quiz_open === false ? (
                        <Badge variant="secondary">Scheduled</Badge>
                      ) : (
                        <Badge variant={q.status === "published" ? "default" : "outline"}>
                          {q.status === "published" ? "Published" : "Draft"}
                        </Badge>
                      )}
                      {q.scheduled_at && q.availability_mode === "scheduled" && (
                        <p className="text-[10px] text-muted-foreground mt-1">{formatScheduledLabel(q.scheduled_at)}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 justify-end">
                        <Button
                          size="sm"
                          variant={reviewQuizId === q.id ? "default" : "outline"}
                          onClick={() => {
                            setReviewQuizId(reviewQuizId === q.id ? null : q.id);
                            setAnalyticsQuizId(null);
                            setAnalyticsData(null);
                          }}
                        >
                          <UserCheck className="mr-1 h-3 w-3" />
                          Mark oral
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loadingAnalytics && analyticsQuizId === q.id}
                          onClick={() => {
                            setReviewQuizId(null);
                            void openQuizAnalytics(q.id);
                          }}
                        >
                          <BarChart3 className="mr-1 h-3 w-3" />
                          Analytics
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loadingEdit}
                          onClick={() => void openEditQuiz(q)}
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        {q.status === "published" ? (
                          <Button size="sm" variant="secondary" onClick={() => openPublishDialog(q, true)}>
                            <Users className="mr-1 h-3 w-3" />
                            Re-publish
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => openPublishDialog(q, false)}>
                            Publish
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {reviewQuizId && email && (
            <QuizOralReviewPanel
              quizId={reviewQuizId}
              courseId={quizzes.find((q) => q.id === reviewQuizId)?.course_id ?? Number(courseId)}
              instructorEmail={email}
              onClose={() => setReviewQuizId(null)}
            />
          )}

          {analyticsQuizId && analyticsData && (
            <div className="mt-4 rounded-lg border p-4 space-y-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="font-medium">Analytics — {analyticsData.quiz_title}</p>
                <Button size="sm" variant="ghost" onClick={() => { setAnalyticsQuizId(null); setAnalyticsData(null); }}>
                  Close
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-4 text-sm">
                <div><span className="text-muted-foreground">Attempts</span><p className="font-semibold">{analyticsData.attempt_count}</p></div>
                <div><span className="text-muted-foreground">Avg score</span><p className="font-semibold">{analyticsData.average_score}%</p></div>
                <div><span className="text-muted-foreground">Pass rate</span><p className="font-semibold">{analyticsData.pass_rate}%</p></div>
                <div><span className="text-muted-foreground">Tab switches</span><p className="font-semibold">{analyticsData.integrity_summary?.avg_tab_switches ?? 0} avg</p></div>
              </div>
              {analyticsData.ai_insights?.learning_gaps?.length ? (
                <div className="text-sm">
                  <p className="font-medium">Learning gaps</p>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {analyticsData.ai_insights.learning_gaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {analyticsData.question_analytics?.length ? (
                <div className="text-xs overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Success</TableHead>
                        <TableHead>Fail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsData.question_analytics.slice(0, 8).map((row) => (
                        <TableRow key={row.question_id}>
                          <TableCell>{row.question}</TableCell>
                          <TableCell>{row.success_rate}%</TableCell>
                          <TableCell>{row.failure_rate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </div>
          )}

          {publishingQuizId && (
            <div className="mt-4 rounded-lg border p-4 space-y-3 max-w-md">
              <p className="font-medium text-sm">
                {isRepublishDialog ? "Re-publish quiz to learners" : "Publish quiz to learners"}
              </p>
              <p className="text-xs text-muted-foreground">
                Choose all enrolled learners or select specific students who can take this quiz.
              </p>
              <div className="space-y-2 rounded-md border p-3 bg-muted/20">
                <p className="text-xs font-medium flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Availability
                </p>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="publish-availability"
                    checked={publishAvailabilityMode === "immediate"}
                    onChange={() => setPublishAvailabilityMode("immediate")}
                  />
                  Available immediately
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="publish-availability"
                    checked={publishAvailabilityMode === "scheduled"}
                    onChange={() => setPublishAvailabilityMode("scheduled")}
                  />
                  Schedule for later (reminder 1h 30m before)
                </label>
                {publishAvailabilityMode === "scheduled" && (
                  <QuizScheduledOpenPicker
                    idPrefix="publish-scheduled"
                    datetimeLocal={publishScheduledAtLocal}
                    timezone={publishScheduledTimezone}
                    onDatetimeChange={setPublishScheduledAtLocal}
                    onTimezoneChange={setPublishScheduledTimezone}
                  />
                )}
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={publishDraftToAll} onCheckedChange={(v) => setPublishDraftToAll(!!v)} />
                All enrolled learners
              </label>
              {!publishDraftToAll && (
                <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-2">
                  {enrolledForPublishingQuiz.map((s) => (
                    <label key={s.student_id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={publishDraftStudentIds.includes(s.student_id)}
                        onCheckedChange={(checked) => {
                          setPublishDraftStudentIds((prev) =>
                            checked ? [...prev, s.student_id] : prev.filter((id) => id !== s.student_id)
                          );
                        }}
                      />
                      {s.name ?? s.email}
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" disabled={saving} onClick={() => void handlePublishDraft(publishingQuizId)}>
                  {isRepublishDialog ? "Confirm re-publish" : "Confirm publish"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPublishingQuizId(null);
                    setIsRepublishDialog(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstructorQuizzes;
