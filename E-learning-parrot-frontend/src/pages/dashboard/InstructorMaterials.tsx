import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SmartDateTimePicker } from "@/components/ui/SmartDateTimePicker";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Loader2,
  Radio,
  Video,
  Copy,
  AlertCircle,
  Users,
  Trash2,
  BookOpen,
  Clock,
  Eye,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  CalendarClock,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  getCourseEnrolledStudents,
  getInstructorLiveClasses,
  scheduleCourseClass,
  startInstructorLiveSession,
  deleteCourseMaterial,
  type EnrolledStudent,
  type InstructorLiveClassSession,
} from "@/api/axios";
import { formatClassTime } from "@/lib/learnerNavigation";
import { fetchDashboardCached, readDashboardCache, invalidateDashboardCache } from "@/lib/dashboardCache";
import { dashboardCacheKey, resolveInstructorEmail } from "@/lib/dashboardUser";
import { initialDashboardLoading, readCachedDashboardData } from "@/lib/dashboardInitialLoad";
import { materialEmbedRoom, materialPreviewRoom, absoluteAppUrl, openMeetingInNewTab } from "@/lib/zoomEmbedRoutes";
import { beginZoomLaunch, clearZoomLaunchPending } from "@/lib/zoomLaunchPending";
import { resolveDefaultTimezone } from "@/lib/commonTimezones";
import { isFutureScheduled, localDatetimeToIso, localDatetimeToZoomStart, scheduleValidationMessage, defaultFutureDatetimeLocal } from "@/lib/scheduledDateTime";
import {
  isUpcomingLiveSession,
  mergeInstructorLiveSessions,
  normalizeInstructorLiveSession,
  normalizeInstructorLiveSessions,
} from "@/lib/instructorLiveSessions";
import { cn } from "@/lib/utils";
import { showsPlatformHubBranding } from "@/lib/institutionContext";
import { ZoomBrandIcon } from "@/components/live/ZoomBrandIcon";

interface Course {
  id: number;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  duration?: string | null;
  paid_enrollments_count?: number;
  can_host?: boolean;
  assigned_to_me?: boolean;
}

const DURATION_PRESETS = [30, 45, 60, 90, 120] as const;

function extractApiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return fallback;

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  const errors = data.errors;
  if (errors && typeof errors === "object") {
    const parts = Object.values(errors as Record<string, unknown>)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === "string" && value.trim() !== "");
    if (parts.length > 0) return parts.join(" ");
  }

  const zoom = data.zoom;
  if (zoom && typeof zoom === "object" && typeof (zoom as { message?: string }).message === "string") {
    const zoomMessage = (zoom as { message: string }).message.trim();
    if (zoomMessage) return zoomMessage;
  }

  return fallback;
}

