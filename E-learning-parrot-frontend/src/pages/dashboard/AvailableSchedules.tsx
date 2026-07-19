import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { fetchDashboardCached, readDashboardCache } from "@/lib/dashboardCache";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createAvailableSchedule,
  deleteAvailableSchedule,
  getAvailableSchedules,
  updateAvailableSchedule,
  bulkUpsertAvailableSchedules,
  updateMeetingCalendar,
  getLiveZoomCohorts,
  createLiveZoomCohort,
  updateLiveZoomCohort,
  deleteLiveZoomCohort,
  bulkUpsertLiveZoomCohorts,
  startLiveZoomCohortSession,
  endLiveZoomCohortSession,
  getLiveZoomCohortZoomDetails,
  getMyInstitutionSettings,
  getPlatformMeetingSettings,
  type AvailableScheduleRow,
  type LiveZoomCohortZoomDetails,
  type MeetingCalendarConfig,
} from "@/api/axios";
import { getStoredInstitution } from "@/lib/institutionContext";
import {
  parseAvailableSchedulesResponse,
  DEFAULT_MEETING_CALENDAR,
  formatDurationMinutes,
  meetingDurationMinutes as getMeetingDurationMinutes,
  normalizeScheduleDate,
  type BookedMeetingSlot,
} from "@/lib/meetingScheduleUtils";
import { AdminMeetingAvailabilityCalendar } from "@/components/meeting/AdminMeetingAvailabilityCalendar";
import { CalendarClock, Check, ChevronDown, ChevronsUpDown, ClipboardList, Link2, Loader2, Monitor, Pencil, Play, Square, Trash2, Users } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LiveCohortQueueAdminDialog } from "@/components/live/LiveCohortQueueAdminDialog";
import { LiveCohortAttendanceDialog } from "@/components/live/LiveCohortAttendanceDialog";
import { ZoomSessionDetailsDialog } from "@/components/live/ZoomSessionDetailsDialog";
import { resolvePublicJoinUrl } from "@/lib/publicJoinUrl";
import { cohortHostStudio, openZoomMeetingInNewTab } from "@/lib/zoomEmbedRoutes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type CommonTimezone = {
  code: string;
  name: string;
  offset: string;
  iana: string;
  label: string;
};

