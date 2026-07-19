import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { useToast } from "@/components/ui/use-toast";

import {
  BookOpen,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Lock,
  PlayCircle,
  Video,
  ClipboardList,
  CheckCircle2,
  Clock,
  Radio,
} from "lucide-react";

import {

  getCourses,

  getLearnerCourseMaterials,

  getStudentCourseEnrollments,

  type LearnerCourseMaterial,

  type LearnerRecording,

} from "@/api/axios";

import { LearnerUpafaCourseGuide, buildUpafaNavSections, LearnerUpafaCourseNav } from "@/components/courses/LearnerUpafaCourseGuide";

import { LiveClassRecordingCard } from "@/components/materials/LiveClassRecordingCard";

import { MaterialPreviewDialog, type MaterialPreviewItem } from "@/components/materials/MaterialPreviewDialog";
import { MaterialFilesBrowser } from "@/components/materials/MaterialFilesBrowser";
import { buildMaterialPreviewItem, isFileMaterial } from "@/lib/materialFileUtils";

import { formatClassTime, openCourseMaterials } from "@/lib/learnerNavigation";

import { getLiveSessionState } from "@/lib/liveClassSession";

import { learnerEmbedRoomPath, materialEmbedRoom, openMeetingInNewTab } from "@/lib/zoomEmbedRoutes";

import { getStudentId } from "@/lib/dashboardUser";

import { DEFAULT_HOW_TO_USE, type CourseDetailsFields } from "@/lib/courseDetails";

import { hasCourseAccess, isPendingEnrollmentApproval, isEnrollmentRejected } from "@/lib/enrollmentStatus";



type EnrolledCourse = {
  id: number;
  title?: string | null;
  course_code?: string | null;
  status?: string;
};

type CourseOverview = CourseDetailsFields & {
  title?: string;
  description?: string | null;
  requirements?: string | null;
  duration?: string | null;
  price?: number | null;
  payment_paid?: boolean;
  has_access?: boolean;
  enrollment_status?: string;
};

function MaterialsLockedNotice({ pending }: { pending?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <Lock className="h-10 w-10 text-slate-400 mx-auto mb-3" />
      <p className="font-medium text-slate-900 mb-1">
        {pending ? "Learning materials unlock after approval" : "Materials not available"}
      </p>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {pending
          ? "You can read the full course guide below while your application is reviewed. Videos, files, and live classes will appear here once an administrator or instructor approves your enrollment."
          : "You do not have access to learning materials for this course yet."}
      </p>
    </div>
  );
}



const kindIcon = (kind: string) => {

  if (kind === "video") return PlayCircle;

  if (kind === "zoom") return Radio;

  if (kind === "recording") return Video;

  if (kind === "quiz" || kind === "assessment") return ClipboardList;

  return FileText;

};



const kindBadgeClass = (kind: string) => {

  if (kind === "video") return "bg-violet-100 text-violet-800 border-violet-200";

  if (kind === "zoom") return "bg-sky-100 text-sky-800 border-sky-200";

  if (kind === "recording") return "bg-emerald-100 text-emerald-800 border-emerald-200";

  if (kind === "document") return "bg-amber-100 text-amber-900 border-amber-200";

  return "bg-muted text-foreground";

};



const MaterialCard = ({

  item,

  action,

}: {

  item: LearnerCourseMaterial;

  action: ReactNode;

}) => {

  const Icon = kindIcon(item.kind);

  return (

    <div className="group rounded-2xl border border-border/80 bg-gradient-to-br from-white to-muted/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition hover:border-primary/30 hover:shadow-md">

      <div className="flex items-start gap-3 flex-1 min-w-0">

        <div className="rounded-xl bg-primary/10 p-3 shrink-0 group-hover:bg-primary/15 transition">

          <Icon className="h-5 w-5 text-primary" />

        </div>

        <div className="min-w-0 space-y-1">

          <div className="flex flex-wrap items-center gap-2">

            <p className="font-semibold leading-snug">{item.title}</p>

            <Badge variant="outline" className={kindBadgeClass(item.kind)}>

              {item.kind === "zoom" ? "Live class" : item.kind}

            </Badge>

          </div>

          {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}

          {item.has_interactive_quiz && (
            <p className="text-xs text-muted-foreground">
              {item.question_count ?? 0} question{(item.question_count ?? 0) === 1 ? "" : "s"}
              {item.time_limit_minutes ? ` · ${item.time_limit_minutes} min timed quiz` : ""}
              {item.passing_score ? ` · Pass ${item.passing_score}%` : ""}
              {item.latest_attempt?.marked_at ? (
                <>
                  {" · "}
                  <span className={item.latest_attempt.passed ? "text-green-700 font-medium" : "text-amber-700 font-medium"}>
                    {item.latest_attempt.score}/{item.latest_attempt.max_score} ({item.latest_attempt.percentage}%)
                    {item.latest_attempt.passed ? " · Passed" : " · Not passed"}
                  </span>
                </>
              ) : item.latest_attempt?.pending_review ? (
                <span className="text-amber-700 font-medium"> · Awaiting instructor review</span>
              ) : null}
            </p>
          )}

          {item.scheduled_at && (

            <p className="text-xs text-muted-foreground">{formatClassTime(item.scheduled_at)}</p>

          )}

        </div>

      </div>

      <div className="shrink-0 flex flex-wrap gap-2 justify-end">{action}</div>

    </div>

  );

};



