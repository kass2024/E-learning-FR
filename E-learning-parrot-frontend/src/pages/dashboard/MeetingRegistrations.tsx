import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { fetchDashboardCached, readDashboardCache } from "@/lib/dashboardCache";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { Ban, BellRing, CalendarClock, CheckCircle2, ExternalLink, Link2, Loader2, MoreVertical, Pencil, Share2, Trash2, Video } from "lucide-react";
import {
  approveMeetingRegistration,
  deleteMeetingRegistration,
  getAvailableSchedules,
  getMeetingRegistrations,
  getWebinarStatus,
  rejectMeetingRegistration,
  remindMeetingRegistration,
  rescheduleMeetingRegistration,
  resendMeetingRegistrationJoinLink,
  setWebinarRecording,
  startWebinar,
  updateMeetingRegistration,
  type LiveZoomCohortZoomDetails,
  type WebinarStatus,
} from "@/api/axios";
import { ZoomSessionDetailsDialog } from "@/components/live/ZoomSessionDetailsDialog";
import { absoluteAppUrl, openZoomMeetingInNewTab, webinarHostRoom, zoomMeetingEmbedRoom } from "@/lib/zoomEmbedRoutes";
import { parseAvailableSchedulesResponse, availabilityWindowLabel, formatRegistrationScheduleForViewer, formatStoredLearnerTimezone, getBrowserTimezone } from "@/lib/meetingScheduleUtils";
import Swal from "sweetalert2";
import { Switch } from "@/components/ui/switch";

export type MeetingRegistrationRow = {
  id: number;
  user_id?: number | null;
  available_schedule_id?: number | null;
  schedule_label?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  notes?: string | null;
  status?: string | null;
  rejected_reason?: string | null;
  zoom_meeting_id?: string | null;
  zoom_join_url?: string | null;
  zoom_start_time?: string | null;
  availableSchedule?: {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    meeting_duration_minutes?: number | null;
    timezone?: string | null;
    is_active?: boolean;
    notes?: string | null;
  } | null;
  available_schedule?: {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    meeting_duration_minutes?: number | null;
    timezone?: string | null;
    is_active?: boolean;
    notes?: string | null;
  } | null;
  created_at?: string;
};

function registrationParticipantJoinPath(
  registration: Pick<MeetingRegistrationRow, "zoom_meeting_id" | "full_name" | "email">,
) {
  if (!registration.zoom_meeting_id) return null;
  // Participant (registrant) link - joins under the registered person's name.
  return zoomMeetingEmbedRoom(registration.zoom_meeting_id, 0, undefined, {
    userName: registration.full_name,
    userEmail: registration.email,
  });
}

function adminHostJoinPath() {
  // Host / institution admin joins with logged-in host identity via webinar_host auth.
  return webinarHostRoom();
}

function webinarStatusToShareDetails(status: WebinarStatus | null): LiveZoomCohortZoomDetails | null {
  if (!status) return null;

  const registrationUrl = status.registration_url || absoluteAppUrl("/meeting-registration");
  const meetingId = status.zoom_meeting_id?.trim();
  if (!meetingId) {
    return {
      topic: status.topic || "Meeting Registration Webinar",
      share_text:
        status.share_text ||
        `Meeting Registration - Pathways Webinar\nRegistration page: ${registrationUrl}\nStart the meeting from Meeting Registration when you are ready to host.`,
      registration_url: registrationUrl,
      public_join_url: registrationUrl,
      embed_enabled: true,
    };
  }

  const participantPath = status.app_participant_join_path || zoomMeetingEmbedRoom(meetingId, 0);
  const hostPath = status.app_host_room_path || webinarHostRoom();

  return {
    topic: status.topic || "Meeting Registration Webinar",
    meeting_id: meetingId,
    join_url: status.join_url ?? null,
    start_url: status.start_url ?? null,
    password: status.password ?? null,
    share_text: status.share_text ?? null,
    registration_url: registrationUrl,
    public_join_url: registrationUrl,
    participant_room_path: participantPath,
    participant_room_url: status.app_participant_join_url || absoluteAppUrl(participantPath),
    host_studio_path: hostPath,
    host_studio_url: status.app_host_room_url || absoluteAppUrl(hostPath),
    embed_enabled: true,
  };
}