const COMMON_TIMEZONES: CommonTimezone[] = [
  {
    code: "UTC",
    name: "Coordinated Universal Time",
    offset: "UTC+0",
    iana: "Etc/UTC",
    label: "UTC - Coordinated Universal Time (UTC+0)",
  },
  {
    code: "GMT",
    name: "Greenwich Mean Time",
    offset: "UTC+0",
    iana: "Europe/London",
    label: "GMT - Greenwich Mean Time (UTC+0)",
  },
  {
    code: "CAT-RW",
    name: "Central Africa Time (Rwanda)",
    offset: "UTC+2",
    iana: "Africa/Kigali",
    label: "CAT - Central Africa Time / Rwanda (UTC+2)",
  },
  {
    code: "EAT",
    name: "East Africa Time",
    offset: "UTC+3",
    iana: "Africa/Nairobi",
    label: "EAT - East Africa Time (UTC+3)",
  },
  {
    code: "CAT",
    name: "Central Africa Time",
    offset: "UTC+2",
    iana: "Africa/Harare",
    label: "CAT - Central Africa Time (UTC+2)",
  },
  {
    code: "WAT",
    name: "West Africa Time",
    offset: "UTC+1",
    iana: "Africa/Lagos",
    label: "WAT - West Africa Time (UTC+1)",
  },
  {
    code: "CET",
    name: "Central European Time",
    offset: "UTC+1",
    iana: "Europe/Berlin",
    label: "CET - Central European Time (UTC+1)",
  },
  {
    code: "EET",
    name: "Eastern European Time",
    offset: "UTC+2",
    iana: "Europe/Athens",
    label: "EET - Eastern European Time (UTC+2)",
  },
  {
    code: "BST",
    name: "British Summer Time",
    offset: "UTC+1",
    iana: "Europe/London",
    label: "BST - British Summer Time (UTC+1)",
  },
  {
    code: "IST",
    name: "India Standard Time",
    offset: "UTC+5:30",
    iana: "Asia/Kolkata",
    label: "IST - India Standard Time (UTC+5:30)",
  },
  {
    code: "GST",
    name: "Gulf Standard Time",
    offset: "UTC+4",
    iana: "Asia/Dubai",
    label: "GST - Gulf Standard Time (UTC+4)",
  },
  {
    code: "MSK",
    name: "Moscow Standard Time",
    offset: "UTC+3",
    iana: "Europe/Moscow",
    label: "MSK - Moscow Standard Time (UTC+3)",
  },
  {
    code: "CST",
    name: "Central Standard Time",
    offset: "UTC-6",
    iana: "America/Chicago",
    label: "CST - Central Standard Time (UTC-6)",
  },
  {
    code: "EST",
    name: "Eastern Standard Time",
    offset: "UTC-5",
    iana: "America/New_York",
    label: "EST - Eastern Standard Time (UTC-5)",
  },
  {
    code: "MST",
    name: "Mountain Standard Time",
    offset: "UTC-7",
    iana: "America/Denver",
    label: "MST - Mountain Standard Time (UTC-7)",
  },
  {
    code: "PST",
    name: "Pacific Standard Time",
    offset: "UTC-8",
    iana: "America/Los_Angeles",
    label: "PST - Pacific Standard Time (UTC-8)",
  },
  {
    code: "JST",
    name: "Japan Standard Time",
    offset: "UTC+9",
    iana: "Asia/Tokyo",
    label: "JST - Japan Standard Time (UTC+9)",
  },
  {
    code: "KST",
    name: "Korea Standard Time",
    offset: "UTC+9",
    iana: "Asia/Seoul",
    label: "KST - Korea Standard Time (UTC+9)",
  },
  {
    code: "AEST",
    name: "Australian Eastern Standard Time",
    offset: "UTC+10",
    iana: "Australia/Sydney",
    label: "AEST - Australian Eastern Standard Time (UTC+10)",
  },
];

