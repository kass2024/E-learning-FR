import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  enrollInCourse,
  getLearnerDashboard,
  submitStudyShiftChangeRequest,
  type LearnerDashboardData,
} from "@/api/axios";
import {
  canPayForEnrollment,
  getEnrollmentStatusForCourse,
  hasCourseAccess,
  isEnrollmentPaid,
  isEnrollmentRejected,
  isPendingEnrollmentApproval,
} from "@/lib/enrollmentStatus";
import { formatClassTime, openCourseMaterials } from "@/lib/learnerNavigation";
import { learnerEmbedRoomPath, materialEmbedRoom, openMeetingInNewTab } from "@/lib/zoomEmbedRoutes";
import { getLiveSessionState } from "@/lib/liveClassSession";
import { AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPageHeader";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { dashboardCacheKey, getStudentId } from "@/lib/dashboardUser";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import {
  BookOpen,
  Award,
  Calendar,
  Loader2,
  RefreshCw,
  ArrowRight,
  Play,
  Clock,
} from "lucide-react";
import { formatEnrollmentShiftsSummary } from "@/lib/studyShiftUtils";
import { LearnerShiftChangeDialog } from "@/components/study-shifts/LearnerShiftChangeDialog";

const LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "elementary", label: "Elementary" },
  { id: "intermediate", label: "Intermediate" },
  { id: "upper_intermediate", label: "Upper Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "upper_advanced", label: "Proficient" },
];

function getCourseImage(course: { title?: string | null }) {
  const lower = (course?.title ?? "Course").toLowerCase();
  if (lower.includes("ai mastery") || lower.includes("xander ai")) {
    return "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&auto=format&fit=crop";
  }
  if (lower.includes("french") || lower.includes("tcf") || lower.includes("tef")) {
    return "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&fit=crop";
  }
  if (lower.includes("english") || lower.includes("ielts") || lower.includes("toefl")) {
    return "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop";
  }
  if (lower.includes("internship") || lower.includes("embed")) {
    return "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop";
  }
  return "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop";
}

const LearnerDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const studentId = getStudentId() ?? 0;
  const {
    data,
    loading,
    refreshing,
    reload: loadDashboard,
  } = useDashboardQuery<LearnerDashboardData>(
    dashboardCacheKey("learner-dashboard", studentId),
    () => getLearnerDashboard(studentId),
    { enabled: studentId > 0 }
  );

  useEffect(() => {
    const state = location.state as
      | { paymentSuccess?: boolean; paymentTitle?: string; paymentMessage?: string }
      | null;
    if (!state?.paymentSuccess) return;
    toast({
      title: state.paymentTitle || "Course activated",
      description: state.paymentMessage || "Your payment was confirmed. You can continue learning.",
    });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, toast]);
  const [busyCourseId, setBusyCourseId] = useState<number | null>(null);
  const [courseLevels, setCourseLevels] = useState<Record<number, string>>({});
  const [shiftChangeCourse, setShiftChangeCourse] = useState<
    LearnerDashboardData["enrolled_courses"][number] | null
  >(null);
  const [submittingShiftRequest, setSubmittingShiftRequest] = useState(false);

  const handleSubmitShiftChange = async (shiftIds: number[], reason?: string) => {
    if (!shiftChangeCourse || !studentId) return;
    setSubmittingShiftRequest(true);
    try {
      await submitStudyShiftChangeRequest({
        student_id: studentId,
        course_id: shiftChangeCourse.id,
        study_shift_ids: shiftIds,
        reason,
      });
      toast({
        title: "Request submitted",
        description: "Your instructor will review the new study times.",
      });
      setShiftChangeCourse(null);
      await loadDashboard();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not submit request",
        description: error?.response?.data?.message || "Please try again.",
      });
    } finally {
      setSubmittingShiftRequest(false);
    }
  };

  const userName =
    (typeof window !== "undefined" && localStorage.getItem("parrot_user_name")) || data?.student?.name || "Learner";

  const handleCourseAction = async (courseId: number, courseTitle?: string) => {
    const studentId = Number(localStorage.getItem("parrot_student_id"));
    if (!studentId || Number.isNaN(studentId)) {
      toast({ variant: "destructive", title: "Not logged in", description: "Please log in as a learner." });
      return;
    }

    const status = getEnrollmentStatusForCourse(enrollmentStatuses, courseId);

    if (hasCourseAccess(status)) {
      openCourseMaterials(navigate, courseId, "overview");
      return;
    }

    // Pending or approved unpaid: allow payment before (or without) manual approval.
    if (canPayForEnrollment(status)) {
      localStorage.setItem("parrot_selected_course_id", String(courseId));
      navigate("/dashboard/learner/payment");
      return;
    }

    if (isEnrollmentRejected(status)) {
      toast({ variant: "destructive", title: "Application rejected", description: "Contact support if you need help." });
      return;
    }

    const isAICourse = (courseTitle ?? "").toLowerCase().includes("ai mastery");
    if (!isAICourse && !courseLevels[courseId]) {
      toast({
        variant: "destructive",
        title: "Level required",
        description: "Select your language level before applying.",
      });
      return;
    }

    setBusyCourseId(courseId);
    try {
      await enrollInCourse(courseId, studentId, courseLevels[courseId]);
      toast({
        title: "Application submitted",
        description:
          "You can pay now with Mobile Money or a promo code (access unlocks automatically). Payment proof needs admin confirmation.",
        duration: 6000,
      });
      await loadDashboard();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.response?.data?.message || "Could not apply for course.",
      });
    } finally {
      setBusyCourseId(null);
    }
  };

  const stats = data?.stats;
  const enrollmentStatuses = (data?.enrollment_statuses ?? {}) as Record<string, string>;

  if (loading && !data) {
    return (
      <div className="space-y-8">
        <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
        <TableSkeleton rows={4} cols={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Learner"
        title={`Welcome back, ${userName}!`}
        description="Track your courses, live classes, progress, and certificates."
      >
        <Button
          onClick={() => void loadDashboard()}
          disabled={refreshing}
          className="bg-[#FCC400] hover:bg-[#E79A4D] text-slate-900 font-semibold"
        >
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </AdminPageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Courses enrolled" value={stats?.courses_enrolled ?? 0} hint={`${stats?.active_courses ?? 0} active`} />
        <AdminStatCard label="Hours learned" value={stats?.hours_learned ?? 0} />
        <AdminStatCard label="Certificates" value={stats?.certificates ?? 0} hint="Digital + QR verified" />
        <AdminStatCard label="Streak days" value={stats?.streak_days ?? 0} />
      </div>

      {/* Enrolled courses with progress */}
      {(data?.enrolled_courses ?? []).length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My learning progress</CardTitle>
              <CardDescription>Track progress across your enrolled courses</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/my-courses")}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data?.enrolled_courses ?? []).slice(0, 4).map((course) => (
              <div key={course.id} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{course.title}</p>
                      {course.course_code && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {course.course_code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {course.videos_count ?? 0} videos · {course.documents_count ?? 0} resources · {course.quizzes_count ?? 0} quizzes
                    </p>
                    {(course.study_shifts ?? []).length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatEnrollmentShiftsSummary(course.study_shifts ?? [])}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary">{course.status ?? "enrolled"}</Badge>
                    {course.shift_change_request?.status === "pending" && (
                      <Badge variant="outline" className="text-[10px]">
                        Shift change pending
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={course.progress_percent ?? 0} className="flex-1 h-2" />
                  <span className="text-xs font-medium w-10 text-right">{course.progress_percent ?? 0}%</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(hasCourseAccess(course.status) || isPendingEnrollmentApproval(course.status)) && (
                    <Button size="sm" variant="outline" onClick={() => openCourseMaterials(navigate, course.id!, "overview")}>
                      <BookOpen className="mr-1 h-3 w-3" />
                      {isPendingEnrollmentApproval(course.status) ? "View course" : "Course guide"}
                    </Button>
                  )}
                  {hasCourseAccess(course.status) && (
                    <Button size="sm" variant="outline" onClick={() => openCourseMaterials(navigate, course.id!, "videos")}>
                      <Play className="mr-1 h-3 w-3" />
                      Continue learning
                    </Button>
                  )}
                  {(course.study_shifts ?? []).length > 0 && !course.shift_change_request && (
                    <Button size="sm" variant="ghost" onClick={() => setShiftChangeCourse(course)}>
                      Request shift change
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Upcoming live classes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming live classes
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/learner/live-classes")}>
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.upcoming_classes ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No live sessions scheduled yet.</p>
            ) : (
              (data?.upcoming_classes ?? []).slice(0, 4).map((cls) => {
                const state = getLiveSessionState(cls.start_time, cls.duration_minutes ?? 60, cls);
                return (
                  <div key={`${cls.type}-${cls.id}`} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{cls.title ?? "Live session"}</p>
                        <p className="text-xs text-muted-foreground">{cls.course_title}</p>
                        {cls.start_time && (
                          <p className="text-xs text-muted-foreground mt-1">{formatClassTime(cls.start_time)}</p>
                        )}
                      </div>
                      {state.can_join ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Live</Badge>
                      ) : state.is_past ? (
                        <Badge variant="outline">Ended</Badge>
                      ) : (
                        <Badge variant="secondary">Upcoming</Badge>
                      )}
                    </div>
                    {state.can_join && (cls.embed_room_path || cls.id) ? (
                      <button
                        type="button"
                        onClick={() =>
                          openMeetingInNewTab(
                            learnerEmbedRoomPath(
                              cls.embed_room_path ||
                                materialEmbedRoom(Number(cls.id), 0, getStudentId() || undefined),
                            ),
                            { launchTitle: cls.title ?? "Live class", isHost: false },
                          )
                        }
                        className="text-xs text-primary underline mt-2 inline-block"
                      >
                        Join in app
                      </button>
                    ) : state.is_past && cls.course_id ? (
                      <button
                        type="button"
                        onClick={() => openCourseMaterials(navigate, cls.course_id!, "recordings")}
                        className="text-xs text-primary underline mt-2 inline-block"
                      >
                        View recordings
                      </button>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-2">Join opens when class starts</p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Certificates preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certification
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/certificates")}>
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.certificates ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Complete and pay for courses to earn digital certificates with QR verification.
              </p>
            ) : (
              (data?.certificates ?? []).slice(0, 3).map((cert) => (
                <div key={cert.certificate_id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium text-sm">{cert.course_title}</p>
                    <p className="text-xs text-muted-foreground">{cert.certificate_id}</p>
                  </div>
                  <Badge>Issued</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Available courses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Available courses
          </CardTitle>
          <CardDescription>
            Browse courses, apply, then pay anytime — Mobile Money or promo unlocks access automatically; payment proof needs admin review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(data?.available_courses ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses available yet.</p>
          ) : (
            <div className="grid gap-4">
              {(data?.available_courses ?? []).map((course) => {
                const status = getEnrollmentStatusForCourse(enrollmentStatuses, course.id);
                const hasAccess = hasCourseAccess(status);
                const paid = isEnrollmentPaid(status);
                const canPay = canPayForEnrollment(status);
                const pending = isPendingEnrollmentApproval(status);
                const rejected = isEnrollmentRejected(status);
                const isBusy = busyCourseId === course.id;
                const title = course.title ?? "";
                const isAICourse = title.toLowerCase().includes("ai mastery");
                const isFrench = title.toLowerCase().includes("french") || title.includes("TCF") || title.includes("TEF");

                let buttonLabel = "Apply";
                let buttonClass = "bg-zinc-900 hover:bg-zinc-800";
                let buttonDisabled = isBusy;

                if (hasAccess) {
                  buttonLabel = "Access materials";
                  buttonClass = "bg-slate-700 hover:bg-slate-600";
                } else if (canPay) {
                  buttonLabel = "Pay now";
                  buttonClass = "bg-emerald-600 hover:bg-emerald-500";
                } else if (pending) {
                  buttonLabel = "View course";
                  buttonClass = "bg-slate-700 hover:bg-slate-600";
                } else if (rejected) {
                  buttonLabel = "Rejected";
                  buttonClass = "bg-red-100 text-red-700";
                  buttonDisabled = true;
                }

                let badgeLabel = "Available";
                if (hasAccess && paid) badgeLabel = "Active — paid";
                else if (hasAccess) badgeLabel = "Active — payment due";
                else if (canPay && pending) badgeLabel = "Pay to activate";
                else if (status === "partial_paid") badgeLabel = "Partial paid";
                else if (canPay) badgeLabel = "Pay now";
                else if (pending) badgeLabel = "Waiting approval";
                else if (rejected) badgeLabel = "Rejected";

                return (
                  <Card key={course.id} className="overflow-hidden">
                    <div className="flex flex-col lg:flex-row">
                      <div className="w-full lg:w-56 h-44 lg:h-36 shrink-0">
                        <img src={getCourseImage(course)} alt={title} className="w-full h-full object-cover" />
                      </div>
                      <CardContent className="p-4 flex-1 flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-1">{course.title ?? "Untitled"}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{course.description}</p>
                          {(course.price ?? 0) > 0 ? (
                            <p className="text-sm font-semibold text-primary">${Number(course.price).toFixed(2)} USD</p>
                          ) : (
                            <p className="text-sm font-semibold text-emerald-600">Free</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 lg:w-44 shrink-0">
                          <Badge variant={hasAccess || canPay ? "default" : "outline"}>{badgeLabel}</Badge>

                          {!hasAccess && !canPay && !pending && !rejected && !isAICourse && (
                            <div className="grid grid-cols-2 gap-1">
                              {LEVELS.map((lvl) => (
                                <button
                                  key={lvl.id}
                                  type="button"
                                  onClick={() => setCourseLevels((p) => ({ ...p, [course.id]: lvl.id }))}
                                  className={`text-[10px] px-1.5 py-1 rounded border ${
                                    courseLevels[course.id] === lvl.id
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border hover:bg-muted/60"
                                  }`}
                                >
                                  {lvl.label.split(" ")[0]}
                                </button>
                              ))}
                              <span className="col-span-2 text-[10px] text-muted-foreground">
                                {isFrench ? "French" : "English"} level
                              </span>
                            </div>
                          )}

                          <Button
                            size="sm"
                            className={buttonClass}
                            disabled={buttonDisabled}
                            onClick={() => !buttonDisabled && handleCourseAction(course.id, course.title)}
                          >
                            {isBusy ? "Please wait..." : buttonLabel}
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {shiftChangeCourse && (
        <LearnerShiftChangeDialog
          open={!!shiftChangeCourse}
          onOpenChange={(open) => !open && setShiftChangeCourse(null)}
          courseId={shiftChangeCourse.id}
          courseTitle={shiftChangeCourse.title}
          currentShifts={shiftChangeCourse.study_shifts}
          initialShiftIds={(shiftChangeCourse.study_shifts ?? []).map((s) => s.id)}
          submitting={submittingShiftRequest}
          onSubmit={handleSubmitShiftChange}
        />
      )}
    </div>
  );
};

export default LearnerDashboard;
