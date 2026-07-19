import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Radio, ExternalLink, ClipboardList, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getLearnerNotifications, type LearnerNotification } from "@/api/axios";
import { formatClassTime, openCourseMaterials } from "@/lib/learnerNavigation";
import { learnerEmbedRoomPath, materialEmbedRoom, openMeetingInNewTab } from "@/lib/zoomEmbedRoutes";
import { getStudentId } from "@/lib/dashboardUser";

const READ_KEY = "parrot_learner_notifications_read";

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markRead(ids: string[]) {
  const current = getReadIds();
  ids.forEach((id) => current.add(id));
  localStorage.setItem(READ_KEY, JSON.stringify([...current]));
}

function isAssessmentNotification(n: LearnerNotification) {
  return n.type === "assessment" || n.type === "assessment_scheduled";
}

function notificationIcon(n: LearnerNotification) {
  if (n.type === "assessment_scheduled") return CalendarClock;
  if (isAssessmentNotification(n)) return ClipboardList;
  return Radio;
}

const LearnerNotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<LearnerNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadIds());

  useEffect(() => {
    const studentId = Number(localStorage.getItem("parrot_student_id"));
    if (!studentId) return;

    getLearnerNotifications(studentId)
      .then((res) => setNotifications(res.notifications ?? []))
      .catch(() => setNotifications([]));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next && notifications.length > 0) {
      const ids = notifications.map((n) => n.id);
      markRead(ids);
      setReadIds(new Set(ids));
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white hover:text-[#FCC400] hover:bg-white/10" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <p className="font-semibold text-sm">Notifications</p>
          <p className="text-xs text-muted-foreground">Live classes and scheduled assessments</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-6 text-center">No new notifications.</p>
          ) : (
            notifications.map((n) => {
              const Icon = notificationIcon(n);
              const timeLabel = n.opens_at ?? n.start_time;

              return (
                <div key={n.id} className="px-4 py-3 border-b border-border last:border-0 space-y-2">
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      {timeLabel && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {n.type === "assessment_scheduled" ? "Opens " : ""}
                          {formatClassTime(timeLabel)}
                        </p>
                      )}
                      {n.type === "assessment_scheduled" && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          You will receive an email reminder 1 hour 30 minutes before it starts
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {isAssessmentNotification(n) && n.action_path ? (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => {
                          navigate(n.action_path!);
                          setOpen(false);
                        }}
                      >
                        {n.type === "assessment_scheduled" ? "View assessment" : "Take assessment"}
                      </Button>
                    ) : n.can_join && (n.embed_room_path || n.material_id) ? (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => {
                          openMeetingInNewTab(
                            learnerEmbedRoomPath(
                              n.embed_room_path ||
                                materialEmbedRoom(Number(n.material_id), 0, getStudentId() || undefined),
                            ),
                            { launchTitle: n.title ?? "Live class", isHost: false },
                          );
                          setOpen(false);
                        }}
                      >
                        Join in app
                      </Button>
                    ) : n.is_past && n.course_id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          openCourseMaterials(navigate, n.course_id!, "recordings");
                          setOpen(false);
                        }}
                      >
                        Recordings
                      </Button>
                    ) : null}
                    {n.course_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          openCourseMaterials(navigate, n.course_id!);
                          setOpen(false);
                        }}
                      >
                        Materials
                      </Button>
                    )}
                    {!isAssessmentNotification(n) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          navigate(n.action_path ?? "/dashboard/learner/live-classes");
                          setOpen(false);
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View all
                      </Button>
                    )}
                  </div>
                  {!readIds.has(n.id) && (
                    <Badge variant="secondary" className="ml-6 text-[10px]">
                      New
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LearnerNotificationBell;
