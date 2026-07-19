import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmartSearchInput } from "@/components/admin/SmartSearchInput";
import { StudyShiftCard } from "@/components/study-shifts/StudyShiftCard";
import {
  StudyShiftCalendlyEditor,
  validateCalendlyForm,
  type CalendlyShiftForm,
} from "@/components/study-shifts/StudyShiftCalendlyEditor";
import { newStudyShiftTimeSlot } from "@/lib/studyShiftUtils";
import { resolveDefaultTimezone } from "@/lib/commonTimezones";
import {
  createStudyShift,
  deleteStudyShift,
  getCourses,
  getInstructorAssignedCourses,
  getStudyShifts,
  updateStudyShift,
  type CoursePayload,
  type StudyShiftRow,
} from "@/api/axios";
import { WEEKDAY_OPTIONS, getWeekdayLabel, sortShiftsByTime } from "@/lib/studyShiftUtils";
import { cn } from "@/lib/utils";
import { fetchDashboardCached, readDashboardCache } from "@/lib/dashboardCache";
import { dashboardCacheKey, resolveInstructorEmail } from "@/lib/dashboardUser";
import { initialDashboardLoading, readCachedDashboardData } from "@/lib/dashboardInitialLoad";
import {
  CalendarClock,
  CalendarDays,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";

const emptyForm = (): CalendlyShiftForm => ({
  course_id: null,
  course_ids: [],
  name: "",
  days_of_week: [],
  time_slots: [],
  start_time: "09:00",
  end_time: "11:00",
  timezone: resolveDefaultTimezone(),
  max_students: null,
  is_active: true,
  notes: "",
});

type ViewMode = "week" | "list";
type StatusFilter = "all" | "active" | "inactive" | "full";

const StudyShiftsManagement = () => {
  const { toast } = useToast();
  const userEmail = resolveInstructorEmail() || null;
  const userRole =
    typeof window !== "undefined"
      ? (localStorage.getItem("parrot_user_role") || "").toLowerCase()
      : "";
  const isAdmin =
    userRole === "admin" || userRole === "staff" || userRole === "superadmin" || userRole === "partner_company";
  const isInstructor = userRole === "instructor";

  const shiftCacheKey = userEmail ? dashboardCacheKey("study-shifts-list", userEmail) : "";
  const initialShiftData = shiftCacheKey
    ? readCachedDashboardData<{ study_shifts?: StudyShiftRow[] }>(shiftCacheKey)
    : null;

  const [loading, setLoading] = useState(() =>
    shiftCacheKey ? initialDashboardLoading(shiftCacheKey) : !userEmail,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shifts, setShifts] = useState<StudyShiftRow[]>(() => initialShiftData?.study_shifts ?? []);
  const [courses, setCourses] = useState<CoursePayload[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StudyShiftRow | null>(null);
  const [form, setForm] = useState<CalendlyShiftForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<StudyShiftRow | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!userEmail) {
        setLoading(false);
        return;
      }
      if (silent) setRefreshing(true);
      else if (!readDashboardCache(shiftCacheKey)) setLoading(true);
      try {
        const [shiftResult, courseList] = await Promise.all([
          fetchDashboardCached(shiftCacheKey, () =>
            getStudyShifts({
              active_only: false,
              group_by_day: true,
              manage: true,
              email: userEmail,
            })
          ),
          isInstructor
            ? fetchDashboardCached(dashboardCacheKey("instructor-courses", userEmail), () =>
                getInstructorAssignedCourses(userEmail),
              ).then(({ data }) => {
                const list = (data as { courses?: CoursePayload[] }).courses;
                return Array.isArray(list) ? list : [];
              })
            : fetchDashboardCached("courses-list", getCourses).then(({ data }) =>
                Array.isArray(data) ? data : []
              ),
        ]);
        const shiftData = shiftResult.data;
        setShifts(shiftData.study_shifts ?? []);
        setCourses(courseList);
      } catch {
        toast({ variant: "destructive", title: "Failed to load study shifts" });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast, userEmail, isInstructor, shiftCacheKey]
  );

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let rows = shifts;
    if (courseFilter === "global") rows = rows.filter((s) => !s.course_id);
    else if (courseFilter !== "all")
      rows = rows.filter(
        (s) =>
          String(s.course_id) === courseFilter ||
          (s.course_ids ?? []).map(String).includes(courseFilter)
      );
    if (dayFilter !== "all") rows = rows.filter((s) => String(s.day_of_week) === dayFilter);
    if (statusFilter === "active") rows = rows.filter((s) => s.is_active && !s.is_full);
    else if (statusFilter === "inactive") rows = rows.filter((s) => !s.is_active);
    else if (statusFilter === "full") rows = rows.filter((s) => s.is_full);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((s) =>
        [
          s.name,
          s.course_title,
          ...(s.course_titles ?? []),
          s.created_by_name,
          s.day_label,
          s.start_time,
          s.end_time,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return rows;
  }, [shifts, courseFilter, dayFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const active = shifts.filter((s) => s.is_active).length;
    const full = shifts.filter((s) => s.is_full).length;
    const enrolled = shifts.reduce((sum, s) => sum + (s.enrolled_count ?? 0), 0);
    const daysCovered = new Set(shifts.map((s) => s.day_of_week)).size;
    return { total: shifts.length, active, full, enrolled, daysCovered };
  }, [shifts]);

  const weekBoard = useMemo(
    () =>
      WEEKDAY_OPTIONS.map((day) => ({
        ...day,
        shifts: sortShiftsByTime(filtered.filter((s) => s.day_of_week === day.value)),
      })),
    [filtered]
  );

  const listGrouped = useMemo(() => weekBoard.filter((d) => d.shifts.length > 0), [weekBoard]);

  const openCreate = (dayOfWeek?: number) => {
    setEditing(null);
    const defaultCourseIds =
      courseFilter !== "all" && courseFilter !== "global" ? [Number(courseFilter)] : [];
    setForm({
      ...emptyForm(),
      days_of_week: dayOfWeek != null ? [dayOfWeek] : [],
      course_ids: isInstructor
        ? defaultCourseIds.length
          ? defaultCourseIds
          : courses[0]?.id
            ? [courses[0].id]
            : []
        : defaultCourseIds,
      course_id: defaultCourseIds[0] ?? courses[0]?.id ?? null,
    });
    setDialogOpen(true);
  };

  const openEdit = (shift: StudyShiftRow) => {
    if (!shift.can_manage) return;
    const slot = newStudyShiftTimeSlot(shift.start_time, shift.end_time);
    slot.name = shift.name;
    setEditing(shift);
    setForm({
      course_id: shift.course_ids?.[0] ?? shift.course_id,
      course_ids: shift.course_ids?.length
        ? shift.course_ids
        : shift.course_id
          ? [shift.course_id]
          : [],
      name: shift.name,
      days_of_week: [shift.day_of_week],
      time_slots: [slot],
      start_time: shift.start_time,
      end_time: shift.end_time,
      timezone: shift.timezone,
      max_students: shift.max_students,
      is_active: shift.is_active,
      notes: shift.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!userEmail) {
      toast({ variant: "destructive", title: "Sign in required" });
      return;
    }
    const validationError = validateCalendlyForm(form, isInstructor);
    if (validationError) {
      toast({ variant: "destructive", title: "Required fields", description: validationError });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const slot = form.time_slots[0];
        await updateStudyShift(editing.id, {
          course_id: form.course_ids[0] ?? form.course_id,
          course_ids: form.course_ids,
          name: slot.name.trim(),
          day_of_week: form.days_of_week[0],
          start_time: slot.start_time,
          end_time: slot.end_time,
          timezone: form.timezone,
          max_students: form.max_students,
          is_active: form.is_active,
          notes: form.notes || null,
          email: userEmail,
        });
        toast({ title: "Study shift updated" });
      } else {
        const result = await createStudyShift({
          course_id: form.course_ids[0] ?? form.course_id,
          course_ids: form.course_ids,
          name: form.time_slots[0]?.name.trim() ?? "",
          days_of_week: form.days_of_week,
          time_slots: form.time_slots.map((slot) => ({
            name: slot.name.trim(),
            start_time: slot.start_time,
            end_time: slot.end_time,
          })),
          start_time: form.time_slots[0]?.start_time,
          end_time: form.time_slots[0]?.end_time,
          timezone: form.timezone,
          max_students: form.max_students,
          is_active: form.is_active,
          notes: form.notes || null,
          email: userEmail,
        });
        const count = result.study_shifts?.length ?? 1;
        toast({
          title: count > 1 ? `${count} study shifts created` : "Study shift created",
          description:
            count > 1
              ? `${form.time_slots.length} time slot(s) on ${form.days_of_week.length} day(s).`
              : undefined,
        });
      }
      setDialogOpen(false);
      void load(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not save study shift";
      toast({ variant: "destructive", title: "Save failed", description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !userEmail) return;
    try {
      await deleteStudyShift(deleteTarget.id, userEmail);
      toast({ title: "Study shift deleted" });
      setDeleteTarget(null);
      void load(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Delete failed";
      toast({ variant: "destructive", title: "Delete failed", description: message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="h-7 w-7 text-[#0070D0]" />
            Study Shifts
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-xl">
            Set weekly availability: pick days, time blocks, and one course per slot.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => openCreate()} className="bg-[#0070D0] hover:bg-[#0070D0]/90">
            <Plus className="h-4 w-4 mr-2" />
            Add availability
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total shifts", value: stats.total, icon: CalendarDays, color: "text-[#0070D0]" },
          { label: "Active", value: stats.active, icon: CalendarClock, color: "text-emerald-600" },
          { label: "Learners enrolled", value: stats.enrolled, icon: Users, color: "text-sky-600" },
          { label: "Days covered", value: stats.daysCovered, icon: LayoutGrid, color: "text-violet-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-slate-200/80 shadow-sm">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{stat.value}</p>
                </div>
                <stat.icon className={cn("h-8 w-8 opacity-20", stat.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="pt-4 pb-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <SmartSearchInput
              className="flex-1"
              value={search}
              onChange={setSearch}
              placeholder="Search shift, course, time, or creator"
              resultCount={filtered.length}
              totalCount={shifts.length}
            />
            <div className="flex flex-wrap gap-2">
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {isAdmin && <SelectItem value="global">Global shifts</SelectItem>}
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dayFilter} onValueChange={setDayFilter}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All days</SelectItem>
                  {WEEKDAY_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[120px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs text-slate-600">
              {filtered.length} shown
            </Badge>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="week" className="text-xs px-2.5 gap-1">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Week
                </TabsTrigger>
                <TabsTrigger value="list" className="text-xs px-2.5 gap-1">
                  <List className="h-3.5 w-3.5" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <CalendarClock className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No study shifts match your filters</p>
            <Button onClick={() => openCreate()} className="mt-4 bg-[#0070D0]">
              <Plus className="h-4 w-4 mr-2" />
              Set weekly availability
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "week" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
          {weekBoard.map((day) => (
            <div
              key={day.value}
              className={cn(
                "flex flex-col rounded-xl border bg-white shadow-sm overflow-hidden min-h-[160px]",
                day.shifts.length > 0 ? "border-slate-200" : "border-dashed border-slate-200/70"
              )}
            >
              <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#0070D0]">{day.short}</p>
                  <p className="text-[11px] text-slate-500 truncate">{day.label}</p>
                </div>
                <Badge
                  variant={day.shifts.length > 0 ? "default" : "secondary"}
                  className={cn(
                    "text-[10px] h-5 px-1.5 shrink-0",
                    day.shifts.length > 0 && "bg-[#0070D0] hover:bg-[#0070D0]/90"
                  )}
                >
                  {day.shifts.length}
                </Badge>
              </div>
              <div className="flex-1 p-2 space-y-2">
                {day.shifts.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => openCreate(day.value)}
                    className="w-full h-full min-h-[100px] rounded-lg border border-dashed border-slate-200 py-4 text-xs text-slate-400 hover:border-[#0070D0]/40 hover:text-[#0070D0] hover:bg-[#0070D0]/5 transition-colors"
                  >
                    + Add shift
                  </button>
                ) : (
                  day.shifts.map((shift) => (
                    <StudyShiftCard
                      key={shift.id}
                      shift={shift}
                      compact
                      showCreator={isAdmin}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {listGrouped.map((day) => (
            <Card key={day.value} className="border-slate-200/80 overflow-hidden">
              <CardHeader className="py-3 px-4 bg-slate-50/80 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#0070D0]">{day.label}</CardTitle>
                  <CardDescription className="text-xs">
                    {day.shifts.length} shift{day.shifts.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {day.shifts.map((shift) => (
                  <StudyShiftCard
                    key={shift.id}
                    shift={shift}
                    showCreator={isAdmin}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit study shift" : "Set weekly availability"}
            </DialogTitle>
          </DialogHeader>
          <StudyShiftCalendlyEditor
            value={form}
            onChange={setForm}
            courses={courses}
            isAdmin={isAdmin}
            isInstructor={isInstructor}
            singleDay={!!editing}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#0070D0]">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing
                ? "Save changes"
                : (() => {
                    const total = form.days_of_week.length * form.time_slots.length;
                    return total > 1 ? `Create ${total} shifts` : "Create shift";
                  })()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete study shift?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{deleteTarget?.name}&quot; on{" "}
              {deleteTarget ? getWeekdayLabel(deleteTarget.day_of_week) : ""}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudyShiftsManagement;