const dayOptions: { value: number; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const dayLabel = (dow: number) => dayOptions.find((d) => d.value === dow)?.label ?? String(dow);

const scheduleDateLabel = (row: AvailableScheduleRow) => {
  const dateKey = normalizeScheduleDate(row.available_on_date ?? undefined);
  if (dateKey) return dateKey;
  return dayLabel(row.day_of_week);
};

const timezoneCountryLabel = (tz: string | null | undefined): string => {
  if (!tz) return "-";

  // Try to find a pretty label in COMMON_TIMEZONES using the IANA id
  const match = COMMON_TIMEZONES.find((z) => z.iana === tz);
  if (match) {
    return match.label;
  }

  // Fallback: just return the raw timezone string
  return tz;
};

const normalizeTimeHHMM = (value: string | null | undefined) => {
  if (!value) return "";
  // Backend often returns TIME as HH:MM:SS, while backend validation expects HH:MM
  return value.length >= 5 ? value.slice(0, 5) : value;
};
interface AvailableSchedulesProps {
  mode?: "available" | "live";
  /** When true, page is shown inside Appointments tabs. */
  embedded?: boolean;
}

const AvailableSchedules = ({ mode = "available", embedded = false }: AvailableSchedulesProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState<AvailableScheduleRow[]>([]);
  const [loading, setLoading] = useState(() => {
    // Avoid skeleton flash when cache is already warm from hover/login prefetch.
    return false;
  });

  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [meetingDurationMinutes, setMeetingDurationMinutes] = useState(60);
  const [timezone, setTimezone] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingProvider, setMeetingProvider] = useState<"zoom" | "daily">("daily");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AvailableScheduleRow | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<AvailableScheduleRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [sessionActionId, setSessionActionId] = useState<number | null>(null);
  const [queueCohort, setQueueCohort] = useState<AvailableScheduleRow | null>(null);
  const [attendanceCohort, setAttendanceCohort] = useState<AvailableScheduleRow | null>(null);
  const [zoomDetailsOpen, setZoomDetailsOpen] = useState(false);
  const [zoomDetails, setZoomDetails] = useState<LiveZoomCohortZoomDetails | null>(null);
  const [zoomDetailsCohortId, setZoomDetailsCohortId] = useState<number | null>(null);

  const [calendarConfig, setCalendarConfig] = useState<MeetingCalendarConfig>(DEFAULT_MEETING_CALENDAR);
  const [bookedSlots, setBookedSlots] = useState<BookedMeetingSlot[]>([]);
  const [blockedMonthInput, setBlockedMonthInput] = useState("");
  const [blockedDateInput, setBlockedDateInput] = useState("");
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [blockingOpen, setBlockingOpen] = useState(false);

  const isLive = mode === "live";
  const cacheKey = isLive ? "live-zoom-cohorts" : "available-schedules";
  const pageTitle = isLive ? "Live Zoom Cohort" : embedded ? "Availability" : "Appointments";
  const addButtonLabel = isLive ? "Add Live Zoom Cohort" : "Add Available Time";
  const addDialogTitle = isLive ? "Add Live Zoom Cohort" : "Add Available Time";
  const addDialogDescription = isLive
    ? "Insert a new live Zoom cohort schedule slot."
    : "Insert a new available schedule slot.";
  const editDialogTitle = isLive ? "Edit Live Zoom Cohort" : "Edit Available Time";
  const editDialogDescription = isLive
    ? "Update the selected live Zoom cohort schedule slot."
    : "Update the selected available time slot.";
  const emptyTableText = isLive ? "No live Zoom cohorts found." : "No available times found.";
  const deleteDialogText = isLive
    ? "This will permanently delete the selected live cohort."
    : "This will permanently delete the selected available schedule.";

  const applyLoadedData = (data: unknown) => {
    if (isLive) {
      setRows(Array.isArray(data) ? data : (data as { data?: AvailableScheduleRow[] })?.data ?? []);
      return;
    }
    const parsed = parseAvailableSchedulesResponse(data);
    setRows(parsed.schedules);
    setCalendarConfig(parsed.calendar);
    setBookedSlots(parsed.bookedSlots);
  };

  const load = async (force = false) => {
    const cached = !force ? readDashboardCache<unknown>(cacheKey) : null;
    if (cached != null) {
      applyLoadedData(cached);
      setLoading(false);
    } else if (rows.length === 0) {
      // Only show full-page skeleton on first load - keep UI interactive during refresh.
      setLoading(true);
    }

    try {
      const { data } = await fetchDashboardCached(
        cacheKey,
        () => (isLive ? getLiveZoomCohorts() : getAvailableSchedules()),
        { force },
      );
      applyLoadedData(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.message ||
          (isLive ? "Failed to load live Zoom cohorts." : "Failed to load schedules."),
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when switching schedules vs live cohorts
  }, [cacheKey]);

  useEffect(() => {
    if (!isLive) return;
    const email = localStorage.getItem("parrot_user_email") ?? "";
    const apply = (provider?: string | null) => {
      if (provider === "zoom" || provider === "daily") {
        setMeetingProvider(provider);
      }
    };
    // Prefer main admin setting; institution payload also inherits it.
    void getPlatformMeetingSettings()
      .then((data) => apply(data.main_platform_meeting_provider))
      .catch(() => undefined);
    const stored = getStoredInstitution() as { meeting_provider?: string } | null;
    if (stored?.meeting_provider) {
      apply(stored.meeting_provider);
    }
    if (!email) return;
    void getMyInstitutionSettings(email)
      .then((res) => apply(res.institution.meeting_provider))
      .catch(() => undefined);
  }, [isLive]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const s = `${scheduleDateLabel(r)} ${dayLabel(r.day_of_week)} ${r.start_time} ${r.end_time} ${r.timezone ?? ""} ${r.notes ?? ""}`.toLowerCase();
      return s.includes(q);
    });
  }, [rows, search]);

  const resetForm = () => {
    setDayOfWeek(1);
    setSelectedDays([]);
    setStartTime("09:00");
    setEndTime("17:00");
    setMeetingDurationMinutes(60);
    setTimezone("");
    setNotes("");
    setMeetingProvider("daily");
  };

  const rowToZoomDetails = (row: AvailableScheduleRow): LiveZoomCohortZoomDetails | null => {
    const isDaily =
      row.meeting_provider === "daily" ||
      Boolean(row.daily_room_name) ||
      (typeof row.zoom_link === "string" && row.zoom_link.includes("daily.co"));
    if (!row.zoom_link && !row.zoom_meeting_id && !row.daily_room_name) return null;
    const publicJoinUrl = resolvePublicJoinUrl(`/live-cohort/${row.id}/join`);
    return {
      provider: isDaily ? "daily" : "zoom",
      topic: row.notes || undefined,
      meeting_id: (isDaily ? row.daily_room_name : row.zoom_meeting_id) ?? null,
      room_name: row.daily_room_name ?? null,
      join_url: isDaily ? publicJoinUrl : row.zoom_link ?? null,
      start_url: row.zoom_start_url ?? null,
      password: isDaily ? null : row.zoom_password ?? null,
      description: row.zoom_description ?? null,
      share_text: row.zoom_description ?? null,
      public_join_url: publicJoinUrl ?? null,
      schedule: {
        day: dayLabel(row.day_of_week),
        start_time: row.start_time,
        end_time: row.end_time,
        timezone: row.timezone,
      },
    };
  };

  const openZoomDetails = async (row: AvailableScheduleRow) => {
    setZoomDetailsCohortId(row.id ?? null);
    try {
      const data = await getLiveZoomCohortZoomDetails(row.id);
      setZoomDetails({
        ...data.zoom,
        provider: data.zoom.provider ?? (data as { provider?: string }).provider ?? "zoom",
        public_join_url: resolvePublicJoinUrl(data.zoom.public_join_url),
      });
      setZoomDetailsOpen(true);
    } catch (error: any) {
      const cached = rowToZoomDetails(row);
      if (cached) {
        setZoomDetails(cached);
        setZoomDetailsOpen(true);
        return;
      }
      toast({
        variant: "destructive",
        title: "Meeting details unavailable",
        description: error?.response?.data?.message || "Start the session first to create the live meeting.",
      });
    }
  };

  const handleCreate = async () => {
    if (!startTime || !endTime) {
      toast({
        variant: "destructive",
        title: "Invalid time",
        description: "Please select start and end time.",
        duration: 3500,
      });
      return;
    }

    if (selectedDays.length === 0) {
      toast({
        variant: "destructive",
        title: "No day selected",
        description: isLive
          ? "Please select at least one day for the live Zoom cohort."
          : "Please select at least one day for available meeting times.",
        duration: 3500,
      });
      return;
    }

    setSaving(true);
    try {
      // Always store the IANA timezone ID in DB; use labels only for display.
      const timezoneValue = timezone;

      if (isLive) {
        for (const dow of selectedDays) {
          const payload = {
            day_of_week: dow,
            start_time: startTime,
            end_time: endTime,
            timezone: timezoneValue,
            notes: notes || undefined,
            is_active: true,
            meeting_provider: meetingProvider,
          };

          await createLiveZoomCohort(payload);
        }
      } else {
        for (const dow of selectedDays) {
          const payload = {
            day_of_week: dow,
            start_time: startTime,
            end_time: endTime,
            meeting_duration_minutes: meetingDurationMinutes,
            timezone: timezoneValue,
            notes: notes || undefined,
            is_active: true,
          };

          await createAvailableSchedule(payload);
        }
      }

      toast({
        title: "Saved",
        description: isLive
          ? "Live Zoom cohort saved successfully."
          : "Available time saved successfully.",
        duration: 3000,
      });

      setCreateOpen(false);
      resetForm();
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.message ||
          (isLive ? "Failed to create live Zoom cohort." : "Failed to create schedule."),
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: AvailableScheduleRow) => {
    setEditing({
      ...row,
      start_time: normalizeTimeHHMM(row.start_time),
      end_time: normalizeTimeHHMM(row.end_time),
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editing?.id) return;

    setSaving(true);
    try {
      // Always keep timezone as IANA ID in DB; labels are used only when rendering.
      const timezoneValue = editing.timezone;

      const payload = {
        day_of_week: editing.day_of_week,
        start_time: normalizeTimeHHMM(editing.start_time),
        end_time: normalizeTimeHHMM(editing.end_time),
        meeting_duration_minutes: editing.meeting_duration_minutes ?? 60,
        timezone: timezoneValue ?? undefined,
        is_active: editing.is_active ?? true,
        notes: editing.notes ?? undefined,
        ...(isLive
          ? { meeting_provider: (editing.meeting_provider === "zoom" ? "zoom" : "daily") as "zoom" | "daily" }
          : {}),
      };

      if (isLive) {
        await updateLiveZoomCohort(editing.id, payload);
      } else {
        await updateAvailableSchedule(editing.id, payload);
      }

      toast({
        title: "Updated",
        description: isLive
          ? "Live Zoom cohort updated successfully."
          : "Available time updated successfully.",
        duration: 3000,
      });

      setEditOpen(false);
      setEditing(null);
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to update schedule.",
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (isLive) {
      await deleteLiveZoomCohort(id);
    } else {
      await deleteAvailableSchedule(id);
    }
  };

  const requestDelete = (row: AvailableScheduleRow) => {
    setDeleteRow(row);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteRow?.id) return;

    const id = deleteRow.id;
    setDeleting(true);
    try {
      await handleDelete(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirmOpen(false);
      setDeleteRow(null);
      toast({
        title: "Deleted",
        description: isLive ? "Live cohort deleted." : "Available time deleted.",
        duration: 2500,
      });
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete schedule.",
        duration: 4000,
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleStartSession = async (row: AvailableScheduleRow) => {
    if (!row.id) return;
    setSessionActionId(row.id);
    try {
      const res = await startLiveZoomCohortSession(row.id);
      const details = res.zoom ?? res.daily ?? null;
      toast({
        title: "Session started",
        description:
          res.message ||
          (res.provider === "daily"
            ? "Daily room ready. Share the join details with learners."
            : "Zoom meeting created. Learners can join the queue now."),
      });
      if (details) {
        setZoomDetails({
          ...details,
          provider: details.provider ?? res.provider ?? "zoom",
          public_join_url: resolvePublicJoinUrl(details.public_join_url),
        });
        setZoomDetailsCohortId(row.id);
        setZoomDetailsOpen(true);
      }
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not start session",
        description: error?.response?.data?.message || "Failed to start cohort session.",
      });
    } finally {
      setSessionActionId(null);
    }
  };

  const handleEndSession = async (row: AvailableScheduleRow) => {
    if (!row.id) return;
    setSessionActionId(row.id);
    try {
      await endLiveZoomCohortSession(row.id);
      toast({ title: "Session ended", description: "The cohort queue has been closed." });
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not end session",
        description: error?.response?.data?.message || "Failed to end cohort session.",
      });
    } finally {
      setSessionActionId(null);
    }
  };

  const sessionBadge = (status?: string | null) => {
    if (status === "live") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Live</Badge>;
    if (status === "ended") return <Badge variant="secondary">Ended</Badge>;
    return <Badge variant="outline">Idle</Badge>;
  };

  const saveCalendar = async (next: MeetingCalendarConfig) => {
    setSavingCalendar(true);
    try {
      const res = await updateMeetingCalendar(next);
      setCalendarConfig(res.calendar);
      toast({
        title: "Calendar updated",
        description: "Meeting registration availability has been saved.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not save calendar",
        description: error?.response?.data?.message || "Failed to update calendar availability.",
      });
    } finally {
      setSavingCalendar(false);
    }
  };

  const addBlockedMonth = async () => {
    if (!blockedMonthInput) return;
    const key = blockedMonthInput.slice(0, 7);
    if (calendarConfig.blocked_months.includes(key)) return;
    const next = {
      ...calendarConfig,
      blocked_months: [...calendarConfig.blocked_months, key].sort(),
    };
    setBlockedMonthInput("");
    await saveCalendar(next);
  };

  const addBlockedDate = async () => {
    if (!blockedDateInput) return;
    if (calendarConfig.blocked_dates.includes(blockedDateInput)) return;
    const next = {
      ...calendarConfig,
      blocked_dates: [...calendarConfig.blocked_dates, blockedDateInput].sort(),
    };
    setBlockedDateInput("");
    await saveCalendar(next);
  };

  const removeBlockedMonth = async (month: string) => {
    await saveCalendar({
      ...calendarConfig,
      blocked_months: calendarConfig.blocked_months.filter((m) => m !== month),
    });
  };

  const removeBlockedDate = async (date: string) => {
    await saveCalendar({
      ...calendarConfig,
      blocked_dates: calendarConfig.blocked_dates.filter((d) => d !== date),
    });
  };

  const handleCohortCalendarSaveBulk = async (payload: {
    dates: string[];
    start_time: string;
    end_time: string;
    meeting_duration_minutes?: number;
    timezone: string;
    notes: string;
  }) => {
    setSaving(true);
    try {
      const res = await bulkUpsertLiveZoomCohorts({
        dates: payload.dates,
        start_time: payload.start_time,
        end_time: payload.end_time,
        timezone: payload.timezone,
        notes: payload.notes || undefined,
        is_active: true,
      });
      toast({
        title: "Saved",
        description: res.message || `Cohort schedule set for ${payload.dates.length} day(s).`,
        duration: 3000,
      });
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to save cohort schedule.",
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCohortCalendarRemoveDates = async (dates: string[]) => {
    setSaving(true);
    try {
      const ids = dates
        .map((key) => rows.find((r) => normalizeScheduleDate(r.available_on_date ?? undefined) === key)?.id)
        .filter((id): id is number => Boolean(id));

      for (const id of ids) {
        await deleteLiveZoomCohort(id);
      }

      toast({
        title: "Removed",
        description: `Cohort schedule removed from ${ids.length} day(s).`,
        duration: 3000,
      });
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to remove cohort schedule.",
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCalendarSaveBulk = async (payload: {
    dates: string[];
    start_time: string;
    end_time: string;
    meeting_duration_minutes: number;
    timezone: string;
    notes: string;
  }) => {
    setSaving(true);
    try {
      const res = await bulkUpsertAvailableSchedules({
        dates: payload.dates,
        start_time: payload.start_time,
        end_time: payload.end_time,
        meeting_duration_minutes: payload.meeting_duration_minutes,
        timezone: payload.timezone,
        notes: payload.notes || undefined,
        is_active: true,
      });
      toast({
        title: "Saved",
        description: res.message || `Availability set for ${payload.dates.length} day(s).`,
        duration: 3000,
      });
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to save availability.",
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCalendarRemoveDates = async (dates: string[]) => {
    setSaving(true);
    try {
      const ids = dates
        .map((key) => rows.find((r) => String(r.available_on_date ?? "").slice(0, 10) === key)?.id)
        .filter((id): id is number => Boolean(id));

      for (const id of ids) {
        await deleteAvailableSchedule(id);
      }

      toast({
        title: "Removed",
        description: `Availability removed from ${ids.length} day(s).`,
        duration: 3000,
      });
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to remove availability.",
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const blockCalendarDate = async (date: string) => {
    if (calendarConfig.blocked_dates.includes(date)) return;
    await saveCalendar({
      ...calendarConfig,
      blocked_dates: [...calendarConfig.blocked_dates, date].sort(),
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            {pageTitle}
          </CardTitle>
          <CardDescription>
            {isLive
              ? "Create cohort slots, start the session (Daily or Zoom from institution settings), and manage the join queue."
              : embedded
                ? "Pick dates on the calendar and set open hours. Learners book those slots from the public registration page."
                : "Pick dates on the calendar and set open hours. Learners book those slots on Meeting Registration."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isLive && (
            <Collapsible open={blockingOpen} onOpenChange={setBlockingOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-sm transition-colors hover:bg-slate-100/80"
                >
                  <span>
                    <span className="font-medium text-slate-800">Closed dates</span>
                    <span className="ml-2 text-muted-foreground">
                      {calendarConfig.blocked_months.length + calendarConfig.blocked_dates.length > 0
                        ? `${calendarConfig.blocked_months.length + calendarConfig.blocked_dates.length} blocked`
                        : "Block months or days when bookings are off"}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      blockingOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="block-month">Block entire month</Label>
                    <div className="flex gap-2">
                      <Input
                        id="block-month"
                        type="month"
                        value={blockedMonthInput}
                        onChange={(e) => setBlockedMonthInput(e.target.value)}
                      />
                      <Button type="button" variant="secondary" onClick={addBlockedMonth} disabled={savingCalendar}>
                        Add
                      </Button>
                    </div>
                    {calendarConfig.blocked_months.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {calendarConfig.blocked_months.map((month) => (
                          <Badge key={month} variant="outline" className="gap-2">
                            {month}
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => removeBlockedMonth(month)}
                              aria-label={`Remove ${month}`}
                            >
                              Ã - 
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="block-date">Block specific date</Label>
                    <div className="flex gap-2">
                      <Input
                        id="block-date"
                        type="date"
                        value={blockedDateInput}
                        onChange={(e) => setBlockedDateInput(e.target.value)}
                      />
                      <Button type="button" variant="secondary" onClick={addBlockedDate} disabled={savingCalendar}>
                        Add
                      </Button>
                    </div>
                    {calendarConfig.blocked_dates.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {calendarConfig.blocked_dates.map((date) => (
                          <Badge key={date} variant="outline" className="gap-2">
                            {date}
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => removeBlockedDate(date)}
                              aria-label={`Remove ${date}`}
                            >
                              Ã - 
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  You can also close a single day from the calendar panel when editing availability.
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}

          <AdminMeetingAvailabilityCalendar
            variant={isLive ? "cohort" : "meeting"}
            schedules={rows}
            calendar={calendarConfig}
            bookedSlots={isLive ? [] : bookedSlots}
            loading={loading}
            saving={saving}
            timezoneOptions={COMMON_TIMEZONES.map((tz) => ({ iana: tz.iana, label: tz.label }))}
            onRefresh={load}
            onSaveBulk={isLive ? handleCohortCalendarSaveBulk : handleCalendarSaveBulk}
            onRemoveDates={isLive ? handleCohortCalendarRemoveDates : handleCalendarRemoveDates}
            onBlockDate={blockCalendarDate}
            onUnblockDate={removeBlockedDate}
          />

          {isLive && (
            <>
          <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
            <div className="w-full sm:max-w-md space-y-2">
              <Label htmlFor="search">Search scheduled cohorts</Label>
              <Input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by date, time, timezone..."
              />
            </div>
            <Button type="button" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh list"}
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[560px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-[14%]">Date</TableHead>
                    <TableHead className="w-[16%]">Time</TableHead>
                    <TableHead className="w-[18%]">Timezone / Country</TableHead>
                    <TableHead className="w-[10%]">Session</TableHead>
                    <TableHead className="w-[22%]">Notes</TableHead>
                    <TableHead className="w-[20%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        {emptyTableText}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r, idx) => (
                      <TableRow key={r.id} className={idx % 2 === 1 ? "bg-muted/30" : undefined}>
                        <TableCell className="font-medium">{scheduleDateLabel(r)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {r.start_time} - {r.end_time}
                            {r.timezone ? ` (${r.timezone})` : ""}
                          </Badge>
                        </TableCell>
                        <TableCell>{timezoneCountryLabel(r.timezone)}</TableCell>
                        <TableCell>{sessionBadge(r.session_status)}</TableCell>
                        <TableCell className="text-muted-foreground">{r.notes || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2 justify-end flex-wrap">
                            {(r.zoom_link || r.zoom_meeting_id || r.daily_room_name) && (
                              <Button type="button" size="sm" variant="outline" onClick={() => void openZoomDetails(r)}>
                                <Link2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              title="View attendance"
                              onClick={() => setAttendanceCohort(r)}
                            >
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                            {r.session_status !== "live" && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={sessionActionId === r.id}
                                onClick={() => void handleStartSession(r)}
                              >
                                {sessionActionId === r.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {r.session_status === "live" && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  title="Start live cohort"
                                  onClick={() =>
                                    openZoomMeetingInNewTab(cohortHostStudio(r.id!), {
                                      beginLaunch: false,
                                      launchTitle: r.title ?? "Live cohort",
                                      isHost: true,
                                    })
                                  }
                                >
                                  <Monitor className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setQueueCohort(r)}
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={sessionActionId === r.id}
                                  onClick={() => void handleEndSession(r)}
                                >
                                  {sessionActionId === r.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                            <Button type="button" size="sm" variant="outline" onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => requestDelete(r)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
            </>
          )}
        </CardContent>
      </Card>

      {isLive && (
      <>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDialogTitle}</DialogTitle>
            <DialogDescription>{editDialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Day</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editing?.day_of_week ?? 1}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, day_of_week: Number(e.target.value) } : prev))}
              >
                {dayOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={false}
                    className={cn(
                      "w-full justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
                      !(editing?.timezone ?? timezone) && "text-muted-foreground",
                    )}
                  >
                    <span className="truncate text-left">
                      {editing?.timezone ?? timezone
                        ? (COMMON_TIMEZONES.find((tz) => tz.iana === (editing?.timezone ?? timezone))?.label ??
                            (editing?.timezone ?? timezone))
                        : "Select timezone"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search timezone..."
                      value={timezoneSearch}
                      onValueChange={setTimezoneSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No timezone found.</CommandEmpty>
                      <CommandGroup>
                        {COMMON_TIMEZONES.filter((tz) =>
                          tz.label.toLowerCase().includes(timezoneSearch.trim().toLowerCase()),
                        ).map((tz) => (
                          <CommandItem
                            key={tz.iana}
                            value={tz.label}
                            onSelect={() => {
                              setEditing((prev) => (prev ? { ...prev, timezone: tz.iana } : prev));
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                (editing?.timezone ?? timezone) === tz.iana ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {tz.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={editing?.start_time ?? ""}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, start_time: e.target.value } : prev))}
              />
            </div>

            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={editing?.end_time ?? ""}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, end_time: e.target.value } : prev))}
              />
            </div>

            {!isLive && (
              <div className="space-y-2 md:col-span-2">
                <Label>Meeting duration (per booking)</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editing?.meeting_duration_minutes ?? 60}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev ? { ...prev, meeting_duration_minutes: Number(e.target.value) } : prev
                    )
                  }
                >
                  {[15, 30, 45, 60, 90, 120].map((mins) => (
                    <option key={mins} value={mins}>
                      {formatDurationMinutes(mins)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={editing?.notes ?? ""}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, notes: e.target.value } : prev))}
              />
            </div>

            {isLive && (
              <div className="space-y-2 md:col-span-2">
                <Label>Meeting platform</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditing((prev) => (prev ? { ...prev, meeting_provider: "daily" } : prev))
                    }
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      (editing?.meeting_provider ?? "daily") === "daily"
                        ? "border-[#0070D0] bg-[#0070D0] text-white"
                        : "border-input"
                    }`}
                  >
                    Daily (default)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing((prev) => (prev ? { ...prev, meeting_provider: "zoom" } : prev))
                    }
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      editing?.meeting_provider === "zoom"
                        ? "border-[#0070D0] bg-[#0070D0] text-white"
                        : "border-input"
                    }`}
                  >
                    Zoom
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applies the next time you start this cohort. Existing live sessions keep their current room.
                </p>
              </div>
            )}

            {isLive && editing?.zoom_link && (
              <div className="space-y-2 md:col-span-2">
                <Label>Zoom meeting</Label>
                <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm space-y-2">
                  <p>Meeting ID: {editing.zoom_meeting_id || "-"}</p>
                  <p className="truncate">Join: {editing.zoom_link}</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => void openZoomDetails(editing)}>
                    View copy / share options
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleEditSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialogText}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeleteRow(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
      )}

      {isLive && (
        <LiveCohortAttendanceDialog
          open={Boolean(attendanceCohort)}
          onOpenChange={(open) => {
            if (!open) setAttendanceCohort(null);
          }}
          cohort={attendanceCohort}
        />
      )}

      {isLive && (
        <LiveCohortQueueAdminDialog
          open={Boolean(queueCohort)}
          onOpenChange={(open) => {
            if (!open) setQueueCohort(null);
          }}
          cohort={queueCohort}
        />
      )}

      <ZoomSessionDetailsDialog
        open={zoomDetailsOpen}
        onOpenChange={setZoomDetailsOpen}
        zoom={zoomDetails}
        cohortId={zoomDetailsCohortId ?? undefined}
      />
    </div>
  );
};

export default AvailableSchedules;