const DEFAULT_RESCHEDULE_MESSAGE =
  "Dear Valued Customer,\n\nWe sincerely apologize for any inconvenience. Due to an unexpected scheduling conflict, we need to reschedule your appointment. Please let us know your preferred date and time, and we will do our best to accommodate you. Thank you for your patience and understanding.";

type MeetingRegistrationsProps = {
  /** When true, page is shown inside Appointments tabs (lighter heading). */
  embedded?: boolean;
};

const MeetingRegistrations = ({ embedded = false }: MeetingRegistrationsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState<MeetingRegistrationRow[]>([]);
  const [webinarStatus, setWebinarStatus] = useState<WebinarStatus | null>(null);
  const [startingWebinar, setStartingWebinar] = useState(false);
  const [shareDetailsOpen, setShareDetailsOpen] = useState(false);
  const [togglingRecording, setTogglingRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableSchedules, setAvailableSchedules] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<MeetingRegistrationRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectingRow, setRejectingRow] = useState<MeetingRegistrationRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reschedulingRow, setReschedulingRow] = useState<MeetingRegistrationRow | null>(null);
  const [rescheduleScheduleId, setRescheduleScheduleId] = useState<string>("none");
  const [rescheduleMessage, setRescheduleMessage] = useState(DEFAULT_RESCHEDULE_MESSAGE);
  const [rescheduling, setRescheduling] = useState(false);

  const [approving, setApproving] = useState(false);

  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [approveRow, setApproveRow] = useState<MeetingRegistrationRow | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<MeetingRegistrationRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [rejectConfirmRow, setRejectConfirmRow] = useState<MeetingRegistrationRow | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [resendingJoinLinkId, setResendingJoinLinkId] = useState<number | null>(null);

  const load = async (force = false) => {
    const cacheKey = "meeting-registrations-bundle";
    const cached = !force ? readDashboardCache<{
      regs: unknown;
      schedules: unknown;
      status: unknown;
    }>(cacheKey) : null;

    if (cached) {
      setRows(Array.isArray(cached.regs) ? cached.regs : (cached.regs as { data?: MeetingRegistrationRow[] })?.data ?? []);
      setAvailableSchedules(parseAvailableSchedulesResponse(cached.schedules).schedules);
      setWebinarStatus(cached.status as typeof webinarStatus);
      setLoading(false);
    } else if (rows.length === 0) {
      setLoading(true);
    }

    try {
      const { data } = await fetchDashboardCached(
        cacheKey,
        async () => {
          const [regs, schedules, status] = await Promise.all([
            getMeetingRegistrations(),
            getAvailableSchedules(),
            getWebinarStatus(),
          ]);
          return { regs, schedules, status };
        },
        { force },
      );
      setRows(Array.isArray(data.regs) ? data.regs : (data.regs as { data?: MeetingRegistrationRow[] })?.data ?? []);
      setAvailableSchedules(parseAvailableSchedulesResponse(data.schedules).schedules);
      setWebinarStatus(data.status as typeof webinarStatus);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to load meeting registrations.",
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemind = async (id: number) => {
    toast({
      title: "Sending reminder...",
      description: "Please wait.",
      duration: 2000,
    });

    try {
      await remindMeetingRegistration(id);
      toast({
        title: "Reminder sent",
        description: "Reminder email was sent successfully.",
        duration: 3500,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to send reminder.",
        duration: 4000,
      });
    }
  };

  const handleResendJoinLink = async (row: MeetingRegistrationRow) => {
    if (!row.id || !row.email) return;

    setResendingJoinLinkId(row.id);
    toast({
      title: "Resending join link...",
      description: `Sending Zoom link to ${row.email}.`,
      duration: 2000,
    });

    try {
      const res = await resendMeetingRegistrationJoinLink(row.id);
      const updated = res?.registration as MeetingRegistrationRow | undefined;
      if (updated?.id) {
        setRows((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      }
      toast({
        title: "Join link sent",
        description: res?.message || `Zoom join link emailed to ${row.email}.`,
        duration: 4000,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to resend join link.",
        duration: 4000,
      });
    } finally {
      setResendingJoinLinkId(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const managerTimezone = useMemo(() => getBrowserTimezone() ?? "Africa/Kigali", []);

  const scheduleLabel = (s: any) => availabilityWindowLabel(s);

  const registrationScheduleLabel = (r: MeetingRegistrationRow) =>
    formatRegistrationScheduleForViewer(r, managerTimezone);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const statusQ = statusFilter === "all" ? "" : statusFilter;

    return rows.filter((r) => {
      const status = (r.status ?? "Pending").toLowerCase();
      const matchesStatus = statusQ ? status === statusQ : true;
      if (!matchesStatus) return false;

      if (!q) return true;
      return (
        (r.full_name ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q) ||
        (r.country ?? "").toLowerCase().includes(q) ||
        registrationScheduleLabel(r).toLowerCase().includes(q) ||
        status.includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, statusFilter, pageSize, page]);

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const pageSelectedCount = paginated.reduce((acc, r) => (selectedIds.has(r.id) ? acc + 1 : acc), 0);
  const isAllPageSelected = paginated.length > 0 && pageSelectedCount === paginated.length;
  const isSomePageSelected = pageSelectedCount > 0 && pageSelectedCount < paginated.length;

  const isApproved = (r?: MeetingRegistrationRow | null) => (r?.status ?? "Pending").toLowerCase() === "approved";
  const isCancelled = (r?: MeetingRegistrationRow | null) => {
    const status = (r?.status ?? "").toLowerCase();
    return status === "cancelled" || status === "canceled";
  };

  const approvedParticipantCount =
    webinarStatus?.approved_participants ??
    rows.filter((r) => isApproved(r)).length;

  const canStartWebinar = approvedParticipantCount > 0;

  const canShareMeetingDetails = canStartWebinar;

  const handleOpenShareDetails = async () => {
    try {
      const fresh = await getWebinarStatus();
      setWebinarStatus(fresh);
      setShareDetailsOpen(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not load meeting details",
        description: error?.response?.data?.message || "Try again in a moment.",
        duration: 4000,
      });
    }
  };

  const handleToggleRecording = async (enabled: boolean) => {
    setTogglingRecording(true);
    try {
      const res = await setWebinarRecording(enabled);
      setWebinarStatus((prev) =>
        prev ? { ...prev, recording_enabled: res.recording_enabled } : prev
      );
      toast({
        title: res.recording_enabled ? "Recording enabled" : "Recording disabled",
        description: res.message,
        duration: 3500,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Recording setting failed",
        description: error?.response?.data?.message || "Could not update Zoom recording settings.",
        duration: 4000,
      });
    } finally {
      setTogglingRecording(false);
    }
  };

  const handleStartWebinar = async () => {
    if (!canStartWebinar) {
      toast({
        variant: "destructive",
        title: "Cannot start webinar",
        description: "At least one approved registration is required before starting the webinar.",
        duration: 4000,
      });
      return;
    }

    setStartingWebinar(true);
    try {
      const res = await startWebinar();
      if (!res.zoom_meeting_id && !webinarStatus?.start_url && !res.start_url) {
        toast({
          variant: "destructive",
          title: "No meeting ready",
          description: "Meeting provider did not return a room. Check Daily/Zoom credentials on the server.",
          duration: 5000,
        });
        return;
      }
      setWebinarStatus((prev) =>
        prev
          ? {
              ...prev,
              can_start: true,
              approved_participants: res.approved_participants ?? prev.approved_participants,
              recording_enabled: res.recording_enabled ?? prev.recording_enabled,
              start_url: res.start_url ?? prev.start_url,
            }
          : prev
      );
      toast({
        title: "Webinar started",
        description: res.message || "Opening in-app host studio.",
        duration: 3500,
      });
      openZoomMeetingInNewTab(webinarHostRoom(), {
        beginLaunch: false,
        launchTitle: "Meeting Registration",
        isHost: true,
      });
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Cannot start webinar",
        description:
          error?.response?.data?.message ||
          "No approved participants or the meeting provider is not configured correctly.",
        duration: 4500,
      });
    } finally {
      setStartingWebinar(false);
    }
  };

  const toggleSelectAllOnPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of paginated) {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds).filter((id) => {
      const row = rows.find((r) => r.id === id);
      return !isApproved(row);
    });
    if (ids.length === 0) return;

    setBulkApproving(true);
    try {
      for (const id of ids) {
        await approveMeetingRegistration(id);
      }

      toast({
        title: "Bulk Approved",
        description: `Approved ${ids.length} registration(s).`,
        duration: 3500,
      });

      setBulkApproveOpen(false);
      setSelectedIds(new Set());
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to bulk approve registrations.",
        duration: 4000,
      });
    } finally {
      setBulkApproving(false);
    }
  };

  const openEdit = (r: MeetingRegistrationRow) => {
    setEditing({ ...r });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.id) return;
    setSaving(true);
    try {
      await updateMeetingRegistration(editing.id, {
        full_name: editing.full_name,
        email: editing.email,
        phone: editing.phone ?? "",
        country: editing.country ?? "",
        notes: editing.notes ?? "",
        status: editing.status ?? "Pending",
        available_schedule_id: editing.available_schedule_id ?? null,
      });
      toast({
        title: "Updated",
        description: "Meeting registration updated successfully.",
        duration: 3000,
      });
      setEditOpen(false);
      setEditing(null);
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to update registration.",
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: number) => {
    toast({
      title: "Approving...",
      description: "Please wait.",
      duration: 2000,
    });
    setApproving(true);
    try {
      const res = await approveMeetingRegistration(id);
      const joinUrl = res?.registration?.zoom_join_url ?? res?.zoom_join_url ?? null;
      await Swal.fire({
        icon: "success",
        title: "Meeting Approved",
        html: joinUrl
          ? `Zoom Link: <a href="${joinUrl}" target="_blank" rel="noreferrer">${joinUrl}</a>`
          : "Meeting registration approved.",
        confirmButtonText: "OK",
      });

      toast({
        title: "Meeting Approved",
        description: joinUrl ? "Zoom link is ready and sent to email." : "Approved successfully.",
        duration: 3500,
      });

      void load(true);

      setApproveConfirmOpen(false);
      setApproveRow(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to approve registration.",
        duration: 4000,
      });
    } finally {
      setApproving(false);
    }
  };

  const openApproveConfirm = (r: MeetingRegistrationRow) => {
    if (isApproved(r)) return;
    setApproveRow(r);
    setApproveConfirmOpen(true);
  };

  const openRejectConfirm = (r: MeetingRegistrationRow) => {
    setRejectConfirmRow(r);
    setRejectConfirmOpen(true);
  };

  const openDeleteConfirm = (r: MeetingRegistrationRow) => {
    setDeleteRow(r);
    setDeleteConfirmOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingRow?.id) return;
    if (!rejectReason.trim()) {
      toast({
        variant: "destructive",
        title: "Reason required",
        description: "Please enter a reject reason.",
        duration: 4000,
      });
      return;
    }

    setRejecting(true);
    try {
      await rejectMeetingRegistration(rejectingRow.id, rejectReason.trim());
      toast({
        title: "Rejected",
        description: "Meeting registration rejected.",
        duration: 3000,
      });
      setRejectOpen(false);
      setRejectingRow(null);
      setRejectReason("");
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to reject registration.",
        duration: 4000,
      });
    } finally {
      setRejecting(false);
    }
  };

  const openReschedule = (r: MeetingRegistrationRow) => {
    setReschedulingRow(r);
    setRescheduleScheduleId(r.available_schedule_id ? String(r.available_schedule_id) : "none");
    setRescheduleMessage(DEFAULT_RESCHEDULE_MESSAGE);
    setRescheduleOpen(true);
  };

  const handleReschedule = async () => {
    if (!reschedulingRow?.id) return;

    setRescheduling(true);
    try {
      await rescheduleMeetingRegistration(reschedulingRow.id, {
        available_schedule_id: rescheduleScheduleId === "none" ? null : Number(rescheduleScheduleId),
        message: rescheduleMessage.trim() || null,
      });
      toast({
        title: "Reschedule request sent",
        description: "An apology email with rebook / cancel options was sent to the attendee.",
        duration: 4000,
      });
      setRescheduleOpen(false);
      setReschedulingRow(null);
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.message || "Failed to send reschedule request.",
        duration: 4000,
      });
    } finally {
      setRescheduling(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await deleteMeetingRegistration(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirmOpen(false);
      setDeleteRow(null);
      toast({
        variant: "destructive",
        title: "Deleted",
        description: "Meeting registration deleted.",
        duration: 2500,
      });
      void load(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to delete registration.",
        duration: 4000,
      });
    } finally {
      setDeleting(false);
    }
  };

  const statusBadge = (value?: string | null) => {
    const v = (value ?? "Pending").toLowerCase();
    if (v === "approved") return <Badge className="bg-green-600 hover:bg-green-600">Approved</Badge>;
    if (v === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    if (v === "rescheduled") return <Badge className="bg-amber-500 hover:bg-amber-500">Rescheduled</Badge>;
    if (v === "cancelled" || v === "canceled") return <Badge variant="outline" className="text-slate-500">Cancelled</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  const destinationBadges = (value?: string | null) => {
    const formatted = formatStoredLearnerTimezone(value);
    if (formatted === "-") return "-";
    return (
      <Badge variant="outline" className="bg-background text-xs font-normal">
        {formatted}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {embedded ? "Booking requests" : "Appointments"}
              </CardTitle>
              {embedded ? (
                <CardDescription className="mt-1">
                  Approve, reject, or reschedule learner booking requests.
                </CardDescription>
              ) : null}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 rounded-full border px-4 py-2 bg-muted/30">
                <Video className="h-4 w-4 text-primary shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">Cloud recording</span>
                  <p className="text-xs text-muted-foreground">Enable before starting the session</p>
                </div>
                <Switch
                  checked={Boolean(webinarStatus?.recording_enabled)}
                  disabled={togglingRecording || loading}
                  onCheckedChange={handleToggleRecording}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={!canShareMeetingDetails || loading}
                onClick={() => void handleOpenShareDetails()}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share meeting details
              </Button>
              <Button
                type="button"
                className="rounded-full bg-primary hover:bg-primary/90"
                disabled={!canStartWebinar || startingWebinar || loading}
                onClick={handleStartWebinar}
              >
                {startingWebinar ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting...
                  </span>
                ) : (
                  <>
                    Start Meeting
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
          <CardDescription>
            View list of meeting registrations. Registrations are approved automatically when submitted.
            {!canStartWebinar ? (
              <span className="mt-2 block text-amber-700">
                Start Meeting is disabled until at least one participant is registered and approved ({approvedParticipantCount} approved).
              </span>
            ) : (
              <span className="mt-2 block text-emerald-700">
                {approvedParticipantCount} approved participant{approvedParticipantCount === 1 ? "" : "s"} ready.
                Click Start Meeting to create a Daily session and open the in-app host room.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="w-full sm:max-w-md space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email, phone, country..."
                  />
                </div>

                <div className="w-full sm:w-56 space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-44 space-y-2">
                  <Label>Rows</Label>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  onClick={() => setBulkApproveOpen(true)}
                  disabled={selectedIds.size === 0 || loading || bulkApproving}
                >
                  {bulkApproving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Approving...
                    </span>
                  ) : (
                    `Approve Selected (${selectedIds.size})`
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={load} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{total ? startIndex + 1 : 0}</span> to{" "}
              <span className="font-medium text-foreground">{Math.min(startIndex + pageSize, total)}</span> of{" "}
              <span className="font-medium text-foreground">{total}</span> registrations
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[560px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-[3%]">
                      <Checkbox
                        checked={isAllPageSelected ? true : isSomePageSelected ? "indeterminate" : false}
                        onCheckedChange={(v) => toggleSelectAllOnPage(Boolean(v))}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-[4%]">No</TableHead>
                    <TableHead className="w-[19%]">Name</TableHead>
                    <TableHead className="w-[22%]">Email</TableHead>
                    <TableHead className="w-[14%]">Phone</TableHead>
                    <TableHead className="w-[12%]">Learner timezone</TableHead>
                    <TableHead className="w-[16%]">Schedule (your time)</TableHead>
                    <TableHead className="w-[10%]">Status</TableHead>
                    <TableHead className="w-[10%]">Zoom</TableHead>
                    <TableHead className="w-[6%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        No registrations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((r, idx) => (
                      <TableRow key={r.id} className={idx % 2 === 1 ? "bg-muted/30" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(r.id)}
                            onCheckedChange={(v) => toggleSelected(r.id, Boolean(v))}
                            aria-label={`Select ${r.full_name}`}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{startIndex + idx + 1}</TableCell>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.phone || "-"}</TableCell>
                        <TableCell>{destinationBadges(r.country)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {registrationScheduleLabel(r)}
                        </TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell>
                          {isCancelled(r) ? (
                            <span
                              className="text-xs text-muted-foreground"
                              title="Join is disabled for cancelled appointments"
                            >
                              Join in app
                            </span>
                          ) : r.zoom_meeting_id ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
                              title="Join as host (your institution / admin name)"
                              onClick={() => {
                                openZoomMeetingInNewTab(adminHostJoinPath(), {
                                  beginLaunch: false,
                                  launchTitle: "Meeting Registration",
                                  isHost: true,
                                });
                              }}
                            >
                              Join in app
                            </button>
                          ) : r.zoom_join_url ? (
                            <span className="text-xs text-muted-foreground">Pending meeting ID</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem disabled={isApproved(r)} onClick={() => openApproveConfirm(r)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!r.email}
                                onClick={() => {
                                  if (r.id) handleRemind(r.id);
                                }}
                              >
                                <BellRing className="h-4 w-4 mr-2" />
                                Remind
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isCancelled(r) || !isApproved(r) || !r.zoom_meeting_id}
                                onClick={() => {
                                  const path = registrationParticipantJoinPath(r);
                                  if (!path) return;
                                  void navigator.clipboard.writeText(absoluteAppUrl(path)).then(
                                    () =>
                                      toast({
                                        title: "Copied",
                                        description: `Join link for ${r.full_name} copied (opens as that registrant).`,
                                      }),
                                    () =>
                                      toast({
                                        variant: "destructive",
                                        title: "Copy failed",
                                        description: "Could not copy the join link.",
                                      }),
                                  );
                                }}
                              >
                                <Link2 className="h-4 w-4 mr-2" />
                                Copy join link
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isCancelled(r) || !isApproved(r) || !r.email || resendingJoinLinkId === r.id}
                                onClick={() => handleResendJoinLink(r)}
                              >
                                {resendingJoinLinkId === r.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Link2 className="h-4 w-4 mr-2" />
                                )}
                                Resend join link
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={!r.email} onClick={() => openReschedule(r)}>
                                <CalendarClock className="h-4 w-4 mr-2" />
                                Reschedule
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openRejectConfirm(r)}>
                                <Ban className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(r)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => openDeleteConfirm(r)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                />
              </PaginationItem>

              {Array.from({ length: Math.min(5, pageCount) }).map((_, i) => {
                const pageNumber = i + 1;
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === currentPage}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(pageCount, p + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Meeting Registration</DialogTitle>
            <DialogDescription>Update details, then save.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Full Name</Label>
              <Input
                id="edit_full_name"
                value={editing?.full_name ?? ""}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, full_name: e.target.value } : prev))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={editing?.email ?? ""}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Phone</Label>
              <Input
                id="edit_phone"
                value={editing?.phone ?? ""}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, phone: e.target.value } : prev))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_country">Country</Label>
              <Input
                id="edit_country"
                value={editing?.country ?? ""}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, country: e.target.value } : prev))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit_status">Status</Label>
              <Input
                id="edit_status"
                value={editing?.status ?? "Pending"}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, status: e.target.value } : prev))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Input
                id="edit_notes"
                value={editing?.notes ?? ""}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, notes: e.target.value } : prev))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Available Schedule</Label>
              <Select
                value={String(editing?.available_schedule_id ?? "none")}
                onValueChange={(v) =>
                  setEditing((prev) =>
                    prev ? { ...prev, available_schedule_id: v === "none" ? null : Number(v) } : prev
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableSchedules.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {scheduleLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={approveConfirmOpen}
        onOpenChange={(open) => {
          if (approving) return;
          setApproveConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Meeting Registration</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <div>
                  Approve this meeting registration{approveRow?.email ? ` for ${approveRow.email}` : ""}?
                </div>
                {editing?.zoom_meeting_id ? (
                  <div className="rounded-md border p-3 text-sm">
                    <div className="font-medium">In-app join</div>
                    <div className="mt-1">
                      <button
                        type="button"
                        className="text-blue-600 underline"
                        onClick={() => {
                          const path = registrationParticipantJoinPath(editing);
                          if (path) {
                            openZoomMeetingInNewTab(path, {
                              beginLaunch: false,
                              launchTitle: editing.full_name || "Participant preview",
                              isHost: false,
                            });
                          }
                        }}
                      >
                        Preview participant room
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="text-sm">
                  <div className="font-medium">Notes</div>
                  <div className="mt-1 whitespace-pre-wrap text-slate-700">{editing?.notes || "-"}</div>
                </div>
                {approving ? (
                  <div className="rounded-md border p-3 text-sm bg-muted/30">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing approval, please wait...
                    </div>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={approving}
              onClick={() => {
                if (approveRow?.id) {
                  handleApprove(approveRow.id);
                }
              }}
            >
              {approving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Approving...
                </span>
              ) : (
                "Approve"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (deleting) return;
          setDeleteConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the meeting registration{deleteRow?.email ? ` for ${deleteRow.email}` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={() => {
                if (deleteRow?.id) {
                  handleDelete(deleteRow.id);
                }
              }}
            >
              {deleting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkApproveOpen}
        onOpenChange={(open) => {
          if (bulkApproving) return;
          setBulkApproveOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Selected Registrations</AlertDialogTitle>
            <AlertDialogDescription>
              Approve <strong>{selectedIds.size}</strong> selected registration(s)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkApproving}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={bulkApproving} onClick={handleBulkApprove}>
              {bulkApproving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Approving...
                </span>
              ) : (
                "Approve All"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Reject this meeting registration{rejectConfirmRow?.email ? ` for ${rejectConfirmRow.email}` : ""}? You will be asked to enter a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (rejectConfirmRow) {
                  setRejectConfirmOpen(false);
                  setRejectingRow(rejectConfirmRow);
                  setRejectReason("");
                  setRejectOpen(true);
                }
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reject Meeting Registration</DialogTitle>
            <DialogDescription>Enter a reason. This reason will be sent by email.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reject_reason">Reject Reason</Label>
            <Textarea
              id="reject_reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Type reject reason..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={rejecting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={handleReject} disabled={rejecting}>
              {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reschedule Meeting</DialogTitle>
            <DialogDescription>
              Optionally propose a new time, then send an apology email that lets the attendee book another meeting or cancel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Propose a new time (optional)</Label>
              <Select value={rescheduleScheduleId} onValueChange={setRescheduleScheduleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Let the attendee choose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Let the attendee choose</SelectItem>
                  {availableSchedules.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {scheduleLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reschedule_message">Apology message</Label>
              <Textarea
                id="reschedule_message"
                value={rescheduleMessage}
                onChange={(e) => setRescheduleMessage(e.target.value)}
                rows={7}
              />
              <p className="text-xs text-muted-foreground">
                This message is emailed to the attendee along with "Book another meeting" and "Cancel appointment" buttons.
              </p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={rescheduling}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleReschedule} disabled={rescheduling}>
              {rescheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reschedule email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ZoomSessionDetailsDialog
        open={shareDetailsOpen}
        onOpenChange={setShareDetailsOpen}
        zoom={webinarStatusToShareDetails(webinarStatus)}
        title="Share meeting details"
        description="Copy registration and in-app join links for approved participants. Hosts use Start Meeting to open the in-app host room."
      />
    </div>
  );
};

export default MeetingRegistrations;