const LiveSessionActions = ({

  item,

  courseId,

  onOpenRecordings,

}: {

  item: LearnerCourseMaterial;

  courseId: number;

  onOpenRecordings: (courseId: number) => void;

}) => {

  const navigate = useNavigate();

  const state = getLiveSessionState(item.scheduled_at, item.duration_minutes ?? 60, item);

  const sessionRecordings = item.recordings ?? [];

  const hasRecording = sessionRecordings.some((rec) => (rec.files ?? []).length > 0);



  if (state.can_join && (item.embed_room_path || item.id)) {

    return (

      <Button
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-500"
        onClick={() =>
          openMeetingInNewTab(
            learnerEmbedRoomPath(
              item.embed_room_path ||
                materialEmbedRoom(item.id, 0, getStudentId() || undefined),
            ),
            { launchTitle: item.title ?? "Live class", isHost: false },
          )
        }
      >

          <Radio className="mr-2 h-4 w-4" />

          Join in app

      </Button>

    );

  }



  if (state.is_past) {

    if (hasRecording) {

      return (

        <Button size="sm" variant="outline" onClick={() => onOpenRecordings(courseId)}>

          <PlayCircle className="mr-2 h-4 w-4" />

          Watch recording

        </Button>

      );

    }

    return <Badge variant="outline">Recording processing</Badge>;

  }



  return (

    <Button disabled size="sm" variant="secondary" className="cursor-not-allowed">

      Join not available yet

    </Button>

  );

};



