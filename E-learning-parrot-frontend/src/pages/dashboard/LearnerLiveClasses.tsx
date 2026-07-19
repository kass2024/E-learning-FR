import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Radio, ArrowLeft, Calendar, ExternalLink, PlayCircle, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatClassTime, openCourseMaterials } from "@/lib/learnerNavigation";
import { getLiveSessionState, sessionStatusLabel, sortLiveClasses } from "@/lib/liveClassSession";
import { learnerEmbedRoomPath, materialEmbedRoom } from "@/lib/zoomEmbedRoutes";
import { CohortJoinQueueDialog } from "@/components/live/CohortJoinQueueDialog";
import { useLearnerDashboardData } from "@/hooks/useLearnerDashboardData";
import { resolveLearnerStudentId } from "@/lib/dashboardUser";
import type { LearnerDashboardData } from "@/api/axios";

type LiveClassItem = NonNullable<LearnerDashboardData["upcoming_classes"]>[number] & {
  queue_enabled?: boolean;
  session_status?: string;
  is_live_now?: boolean;
};

const cohortSessionState = (cls: LiveClassItem) => {
  const status = cls.session_status ?? (cls.is_live_now ? "live" : "idle");
  const mapped =
    status === "live" ? "live" : status === "ended" ? "ended" : status === "idle" ? "upcoming" : "unknown";

  return {
    session_status: mapped as "live" | "upcoming" | "ended" | "unknown",
    can_join: status === "live",
    is_past: status === "ended",
    is_upcoming: status === "idle" || status === "upcoming",
    is_live_now: status === "live",
  };
};

const LearnerLiveClasses = () => {
  const navigate = useNavigate();
  const { data, loading, reload } = useLearnerDashboardData();
  const [queueCohort, setQueueCohort] = useState<LiveClassItem | null>(null);
  const studentId = resolveLearnerStudentId();
  const classes = data?.upcoming_classes ?? [];

  useEffect(() => {
    const interval = window.setInterval(() => {
      void reload();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [reload]);

  const sortedClasses = useMemo(() => sortLiveClasses(classes), [classes]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Learning"
        title="Live classes"
        description="Join when your instructor starts the session. This page refreshes automatically every 30 seconds."
      >
        <Button variant="outline" onClick={() => navigate("/dashboard/learner")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </AdminPageHeader>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : sortedClasses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No live classes scheduled for your courses yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedClasses.map((cls) => {
            const state =
              cls.type === "cohort"
                ? cohortSessionState(cls)
                : getLiveSessionState(cls.start_time, cls.duration_minutes ?? 60, cls);
            const isEnded = state.session_status === "ended";
            const isLive = state.can_join;
            const usesQueue = cls.type === "cohort" && cls.queue_enabled !== false;

            return (
              <Card
                key={`${cls.type}-${cls.id}`}
                className={
                  isLive
                    ? "border-emerald-300 shadow-md"
                    : isEnded
                      ? "opacity-80 border-dashed bg-muted/20"
                      : ""
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className={`text-lg ${isEnded ? "text-muted-foreground" : ""}`}>
                        {cls.title ?? "Live session"}
                      </CardTitle>
                      <CardDescription>{cls.course_title ?? "Course session"}</CardDescription>
                    </div>
                    <Badge
                      variant={isLive ? "default" : "secondary"}
                      className={
                        isLive
                          ? "bg-emerald-600 hover:bg-emerald-600"
                          : isEnded
                            ? "bg-muted text-muted-foreground"
                            : ""
                      }
                    >
                      {cls.type === "cohort" && state.session_status === "unknown"
                        ? "Cohort"
                        : sessionStatusLabel(state.session_status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cls.start_time && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatClassTime(cls.start_time)}
                    </p>
                  )}
                  {cls.description && <p className="text-sm text-muted-foreground">{cls.description}</p>}

                  {state.session_status === "upcoming" && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      {usesQueue
                        ? "Join opens when the admin starts this cohort session. You will enter a queue if someone is already in the Zoom room."
                        : "Join opens when the instructor starts this session."}
                    </p>
                  )}

                  {isEnded && (
                    <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-md px-3 py-2">
                      This class has ended. Use recordings or course materials — rejoining is disabled.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {isLive && usesQueue ? (
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => {
                          if (studentId > 0) {
                            setQueueCohort(cls);
                          } else {
                            navigate(`/live-cohort/${cls.id}/join`);
                          }
                        }}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Join queue
                      </Button>
                    ) : isLive && (cls.embed_room_path || cls.id) ? (
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-500"
                        onClick={() =>
                          navigate(
                            learnerEmbedRoomPath(
                              cls.embed_room_path ||
                                materialEmbedRoom(Number(cls.id), 0, studentId > 0 ? studentId : undefined),
                            ),
                          )
                        }
                      >
                        <Radio className="mr-2 h-4 w-4" />
                        Join in app
                      </Button>
                    ) : (
                      <Button disabled variant="secondary" className="cursor-not-allowed">
                        <Radio className="mr-2 h-4 w-4" />
                        {isEnded ? "Join closed" : "Join not available yet"}
                      </Button>
                    )}

                    {isEnded && cls.course_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCourseMaterials(navigate, cls.course_id!, "recordings")}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        View recordings
                      </Button>
                    )}

                    {cls.course_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCourseMaterials(navigate, cls.course_id!)}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Course materials
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {queueCohort && studentId > 0 && (
        <CohortJoinQueueDialog
          open={Boolean(queueCohort)}
          onOpenChange={(open) => {
            if (!open) setQueueCohort(null);
          }}
          cohortId={queueCohort.id}
          cohortTitle={queueCohort.title ?? "Live cohort"}
          studentId={studentId}
        />
      )}
    </div>
  );
};

export default LearnerLiveClasses;