const InstructorMaterials = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const instructorEmail = resolveInstructorEmail();
  const liveClassesCacheKey = instructorEmail
    ? dashboardCacheKey("live-classes-all", instructorEmail)
    : "";
  const initialLiveData = liveClassesCacheKey
    ? readCachedDashboardData<{
        courses?: Course[];
        sessions?: InstructorLiveClassSession[];
        zoom?: { configured?: boolean };
      }>(liveClassesCacheKey)
    : null;

  const [courses, setCourses] = useState<Course[]>(() =>
    Array.isArray(initialLiveData?.courses) ? initialLiveData.courses : [],
  );
  const [sessions, setSessions] = useState<InstructorLiveClassSession[]>(() =>
    normalizeInstructorLiveSessions(initialLiveData?.sessions),
  );
  const [zoomConfigured, setZoomConfigured] = useState(() =>
    initialLiveData?.zoom ? Boolean(initialLiveData.zoom.configured) : true,
  );
  const [loading, setLoading] = useState(() =>
    liveClassesCacheKey ? initialDashboardLoading(liveClassesCacheKey) : !instructorEmail,
  );
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDuration, setMeetingDuration] = useState("60");
  const [classStartTime, setClassStartTime] = useState(() => defaultFutureDatetimeLocal(resolveDefaultTimezone()));
  const [scheduleTimezone, setScheduleTimezone] = useState(resolveDefaultTimezone);
  const [classNotes, setClassNotes] = useState("");
  const [joinBeforeHost, setJoinBeforeHost] = useState(false);
  const [muteOnEntry, setMuteOnEntry] = useState(true);
  const [autoRecording, setAutoRecording] = useState(true);
  const [startWithRecording, setStartWithRecording] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [lastHostRoomPath, setLastHostRoomPath] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
  const [startingSessionId, setStartingSessionId] = useState<number | null>(null);
  const [pinnedSessionIds, setPinnedSessionIds] = useState<Set<number>>(() => new Set());
  const pinnedSessionIdsRef = useRef(pinnedSessionIds);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    pinnedSessionIdsRef.current = pinnedSessionIds;
  }, [pinnedSessionIds]);

  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [notifyableCount, setNotifyableCount] = useState(0);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const queryParams = new URLSearchParams(location.search);
  const initialCourseId = queryParams.get("courseId");

  const loadPage = useCallback(
    async (courseId?: number | null, force = false) => {
      if (!instructorEmail) {
        toast({
          variant: "destructive",
          title: "Cannot load live classes",
          description: "Instructor email is missing. Please log in again.",
        });
        setLoading(false);
        return;
      }

      const cacheKey = dashboardCacheKey(
        courseId ? `live-classes-${courseId}` : "live-classes-all",
        instructorEmail,
      );
      const generation = ++loadGenerationRef.current;
      if (!force && !readDashboardCache(cacheKey)) {
        setLoading(true);
      }
      try {
        const { data } = await fetchDashboardCached(
          cacheKey,
          () => getInstructorLiveClasses(instructorEmail, courseId ?? undefined),
          { force },
        );
        if (generation !== loadGenerationRef.current) return;

        const list = Array.isArray(data.courses) ? data.courses : [];
        setCourses(list);
        setSessions((prev) => {
          return mergeInstructorLiveSessions(
            prev,
            normalizeInstructorLiveSessions(data.sessions),
            pinnedSessionIdsRef.current,
          );
        });
        setPinnedSessionIds((prev) => {
          const next = new Set(prev);
          for (const session of normalizeInstructorLiveSessions(data.sessions)) {
            if (next.has(session.id) && isUpcomingLiveSession(session)) {
              next.delete(session.id);
            }
          }
          return next;
        });
        setZoomConfigured(Boolean(data.zoom?.configured));

        if (!courseId && list.length > 0 && !selectedCourseId) {
          const idFromQuery = initialCourseId ? Number(initialCourseId) : undefined;
          const queryMatch = idFromQuery && list.some((c) => c.id === idFromQuery) ? idFromQuery : undefined;
          const firstAssignable = list.find((c) => c.can_host)?.id;
          const nextId = queryMatch ?? firstAssignable ?? list[0]?.id;
          if (nextId) setSelectedCourseId(nextId);
        }
      } catch (error: unknown) {
        const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast({
          variant: "destructive",
          title: "Error loading live classes",
          description: message || "Unable to load your courses.",
        });
      } finally {
        setLoading(false);
      }
    },
    [instructorEmail, initialCourseId, selectedCourseId, toast],
  );

  useEffect(() => {
    void loadPage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;

    setStudentsLoading(true);
    const timeout = window.setTimeout(() => setStudentsLoading(false), 15000);

    getCourseEnrolledStudents(selectedCourseId, instructorEmail || undefined)
      .then((res) => {
        setEnrolledStudents(Array.isArray(res.students) ? res.students : []);
        setNotifyableCount(res.notifyable_count ?? 0);
      })
      .catch(() => {
        setEnrolledStudents([]);
        setNotifyableCount(0);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setStudentsLoading(false);
      });

    void loadPage(selectedCourseId);

    const params = new URLSearchParams(location.search);
    params.set("courseId", String(selectedCourseId));
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const canHostSelectedCourse =
    selectedCourse == null
      ? false
      : Boolean(selectedCourse.can_host ?? selectedCourse.assigned_to_me ?? true);

  const courseSessions = useMemo(() => {
    const filtered = sessions.filter((s) => {
      if (selectedCourseId && s.course_id !== selectedCourseId) return false;
      return pinnedSessionIds.has(s.id) || isUpcomingLiveSession(s);
    });

    return [...filtered].sort((a, b) => {
      const aTime = (a.scheduled_at ?? a.start_time) ? new Date(a.scheduled_at ?? a.start_time!).getTime() : 0;
      const bTime = (b.scheduled_at ?? b.start_time) ? new Date(b.scheduled_at ?? b.start_time!).getTime() : 0;
      return aTime - bTime;
    });
  }, [sessions, selectedCourseId, pinnedSessionIds]);

  const usePlatformZoomMark = showsPlatformHubBranding();

  const notifyableStudents = useMemo(
    () =>
      enrolledStudents.filter((s) =>
        ["paid", "completed"].includes(String(s.enrollment_status ?? "").toLowerCase()),
      ),
    [enrolledStudents],
  );

  const handleStartSession = async (session: InstructorLiveClassSession) => {
    if (session.can_host === false || (!canHostSelectedCourse && session.course_id === selectedCourseId)) {
      toast({
        variant: "destructive",
        title: "View only",
        description: "This course is not assigned to you. Assign it in Course Management to start live classes.",
      });
      return;
    }
    const meetingPath = session.host_room_path || materialEmbedRoom(session.id, 1);
    beginZoomLaunch({ title: session.title ?? "Live class", isHost: true });
    setStartingSessionId(session.id);
    try {
      const res = await startInstructorLiveSession(session.id, instructorEmail, startWithRecording);
      toast({
        title: "Live class started",
        description: res.recording_warning
          ? `${res.message} Recording will start after you join the host room.`
          : res.recording_enabled
            ? "Cloud recording is enabled. It will start after you join the host room."
            : res.message,
      });
    } catch (error: unknown) {
      clearZoomLaunchPending();
      setStartingSessionId(null);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        variant: "destructive",
        title: "Could not mark session as started",
        description: message || "Learners may not see the join button yet.",
      });
      return;
    }

    openMeetingInNewTab(meetingPath, {
      launchTitle: session.title ?? "Live class",
      isHost: true,
      beginLaunch: false,
    });
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    setPinnedSessionIds((prev) => {
      const next = new Set(prev);
      next.delete(session.id);
      return next;
    });
    setStartingSessionId(null);
  };

  const handleDeleteSession = async (session: InstructorLiveClassSession) => {
    if (session.can_host === false || (!canHostSelectedCourse && session.course_id === selectedCourseId)) {
      toast({
        variant: "destructive",
        title: "View only",
        description: "This course is not assigned to you. You can view sessions but not delete them.",
      });
      return;
    }
    const courseId = session.course_id ?? selectedCourseId;
    if (!courseId) {
      toast({ variant: "destructive", title: "Cannot delete", description: "Course not found for this session." });
      return;
    }

    const title = session.title ?? "this live class";
    if (!window.confirm(`Delete "${title}"? Learners will no longer see this scheduled session.`)) {
      return;
    }

    setDeletingSessionId(session.id);
    try {
      await deleteCourseMaterial(courseId, session.id);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      setPinnedSessionIds((prev) => {
        const next = new Set(prev);
        next.delete(session.id);
        return next;
      });
      toast({ title: "Class deleted", description: "The scheduled live session was removed." });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: message || "Could not delete this live class.",
      });
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classStartTime.trim() || !selectedCourseId || !instructorEmail) return;

    if (!canHostSelectedCourse) {
      toast({
        variant: "destructive",
        title: "View only",
        description: "This course is not assigned to you. Assign it in Course Management to schedule live classes.",
      });
      return;
    }

    if (!isFutureScheduled(classStartTime, scheduleTimezone)) {
      toast({
        variant: "destructive",
        title: "Choose a future time",
        description: scheduleValidationMessage(classStartTime, scheduleTimezone) ?? "Pick a later date and time.",
      });
      return;
    }

    const zoomStart = localDatetimeToZoomStart(classStartTime, scheduleTimezone);
    if (!zoomStart) {
      toast({ variant: "destructive", title: "Invalid date or time." });
      return;
    }

    if (!zoomConfigured) {
      toast({
        variant: "destructive",
        title: "Zoom not configured",
        description: "Configure Zoom API credentials in backend .env before scheduling.",
      });
      return;
    }

    try {
      setScheduling(true);
      setLastHostRoomPath(null);
      const topicBase = selectedCourse?.title || "Course session";
      const topic = meetingTitle.trim() || topicBase;
      const durationNumber = meetingDuration ? Number(meetingDuration) || 60 : 60;

      const result = await scheduleCourseClass(selectedCourseId, {
        start_time: zoomStart,
        instructor_email: instructorEmail,
        topic,
        duration: durationNumber,
        timezone: scheduleTimezone,
        notes: classNotes || null,
        join_before_host: joinBeforeHost,
        mute_upon_entry: muteOnEntry,
        auto_recording: autoRecording,
      });

      const hostPath =
        result.host_room_path || (result.material?.id ? materialEmbedRoom(result.material.id, 1) : null);
      setLastHostRoomPath(hostPath);

      if (result.material?.id) {
        const material = normalizeInstructorLiveSession({
          ...result.material,
          title: result.material.title ?? topic,
          course_id: result.material.course_id ?? selectedCourseId,
          course_title: selectedCourse?.title ?? undefined,
          meeting_id:
            result.material.meeting_id ??
            (result.zoom_meeting_id != null ? String(result.zoom_meeting_id) : null),
          host_room_path:
            result.host_room_path ??
            result.material.host_room_path ??
            (result.material.id ? materialEmbedRoom(result.material.id, 1) : null),
          embed_room_path:
            result.material.embed_room_path ??
            (result.material.id ? materialEmbedRoom(result.material.id, 0) : null),
          share_path:
            result.material.share_path ??
            result.material.embed_room_path ??
            (result.material.id ? materialEmbedRoom(result.material.id, 0) : null),
          scheduled_at:
            result.material.scheduled_at ??
            result.material.start_time ??
            localDatetimeToIso(classStartTime, scheduleTimezone),
          duration_minutes: result.material.duration_minutes ?? durationNumber,
          description: classNotes || result.material.description || null,
          session_status: "upcoming",
          is_upcoming: true,
        });
        setSessions((prev) => [material, ...prev.filter((s) => s.id !== material.id)]);
        setPinnedSessionIds((prev) => new Set(prev).add(material.id));
      }

      if (instructorEmail) {
        invalidateDashboardCache(dashboardCacheKey(`live-classes-${selectedCourseId}`, instructorEmail));
        invalidateDashboardCache(dashboardCacheKey("live-classes-all", instructorEmail));
      }

      toast({
        variant: "success" as any,
        title: "Class scheduled",
        description:
          result.message ||
          `Live class created. ${result.students_notified ?? 0} learner(s) notified with in-app join links.`,
        duration: 5000,
      });

      setMeetingTitle("");
      setMeetingDuration("60");
      setClassStartTime(defaultFutureDatetimeLocal(scheduleTimezone));
      setClassNotes("");

      // Refresh in the background after the API has persisted the row — never block the pinned list item.
      window.setTimeout(() => {
        void loadPage(selectedCourseId, true);
      }, 1500);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Scheduling failed",
        description: extractApiErrorMessage(error, "Failed to schedule class via Zoom API."),
      });
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader eyebrow="Teaching" title="Live Classes" description="Schedule and host in-browser sessions.">
        <Badge
          variant={zoomConfigured ? "secondary" : "destructive"}
          className={cn(
            "shrink-0 px-3 py-1 text-xs font-medium",
            zoomConfigured && "bg-white/15 text-white border-white/20",
          )}
        >
          {zoomConfigured ? (
            <>
              <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5" />
              Zoom ready
            </>
          ) : (
            "Zoom not configured"
          )}
        </Badge>
      </AdminPageHeader>

      {!zoomConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50/90 px-4 py-3 text-sm dark:bg-amber-950/30">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-amber-900 dark:text-amber-100">Add Zoom credentials in backend <code className="text-xs">.env</code> to schedule classes.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="rounded-full px-3 py-1 font-normal">
          {courses.length} course{courses.length === 1 ? "" : "s"}
        </Badge>
        <Badge variant="outline" className="rounded-full px-3 py-1 font-normal">
          {courseSessions.length} session{courseSessions.length === 1 ? "" : "s"}
        </Badge>
        <Badge variant="outline" className="rounded-full px-3 py-1 font-normal">
          {notifyableCount || notifyableStudents.length} learner{(notifyableCount || notifyableStudents.length) === 1 ? "" : "s"} to notify
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Card className="overflow-hidden rounded-2xl border-0 shadow-md xl:col-span-4 ring-1 ring-[#0070D0]/10">
          <CardHeader className="bg-[#0070D0] pb-4 pt-5 text-white">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BookOpen className="h-4 w-4" />
              Courses
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[min(58vh,480px)] space-y-2 overflow-y-auto p-3 pt-4">
            {loading ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : courses.length === 0 ? (
              <div className="space-y-3 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                <BookOpen className="mx-auto h-8 w-8 opacity-40" />
                <p>No courses assigned yet.</p>
                <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/instructor/create-course")}>
                  Create course
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {courses.map((course) => {
                  const isActive = course.id === selectedCourseId;
                  const canHost = Boolean(course.can_host ?? course.assigned_to_me);
                  return (
                    <li key={course.id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded-xl px-3 py-3 text-left transition-all",
                          isActive
                            ? "bg-[#0070D0] text-white shadow-md"
                            : "bg-muted/40 hover:bg-muted/70 text-foreground",
                        )}
                        onClick={() => setSelectedCourseId(course.id)}
                      >
                        <p className="truncate text-sm font-medium">{course.title ?? "Untitled course"}</p>
                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] opacity-80">
                          <span className="uppercase tracking-wide">
                            {canHost ? "Assigned" : "View only"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {course.paid_enrollments_count ?? 0}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-0 shadow-md xl:col-span-8 ring-1 ring-[#0070D0]/10">
          <CardHeader className="border-b border-[#0070D0]/10 bg-gradient-to-r from-[#0070D0]/[0.06] to-transparent pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-[#0070D0]">
              <Video className="h-5 w-5" />
              {canHostSelectedCourse ? "Schedule a class" : "Course sessions"}
            </CardTitle>
            {selectedCourse && (
              <p className="text-sm text-muted-foreground truncate">
                {selectedCourse.title}
                {!canHostSelectedCourse ? " · View only" : ""}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            {selectedCourseId == null ? (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
                <CalendarClock className="h-12 w-12 text-[#0070D0]/25" />
                <p className="text-sm">Select a course to begin.</p>
              </div>
            ) : !canHostSelectedCourse ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Eye className="h-12 w-12 text-[#0070D0]/30" />
                <p className="text-sm font-medium text-foreground">View only</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  This course is assigned to another instructor. You can view upcoming sessions below,
                  but only the assigned teacher can schedule or start live classes.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/dashboard/courses")}
                >
                  Open Course Management
                </Button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={(e) => void handleScheduleSubmit(e)}>
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="meeting-title">Class title</Label>
                    <Input
                      id="meeting-title"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      placeholder="Module 1 — Live session"
                      className="h-11 border-[#0070D0]/15"
                    />
                  </div>
                  <div className="space-y-1.5 sm:w-36">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={15}
                      max={480}
                      value={meetingDuration}
                      onChange={(e) => setMeetingDuration(e.target.value)}
                      className="h-11 border-[#0070D0]/15"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setMeetingDuration(String(mins))}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        Number(meetingDuration) === mins
                          ? "bg-[#0070D0] text-white"
                          : "bg-muted text-muted-foreground hover:bg-[#0070D0]/10 hover:text-[#0070D0]",
                      )}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>

                <SmartDateTimePicker
                  idPrefix="live-class"
                  value={classStartTime}
                  timezone={scheduleTimezone}
                  onValueChange={setClassStartTime}
                  onTimezoneChange={setScheduleTimezone}
                />

                <Textarea
                  id="notes"
                  value={classNotes}
                  onChange={(e) => setClassNotes(e.target.value)}
                  placeholder="Agenda or notes for learners (optional)"
                  rows={2}
                  className="resize-none border-[#0070D0]/15"
                />

                {(notifyableCount > 0 || notifyableStudents.length > 0) && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 text-[#0070D0]" />
                    <span>
                      <strong className="text-foreground">{notifyableCount || notifyableStudents.length}</strong> paid learners will be notified
                    </span>
                  </p>
                )}

                <Collapsible>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-dashed border-[#0070D0]/20 px-3 py-2 text-sm font-medium text-[#0070D0] hover:bg-[#0070D0]/5">
                    Meeting options
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2 rounded-lg border bg-muted/30 p-3">
                    <label className="flex cursor-pointer items-center gap-3 text-sm">
                      <Checkbox checked={joinBeforeHost} onCheckedChange={(v) => setJoinBeforeHost(Boolean(v))} />
                      Join before host
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 text-sm">
                      <Checkbox checked={muteOnEntry} onCheckedChange={(v) => setMuteOnEntry(Boolean(v))} />
                      Mute on entry
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 text-sm">
                      <Checkbox checked={autoRecording} onCheckedChange={(v) => setAutoRecording(Boolean(v))} />
                      Cloud recording
                    </label>
                  </CollapsibleContent>
                </Collapsible>

                {lastHostRoomPath && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                      <CheckCircle2 className="h-4 w-4" />
                      Class scheduled
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void navigator.clipboard.writeText(absoluteAppUrl(lastHostRoomPath));
                          toast({ title: "Copied host link" });
                        }}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy link
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#0070D0] hover:bg-[#0070D0]/90"
                        onClick={() => {
                          openMeetingInNewTab(lastHostRoomPath, {
                            beginLaunch: false,
                            launchTitle: meetingTitle || selectedCourse?.title || "Live class",
                            isHost: true,
                          });
                        }}
                      >
                        {usePlatformZoomMark ? (
                          <ZoomBrandIcon className="mr-1.5" size={14} />
                        ) : (
                          <Video className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Start now
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={scheduling || !zoomConfigured || !classStartTime}
                  className="h-11 w-full bg-[#0070D0] hover:bg-[#1A8AD8] sm:w-auto sm:min-w-[200px]"
                >
                  {scheduling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Schedule class
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedCourseId && (
        <Card className="rounded-2xl border-0 shadow-md ring-1 ring-[#0070D0]/10">
          <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-[#0070D0]">
                <Radio className="h-5 w-5" />
                Upcoming sessions
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">{selectedCourse?.title}</p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={startWithRecording}
                disabled={!canHostSelectedCourse}
                onCheckedChange={(v) => setStartWithRecording(Boolean(v))}
              />
              Record when starting
            </label>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {courseSessions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-muted-foreground">
                <Clock className="h-10 w-10 opacity-25" />
                <p className="text-sm">No scheduled sessions yet.</p>
                <p className="text-xs">Saved classes appear here immediately after scheduling.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseSessions.map((session) => {
                  const sharePath = session.share_path ?? session.embed_room_path ?? null;
                  const hostPath = session.host_room_path ?? materialEmbedRoom(session.id, 1);
                  const scheduledLabel = session.scheduled_at ?? session.start_time;
                  const canHostSession =
                    session.can_host !== false && (session.can_host === true || canHostSelectedCourse);

                  return (
                  <article
                    key={session.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#0070D0]/10 bg-gradient-to-r from-white to-[#0070D0]/[0.03] p-4 dark:from-card dark:to-[#0070D0]/10"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{session.title ?? "Live class"}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-[#0070D0]" />
                          {scheduledLabel ? formatClassTime(scheduledLabel) : "Scheduled"}
                        </span>
                        {session.duration_minutes ? (
                          <span>{session.duration_minutes} min</span>
                        ) : null}
                        {session.meeting_id ? (
                          <span className="font-mono text-[10px] opacity-70">ID {session.meeting_id}</span>
                        ) : null}
                        {!canHostSession ? (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            View only
                          </Badge>
                        ) : null}
                      </p>
                      {session.description && (
                        <p className="mt-1.5 text-xs text-muted-foreground">{session.description}</p>
                      )}
                      {sharePath && (
                        <p className="mt-2 truncate rounded-md bg-muted/50 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                          {absoluteAppUrl(sharePath)}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {sharePath && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void navigator.clipboard.writeText(absoluteAppUrl(sharePath));
                            toast({ title: "Copied learner share link" });
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy share link
                        </Button>
                      )}
                      {canHostSession && hostPath && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void navigator.clipboard.writeText(absoluteAppUrl(hostPath));
                            toast({ title: "Copied host link" });
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy host link
                        </Button>
                      )}
                      {canHostSession && (hostPath || session.meeting_id) && (
                        <Button
                          size="sm"
                          className="bg-[#0070D0] hover:bg-[#1A8AD8]"
                          disabled={startingSessionId === session.id}
                          onClick={() => void handleStartSession(session)}
                        >
                          {startingSessionId === session.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : usePlatformZoomMark ? (
                            <ZoomBrandIcon className="mr-2" size={16} />
                          ) : (
                            <Video className="mr-2 h-4 w-4" />
                          )}
                          Start
                        </Button>
                      )}
                      {session.embed_room_path && (
                        <Button size="sm" variant="outline" onClick={() => openMeetingInNewTab(materialPreviewRoom(session.id), { launchTitle: session.title ?? "Preview", isHost: true })}>
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                      )}
                      {canHostSession && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={deletingSessionId === session.id}
                        onClick={() => void handleDeleteSession(session)}
                      >
                        {deletingSessionId === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                      )}
                    </div>
                  </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InstructorMaterials;