const LearnerCourseMaterials = () => {

  const { toast } = useToast();

  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  const urlCourseId = Number(searchParams.get("courseId") || localStorage.getItem("parrot_selected_course_id"));

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(

    urlCourseId && !Number.isNaN(urlCourseId) ? urlCourseId : null

  );

  const tabParam = searchParams.get("tab");
  const defaultTab =
    tabParam === "recordings"
      ? "recordings"
      : tabParam === "overview"
        ? "overview"
        : tabParam === "videos" || tabParam === "files"
          ? tabParam
          : "overview";

  const [loading, setLoading] = useState(true);

  const [coursesLoading, setCoursesLoading] = useState(true);

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);

  const [courseTitle, setCourseTitle] = useState("");

  const [courseOverview, setCourseOverview] = useState<CourseOverview | null>(null);
  const [hasMaterialsAccess, setHasMaterialsAccess] = useState(false);
  const [activeSection, setActiveSection] = useState(
    defaultTab === "overview" ? "general-information" : defaultTab
  );

  const [materials, setMaterials] = useState<LearnerCourseMaterial[]>([]);

  const [previewItem, setPreviewItem] = useState<MaterialPreviewItem | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);



  useEffect(() => {

    const studentId = Number(localStorage.getItem("parrot_student_id"));

    if (!studentId || Number.isNaN(studentId)) {

      setCoursesLoading(false);

      return;

    }



    Promise.all([getCourses(), getStudentCourseEnrollments(studentId)])

      .then(([allCourses, enrollmentRes]) => {

        const statuses: Record<number, string> = {};

        for (const e of enrollmentRes.enrollments || []) {
          if (e?.course_id) statuses[e.course_id] = e.status || "enrolled";
        }

        const applied = (Array.isArray(allCourses) ? allCourses : [])
          .filter((c: any) => {
            if (!c?.id) return false;
            const status = statuses[c.id];
            return status && !isEnrollmentRejected(status);
          })
          .map((c: any) => ({
            id: c.id,
            title: c.title,
            course_code: c.course_code,
            status: statuses[c.id],
          }));

        setEnrolledCourses(applied);

        if (!selectedCourseId && applied.length > 0) {

          const stored = Number(localStorage.getItem("parrot_selected_course_id"));

          const pick = applied.find((c) => c.id === stored)?.id ?? applied[0].id;

          setSelectedCourseId(pick);

          setSearchParams({ courseId: String(pick) }, { replace: true });

        }

      })

      .catch(() => {

        toast({

          variant: "destructive",

          title: "Error",

          description: "Unable to load your enrolled courses.",

        });

      })

      .finally(() => setCoursesLoading(false));

  }, []);



  useEffect(() => {

    const studentId = Number(localStorage.getItem("parrot_student_id"));

    if (!studentId || !selectedCourseId) {

      setLoading(false);

      setMaterials([]);

      setCourseOverview(null);

      return;

    }



    localStorage.setItem("parrot_selected_course_id", String(selectedCourseId));

    setLoading(true);



    getLearnerCourseMaterials(selectedCourseId, studentId)

      .then((res) => {

        setCourseTitle(res.course?.title ?? "Course materials");

        setCourseOverview(
          res.course
            ? {
                ...res.course,
                how_to_use: res.course.how_to_use?.length ? res.course.how_to_use : DEFAULT_HOW_TO_USE,
              }
            : null
        );

        setHasMaterialsAccess(Boolean((res.course as CourseOverview)?.has_access ?? hasCourseAccess(res.course?.enrollment_status)));
        setMaterials(res.materials ?? []);

      })

      .catch((err: any) => {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.message || err?.message || "Unable to load course materials.";
        const zoomUnavailable =
          /zoom|cURL error|Connection timed out|Failed to connect/i.test(String(message));

        if (status !== 403) {
          setMaterials([]);
        } else {
          setMaterials([]);
          setCourseOverview(null);
          setHasMaterialsAccess(false);
        }

        toast({
          variant: "destructive",
          title: status === 403 ? "Access denied" : "Could not load course",
          description:
            status === 403
              ? message
              : zoomUnavailable
                ? "Your course guide is still available. Live class status could not be refreshed — try again in a moment."
                : message,
        });
      })

      .finally(() => setLoading(false));

  }, [selectedCourseId, toast]);



  const selectCourse = (courseId: number) => {
    setSelectedCourseId(courseId);
    setActiveSection("general-information");
    setSearchParams({ courseId: String(courseId), tab: "overview" }, { replace: true });
  };

  const handleSelectSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const guideIds = ["general", "general-information", "important-information", "attendance", "assessment"];
    if (guideIds.includes(sectionId)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", "overview");
          return next;
        },
        { replace: true }
      );
      requestAnimationFrame(() => {
        document.getElementById(`upafa-section-${sectionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else if (sectionId === "materials") {
      setActiveSection("materials");
    } else {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", sectionId);
          return next;
        },
        { replace: true }
      );
    }
  };

  const isGuideSection = [
    "general",
    "general-information",
    "important-information",
    "attendance",
    "assessment",
    "guide",
    "overview",
  ].includes(activeSection);

  const navSections = courseOverview
    ? buildUpafaNavSections(courseOverview, hasMaterialsAccess)
    : buildUpafaNavSections({}, hasMaterialsAccess);



  const openResourcePreview = (item: LearnerCourseMaterial) => {
    if (!selectedCourseId) return;
    const studentId = Number(localStorage.getItem("parrot_student_id"));
    const preview = buildMaterialPreviewItem(
      item,
      selectedCourseId,
      studentId && !Number.isNaN(studentId) ? studentId : undefined
    );
    if (!preview) return;
    setPreviewItem(preview);
    setPreviewOpen(true);
  };



  const grouped = useMemo(() => {

    const recordingItems: Array<{ key: string; recording: LearnerRecording; sessionTitle?: string }> =

      materials.flatMap((material) => {

        if (material.kind !== "zoom" || !material.recordings?.length) return [];

        return material.recordings.map((recording, index) => ({

          key: `${material.id}-${recording.uuid ?? recording.id ?? index}`,

          recording,

          sessionTitle: material.title,

        }));

      });



    return {

      files: materials.filter(isFileMaterial),

      videos: materials.filter((m) => m.kind === "video" && !isFileMaterial(m)),

      documents: materials.filter((m) => m.kind === "document" && !isFileMaterial(m)),

      quizzes: materials.filter((m) => ["quiz", "assessment"].includes(m.kind)),

      live: materials.filter((m) => m.kind === "zoom"),

      recordings: recordingItems,

      other: materials.filter(
        (m) => !["video", "document", "quiz", "assessment", "zoom", "image", "audio"].includes(m.kind) && !isFileMaterial(m)
      ),

    };

  }, [materials]);



  if (coursesLoading) {

    return (

      <div className="flex justify-center py-20">

        <Loader2 className="h-10 w-10 animate-spin text-primary" />

      </div>

    );

  }



  if (enrolledCourses.length === 0) {

    return (

      <Card className="border-dashed">

        <CardContent className="py-12 text-center">

          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />

          <p className="text-muted-foreground mb-4">Apply for a course to view your course guide and materials here.</p>

          <Button onClick={() => navigate("/dashboard/my-courses")}>My courses</Button>

        </CardContent>

      </Card>

    );

  }



  const pendingApproval = isPendingEnrollmentApproval(courseOverview?.enrollment_status);

  return (

    <div className="space-y-6">

      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <button type="button" onClick={() => navigate("/dashboard/learner")} className="hover:text-foreground">
          Dashboard
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <button type="button" onClick={() => navigate("/dashboard/my-courses")} className="hover:text-foreground">
          My courses
        </button>
        {courseOverview?.course_code && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium font-mono">{courseOverview.course_code}</span>
          </>
        )}
      </nav>

      {pendingApproval && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Your application is <strong>pending approval</strong>. You can read the full course guide below. Learning
          materials unlock once an administrator or instructor approves your enrollment.
        </div>
      )}

      {courseOverview && !pendingApproval && courseOverview.payment_paid === false && (courseOverview.price ?? 0) > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You have full access to this course. Payment of{" "}
          <strong>${Number(courseOverview.price).toFixed(2)}</strong> is still outstanding — your instructor or
          administrator will send a payment link when ready.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        <div className="lg:col-span-3 lg:sticky lg:top-4">
          <LearnerUpafaCourseNav
            courses={enrolledCourses}
            selectedCourseId={selectedCourseId}
            onSelectCourse={selectCourse}
            sections={navSections}
            activeSection={activeSection}
            onSelectSection={handleSelectSection}
            onNavigateDashboard={() => navigate("/dashboard/learner")}
            onNavigateMyCourses={() => navigate("/dashboard/my-courses")}
          />
        </div>

        <div className="lg:col-span-9 min-w-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {(isGuideSection || activeSection === "materials") && courseOverview && (
                <LearnerUpafaCourseGuide
                  course={courseOverview}
                  activeSection={activeSection}
                  onSelectSection={handleSelectSection}
                />
              )}

              {activeSection === "materials" && !hasMaterialsAccess && (
                <MaterialsLockedNotice pending={pendingApproval} />
              )}

              {!isGuideSection && activeSection !== "materials" && (
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2 mb-4 border-b pb-3">
                    <h2 className="text-lg font-semibold text-slate-900 capitalize">
                      {activeSection.replace(/-/g, " ")}
                    </h2>
                    <Button variant="ghost" size="sm" className="text-[#0f6cbf]" onClick={() => handleSelectSection("general-information")}>
                      Back to course guide
                    </Button>
                  </div>

                  {!hasMaterialsAccess ? (
                    <MaterialsLockedNotice pending={pendingApproval} />
                  ) : (
                    <>
                      {activeSection === "files" && selectedCourseId && (
                        <MaterialFilesBrowser
                          courseId={selectedCourseId}
                          materials={grouped.files}
                          loading={loading}
                          readOnly
                          studentId={Number(localStorage.getItem("parrot_student_id")) || undefined}
                          onDelete={async () => {}}
                        />
                      )}

                      {activeSection === "videos" && (
                        <div className="space-y-3">
                          {grouped.videos.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">No video lessons yet.</p>
                          ) : (
                            grouped.videos.map((item) => (
                              <MaterialCard
                                key={item.id}
                                item={item}
                                action={
                                  item.resource_url || item.storage === "pcloud" ? (
                                    <>
                                      <Button size="sm" variant="outline" onClick={() => openResourcePreview(item)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Preview
                                      </Button>
                                      <Button asChild size="sm">
                                        <a href={item.resource_url} target="_blank" rel="noopener noreferrer">
                                          <PlayCircle className="mr-2 h-4 w-4" />
                                          Watch
                                        </a>
                                      </Button>
                                    </>
                                  ) : (
                                    <Badge variant="outline">Coming soon</Badge>
                                  )
                                }
                              />
                            ))
                          )}
                        </div>
                      )}

                      {activeSection === "documents" && (
                        <div className="space-y-3">
                          {grouped.documents.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">No downloadable resources yet.</p>
                          ) : (
                            grouped.documents.map((item) => (
                              <MaterialCard
                                key={item.id}
                                item={item}
                                action={
                                  item.resource_url || item.storage === "pcloud" ? (
                                    <>
                                      <Button size="sm" variant="outline" onClick={() => openResourcePreview(item)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Preview
                                      </Button>
                                      <Button asChild size="sm" variant="outline">
                                        <a href={item.resource_url} target="_blank" rel="noopener noreferrer">
                                          <Download className="mr-2 h-4 w-4" />
                                          Download
                                        </a>
                                      </Button>
                                    </>
                                  ) : (
                                    <Badge variant="outline">Unavailable</Badge>
                                  )
                                }
                              />
                            ))
                          )}
                        </div>
                      )}

                      {activeSection === "quizzes" && (
                        <div className="space-y-3">
                          {grouped.quizzes.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">No quizzes yet.</p>
                          ) : (
                            grouped.quizzes.map((item) => (
                              <MaterialCard
                                key={item.id}
                                item={item}
                                action={
                                  item.availability_mode === "scheduled" &&
                                  item.scheduled_at &&
                                  item.is_quiz_open === false ? (
                                    <Button size="sm" variant="outline" disabled>
                                      <Clock className="mr-2 h-4 w-4" />
                                      Opens {formatClassTime(item.scheduled_at)}
                                    </Button>
                                  ) : item.has_interactive_quiz ? (
                                    item.latest_attempt?.marked_at ? (
                                      <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/learner/quiz/${item.id}`)}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        View result
                                      </Button>
                                    ) : item.latest_attempt?.pending_review ? (
                                      <Button size="sm" variant="secondary" onClick={() => navigate(`/dashboard/learner/quiz/${item.id}`)}>
                                        <Clock className="mr-2 h-4 w-4" />
                                        Awaiting review
                                      </Button>
                                    ) : (
                                      <Button size="sm" onClick={() => navigate(`/dashboard/learner/quiz/${item.id}`)}>
                                        <ClipboardList className="mr-2 h-4 w-4" />
                                        Start quiz
                                      </Button>
                                    )
                                  ) : item.resource_url || item.storage === "pcloud" ? (
                                    <Button asChild size="sm">
                                      <a href={item.resource_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Open link
                                      </a>
                                    </Button>
                                  ) : (
                                    <Badge variant="outline">No questions yet</Badge>
                                  )
                                }
                              />
                            ))
                          )}
                        </div>
                      )}

                      {activeSection === "live" && (
                        <div className="space-y-3">
                          {grouped.live.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">No live classes scheduled yet.</p>
                          ) : (
                            grouped.live.map((item) => (
                              <MaterialCard
                                key={item.id}
                                item={item}
                                action={
                                  <LiveSessionActions
                                    item={item}
                                    courseId={selectedCourseId!}
                                    onOpenRecordings={(id) => openCourseMaterials(navigate, id, "recordings")}
                                  />
                                }
                              />
                            ))
                          )}
                        </div>
                      )}

                      {activeSection === "recordings" && (
                        <div className="space-y-4">
                          {grouped.recordings.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">
                              No class recordings yet. They appear here after live sessions with cloud recording enabled.
                            </p>
                          ) : (
                            grouped.recordings.map(({ key, recording, sessionTitle }) => (
                              <LiveClassRecordingCard
                                key={key}
                                recording={recording}
                                sessionTitle={sessionTitle}
                              />
                            ))
                          )}
                        </div>
                      )}

                      {activeSection === "other" && grouped.other.length > 0 && (
                        <div className="space-y-3">
                          {grouped.other.map((item) => (
                            <MaterialCard
                              key={item.id}
                              item={item}
                              action={
                                item.resource_url || item.storage === "pcloud" ? (
                                  <Button asChild size="sm" variant="outline">
                                    <a href={item.resource_url} target="_blank" rel="noopener noreferrer">
                                      Open
                                    </a>
                                  </Button>
                                ) : (
                                  <Badge variant="outline">Unavailable</Badge>
                                )
                              }
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {!courseOverview && !loading && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Course guide details will appear here once your instructor adds them.
                </p>
              )}
            </div>
          )}
        </div>
      </div>



      <MaterialPreviewDialog item={previewItem} open={previewOpen} onOpenChange={setPreviewOpen} />

    </div>

  );

};



export default LearnerCourseMaterials;


