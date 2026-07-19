import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DateTime } from "luxon";
import type { DateRange } from "react-day-picker";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Check, ChevronsUpDown } from "lucide-react";

import type { AvailableScheduleRow } from "@/api/axios";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { AmPmTimePicker } from "@/components/ui/AmPmTimePicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  getMondayWeekStart,
  ScheduleWeekGrid,
  type WeekTimeSelection,
} from "@/components/meeting/ScheduleWeekGrid";
import {
  AvailabilityRecurrence,
  bookingsInDateRange,
  buildTimezoneOptions,
  dateHasBookings,
  dateHasConfiguredAvailability,
  dateKey,
  expandAvailabilityDates,
  filterBookableAvailabilityDates,
  formatBookedSlotTime,
  formatDurationMinutes,
  getBrowserTimezone,
  getTimeSlotsForDate,
  isDateBlocked,
  meetingDurationMinutes,
  normalizeScheduleDate,
  resolveScheduleTimezone,
  schedulesForDate,
  timezoneDisplayLabel,
  type BookedMeetingSlot,
  type MeetingCalendarConfig,
} from "@/lib/meetingScheduleUtils";
import { cn } from "@/lib/utils";

type TimezoneOption = { iana: string; label: string };

const DURATION_OPTIONS = [30, 45, 60, 90, 120];

const DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const RECURRENCE_OPTIONS: { value: AvailabilityRecurrence; label: string }[] = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function normalizeTimeHHMM(value: string | null | undefined) {
  if (!value) return "";
  return value.length >= 5 ? value.slice(0, 5) : value;
}

type AdminMeetingAvailabilityCalendarProps = {
  variant?: "meeting" | "cohort";
  schedules: AvailableScheduleRow[];
  calendar: MeetingCalendarConfig;
  bookedSlots?: BookedMeetingSlot[];
  loading?: boolean;
  saving?: boolean;
  timezoneOptions: TimezoneOption[];
  onRefresh: () => void;
  onSaveBulk: (payload: {
    dates: string[];
    start_time: string;
    end_time: string;
    meeting_duration_minutes?: number;
    timezone: string;
    notes: string;
  }) => Promise<void>;
  onRemoveDates: (dates: string[]) => Promise<void>;
  onBlockDate: (date: string) => Promise<void>;
  onUnblockDate: (date: string) => Promise<void>;
};

function defaultSaveTimezone() {
  return getBrowserTimezone() ?? "Africa/Nairobi";
}

function windowMinutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export function AdminMeetingAvailabilityCalendar({
  variant = "meeting",
  schedules,
  calendar,
  bookedSlots = [],
  loading = false,
  saving = false,
  timezoneOptions,
  onRefresh,
  onSaveBulk,
  onRemoveDates,
  onBlockDate,
  onUnblockDate,
}: AdminMeetingAvailabilityCalendarProps) {
  const isCohort = variant === "cohort";
  const navigate = useNavigate();
  const displayZone = useMemo(() => defaultSaveTimezone(), []);
  const [saveTimezone, setSaveTimezone] = useState(defaultSaveTimezone);
  const [view, setView] = useState<"week" | "month">("week");
  const [anchorDate, setAnchorDate] = useState(() =>
    DateTime.now().setZone(displayZone).toJSDate()
  );
  const [range, setRange] = useState<DateRange | undefined>();
  const [recurrence, setRecurrence] = useState<AvailabilityRecurrence>("once");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const mergedTimezoneOptions = useMemo(
    () => buildTimezoneOptions(timezoneOptions),
    [timezoneOptions]
  );

  const weekStart = useMemo(
    () => getMondayWeekStart(anchorDate, displayZone),
    [anchorDate, displayZone]
  );

  const rangeFrom = range?.from;
  const rangeTo = range?.to ?? range?.from;
  const startKey = rangeFrom ? dateKey(rangeFrom, displayZone) : null;
  const endKey = rangeTo ? dateKey(rangeTo, displayZone) : null;
  const isSingleDay = Boolean(startKey && endKey && startKey === endKey);

  const scheduleForSelected = useMemo(() => {
    if (!rangeFrom || !isSingleDay) return null;
    return schedulesForDate(schedules, rangeFrom, displayZone)[0] ?? null;
  }, [schedules, rangeFrom, isSingleDay, displayZone]);

  const isBlocked =
    rangeFrom && isSingleDay ? isDateBlocked(rangeFrom, calendar, displayZone) : false;

  const targetDates = useMemo(() => {
    if (!startKey || !endKey) return [];
    const expanded = expandAvailabilityDates(startKey, endKey, recurrence, displayZone, {
      weekdays: recurrence === "weekly" ? weeklyDays : undefined,
    });
    return isCohort ? expanded : filterBookableAvailabilityDates(expanded, calendar, displayZone);
  }, [startKey, endKey, recurrence, weeklyDays, calendar, displayZone, isCohort]);

  useEffect(() => {
    if (!panelOpen || !rangeFrom || scheduleForSelected) return;
    setSaveTimezone(displayZone);
  }, [panelOpen, rangeFrom, scheduleForSelected, displayZone]);

  useEffect(() => {
    if (!isSingleDay || !scheduleForSelected) return;
    setStartTime(normalizeTimeHHMM(scheduleForSelected.start_time) || "09:00");
    setEndTime(normalizeTimeHHMM(scheduleForSelected.end_time) || "17:00");
    setDuration(meetingDurationMinutes(scheduleForSelected));
    setSaveTimezone(resolveScheduleTimezone(scheduleForSelected.timezone, displayZone));
    setNotes(scheduleForSelected.notes || "");
  }, [isSingleDay, scheduleForSelected, displayZone]);

  useEffect(() => {
    if (!rangeFrom) return;
    const dow = rangeFrom.getDay();
    if (recurrence === "weekly") {
      setWeeklyDays((prev) =>
        prev.length === 0 ? [dow] : prev.includes(dow) ? prev : [...prev, dow]
      );
    }
  }, [rangeFrom, recurrence]);

  const headerLabel = useMemo(() => {
    if (view === "week") {
      const start = DateTime.fromJSDate(weekStart, { zone: displayZone });
      const end = start.plus({ days: 6 });
      if (start.month === end.month) {
        return `${start.toFormat("LLLL yyyy")}, ${start.toFormat("d")} - ${end.toFormat("d")}`;
      }
      return `${start.toFormat("LLL d")} - ${end.toFormat("LLL d, yyyy")}`;
    }
    return DateTime.fromJSDate(anchorDate, { zone: displayZone }).toFormat("LLLL yyyy");
  }, [view, weekStart, anchorDate, displayZone]);

  const rangeSummary = useMemo(() => {
    if (!startKey || !endKey) return null;
    if (startKey === endKey) {
      return DateTime.fromISO(startKey, { zone: displayZone }).toFormat("cccc, LLLL d, yyyy");
    }
    const a = DateTime.fromISO(startKey, { zone: displayZone }).toFormat("LLL d");
    const b = DateTime.fromISO(endKey, { zone: displayZone }).toFormat("LLL d, yyyy");
    return `${a} - ${b}`;
  }, [startKey, endKey, displayZone]);

  const bookingsInRange = useMemo(() => {
    if (!startKey || !endKey) return [];
    return bookingsInDateRange(startKey, endKey, bookedSlots, displayZone);
  }, [startKey, endKey, bookedSlots, displayZone]);

  const datesWithAvailabilityInRange = targetDates.filter((key) =>
    schedules.some((s) => normalizeScheduleDate(s.available_on_date ?? undefined) === key)
  ).length;

  const openSelection = (date: Date, endDate?: Date) => {
    const end = endDate ?? date;
    setRange({ from: date, to: end });
    setPanelOpen(true);
    setAnchorDate(date);

    const key = dateKey(date, displayZone);
    const existing = schedulesForDate(schedules, date, displayZone)[0];
    const sameDay = !endDate || dateKey(end, displayZone) === key;

    if (existing && sameDay) {
      setRecurrence("once");
      return;
    }

    setSaveTimezone(displayZone);
    setRecurrence(sameDay ? "once" : "daily");
    setStartTime("09:00");
    setEndTime("17:00");
    setDuration(60);
    setNotes("");
  };

  const handleWeekSelect = (selection: WeekTimeSelection) => {
    openSelection(selection.date);
    setStartTime(selection.startTime);
    setEndTime(selection.endTime);
    if (selection.startTime === selection.endTime) {
      setEndTime(
        DateTime.fromFormat(selection.startTime, "HH:mm")
          .plus({ hours: 1 })
          .toFormat("HH:mm")
      );
    }
  };

  const handleSave = async () => {
    if (targetDates.length === 0) return;
    await onSaveBulk({
      dates: targetDates,
      start_time: normalizeTimeHHMM(startTime),
      end_time: normalizeTimeHHMM(endTime),
      meeting_duration_minutes: duration,
      timezone: saveTimezone,
      notes,
    });
    setPanelOpen(false);
  };

  const handleRemoveInRange = async () => {
    if (targetDates.length === 0) return;
    const withSchedules = targetDates.filter((key) =>
      schedules.some((s) => normalizeScheduleDate(s.available_on_date ?? undefined) === key)
    );
    if (withSchedules.length === 0) return;
    await onRemoveDates(withSchedules);
  };

  const goToday = () => {
    const today = DateTime.now().setZone(displayZone).toJSDate();
    setAnchorDate(today);
    if (view === "month") {
      setRange(undefined);
    }
  };

  const shiftPeriod = (direction: -1 | 1) => {
    const dt = DateTime.fromJSDate(anchorDate, { zone: displayZone });
    if (view === "week") {
      setAnchorDate(dt.plus({ weeks: direction }).toJSDate());
    } else {
      setAnchorDate(dt.plus({ months: direction }).toJSDate());
    }
  };

  const monthForPicker = DateTime.fromJSDate(anchorDate, { zone: displayZone }).toJSDate();

  const selectionIsPast =
    startKey != null &&
    DateTime.fromISO(startKey, { zone: displayZone }).startOf("day") <
      DateTime.now().setZone(displayZone).startOf("day");

  const openWindowMinutes = windowMinutesBetween(startTime, endTime);
  const slotDurationTooLong = !isCohort && openWindowMinutes > 0 && duration > openWindowMinutes;

  const learnerPreviewSlots = useMemo(() => {
    if (!rangeFrom || !isSingleDay || isCohort || isBlocked || !startKey) return [];
    const draft: AvailableScheduleRow = {
      id: scheduleForSelected?.id ?? -1,
      day_of_week: rangeFrom.getDay(),
      available_on_date: startKey,
      start_time: normalizeTimeHHMM(startTime),
      end_time: normalizeTimeHHMM(endTime),
      meeting_duration_minutes: duration,
      timezone: saveTimezone,
      is_active: true,
    };
    return getTimeSlotsForDate(rangeFrom, [draft], saveTimezone, bookedSlots);
  }, [
    rangeFrom,
    isSingleDay,
    isCohort,
    isBlocked,
    startKey,
    startTime,
    endTime,
    duration,
    saveTimezone,
    bookedSlots,
    scheduleForSelected?.id,
  ]);

  return (
    <div className="flex h-[min(780px,calc(100vh-12rem))] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Toolbar � Google Calendar style */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
        <Button type="button" variant="outline" size="sm" onClick={goToday} className="font-medium">
          Today
        </Button>
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => shiftPeriod(-1)}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => shiftPeriod(1)}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="min-w-[140px] flex-1 text-lg font-semibold text-[#0070D0]">{headerLabel}</h2>

        <Tabs value={view} onValueChange={(v) => setView(v as "week" | "month")}>
          <TabsList className="h-9">
            <TabsTrigger value="week" className="px-3 text-xs sm:text-sm">
              Week
            </TabsTrigger>
            <TabsTrigger value="month" className="px-3 text-xs sm:text-sm">
              Month
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button type="button" variant="ghost" size="icon" onClick={onRefresh} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Main calendar area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {view === "week" ? (
            <>
              <p className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-xs text-muted-foreground">
                {isCohort
                  ? "Click and drag on a day to set cohort hours, or click an existing block to edit."
                  : "Click and drag on a day to set open hours. Orange blocks are booked meetings."}
              </p>
              <ScheduleWeekGrid
                weekStart={weekStart}
                schedules={schedules}
                calendar={calendar}
                bookedSlots={bookedSlots}
                adminZone={displayZone}
                isCohort={isCohort}
                selectedDate={rangeFrom ?? null}
                onSelectRange={handleWeekSelect}
                onSelectDay={(date) => openSelection(date)}
              />
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
              <Calendar
                mode="range"
                month={monthForPicker}
                onMonthChange={(m) => setAnchorDate(m)}
                selected={range}
                onSelect={(next) => {
                  setRange(next);
                  if (next?.from) {
                    openSelection(next.from, next.to ?? next.from);
                  }
                }}
                numberOfMonths={1}
                disabled={(date) => {
                  const dt = DateTime.fromObject(
                    {
                      year: date.getFullYear(),
                      month: date.getMonth() + 1,
                      day: date.getDate(),
                    },
                    { zone: displayZone }
                  ).startOf("day");
                  return dt < DateTime.now().setZone(displayZone).startOf("day");
                }}
                modifiers={{
                  available: (date) =>
                    dateHasConfiguredAvailability(schedules, date, displayZone) &&
                    (isCohort || !isDateBlocked(date, calendar, displayZone)),
                  booked: (date) =>
                    !isCohort &&
                    dateHasBookings(date, bookedSlots, displayZone) &&
                    !isDateBlocked(date, calendar, displayZone),
                  blocked: (date) => !isCohort && isDateBlocked(date, calendar, displayZone),
                }}
                modifiersClassNames={{
                  available:
                    "font-semibold text-[#0070D0] after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-emerald-500 after:content-['']",
                  booked:
                    "after:absolute after:bottom-1 after:left-[62%] after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-amber-500 after:content-['']",
                  blocked: "text-red-400 line-through decoration-red-300",
                }}
                className="mx-auto w-full max-w-3xl p-0"
                classNames={{
                  months: "w-full",
                  month: "w-full space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-base font-semibold text-[#0070D0]",
                  head_cell: "text-slate-500 w-full font-medium text-xs uppercase",
                  row: "flex w-full mt-1",
                  cell: "relative aspect-square w-full p-0.5 text-center",
                  day: cn(
                    "h-full w-full rounded-lg font-medium hover:bg-[#0070D0]/10",
                    "aria-selected:bg-[#0070D0] aria-selected:text-white"
                  ),
                  day_today: "ring-2 ring-[#FCC400] ring-offset-1",
                  day_range_middle: "rounded-none bg-[#0070D0]/15 text-[#0070D0]",
                }}
              />
              <div className="mx-auto mt-4 flex max-w-3xl flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Open for booking
                </span>
                {!isCohort && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Has bookings
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="line-through text-red-400">12</span>
                      Blocked / closed
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Event editor panel � like Google Calendar create event */}
        {panelOpen && rangeFrom && (
          <aside className="flex w-full shrink-0 flex-col border-l border-slate-200 bg-white sm:w-[340px] lg:w-[380px]">
            <div className="flex items-start justify-between border-b border-slate-100 px-4 py-3">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[#FCC400]">
                  {isCohort ? "Cohort session" : "Availability"}
                </p>
                <h3 className="truncate text-base font-semibold text-[#0070D0]">{rangeSummary}</h3>
                {isSingleDay && isBlocked && (
                  <p className="mt-0.5 text-xs text-red-600">This date is blocked for bookings.</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  setPanelOpen(false);
                  setRange(undefined);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {!isSingleDay && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={startKey ?? ""}
                      onChange={(e) => {
                        const dt = DateTime.fromISO(e.target.value, { zone: displayZone });
                        if (!dt.isValid) return;
                        openSelection(dt.toJSDate(), rangeTo ?? dt.toJSDate());
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={endKey ?? ""}
                      onChange={(e) => {
                        const dt = DateTime.fromISO(e.target.value, { zone: displayZone });
                        if (!dt.isValid || !rangeFrom) return;
                        setRange({ from: rangeFrom, to: dt.toJSDate() });
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Repeat</Label>
                <div className="flex flex-wrap gap-1.5">
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRecurrence(opt.value)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        recurrence === opt.value
                          ? "border-[#0070D0] bg-[#0070D0] text-white"
                          : "border-slate-200 text-slate-600 hover:border-[#0070D0]/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {recurrence === "weekly" && (
                <div className="flex flex-wrap gap-1.5">
                  {DAY_OPTIONS.map((d) => {
                    const checked = weeklyDays.includes(d.value);
                    return (
                      <label
                        key={d.value}
                        className={cn(
                          "flex cursor-pointer items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                          checked
                            ? "border-[#0070D0] bg-[#0070D0]/10 text-[#0070D0]"
                            : "border-slate-200 text-slate-500"
                        )}
                      >
                        <Checkbox
                          className="sr-only"
                          checked={checked}
                          onCheckedChange={(value) => {
                            const on = Boolean(value);
                            setWeeklyDays((prev) => {
                              const next = on
                                ? [...prev, d.value]
                                : prev.filter((v) => v !== d.value);
                              return next.length === 0 && rangeFrom ? [rangeFrom.getDay()] : next;
                            });
                          }}
                        />
                        {d.label}
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="rounded-lg bg-[#0070D0]/5 px-3 py-2 text-sm text-[#0070D0]">
                <strong>{targetDates.length}</strong> day{targetDates.length === 1 ? "" : "s"}{" "}
                selected
              </div>

              {selectionIsPast && (
                <p className="text-xs text-red-600">
                  This date is in the past. Choose today or a future date to open for booking.
                </p>
              )}

              {(!isCohort ? !isBlocked : true) && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Start</Label>
                      <AmPmTimePicker value={startTime} onChange={setStartTime} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End</Label>
                      <AmPmTimePicker value={endTime} onChange={setEndTime} />
                    </div>
                  </div>

                  {!isCohort && (
                    <div className="space-y-1">
                      <Label className="text-xs">Slot duration</Label>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                      >
                        {DURATION_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {formatDurationMinutes(m)}
                          </option>
                        ))}
                      </select>
                      {slotDurationTooLong && (
                        <p className="text-xs text-amber-700">
                          Slot duration is longer than open hours ({openWindowMinutes} min window).
                          Learners will see no bookable times until you widen the range or shorten slots.
                        </p>
                      )}
                      {!slotDurationTooLong && learnerPreviewSlots.length > 0 && (
                        <p className="text-xs text-emerald-700">
                          Learners will see {learnerPreviewSlots.length} slot
                          {learnerPreviewSlots.length === 1 ? "" : "s"}:{" "}
                          {learnerPreviewSlots
                            .slice(0, 6)
                            .map((s) => s.label)
                            .join(", ")}
                          {learnerPreviewSlots.length > 6
                            ? ` +${learnerPreviewSlots.length - 6} more`
                            : ""}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs">Timezone</Label>
                    <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full justify-between font-normal text-sm"
                        >
                          <span className="truncate">
                            {mergedTimezoneOptions.find((t) => t.iana === saveTimezone)?.label ??
                              timezoneDisplayLabel(saveTimezone)}
                          </span>
                          <ChevronsUpDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search timezone..."
                            value={timezoneSearch}
                            onValueChange={setTimezoneSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No timezone found.</CommandEmpty>
                            <CommandGroup>
                              {mergedTimezoneOptions
                                .filter((tz) =>
                                  tz.label.toLowerCase().includes(timezoneSearch.trim().toLowerCase())
                                )
                                .map((tz) => (
                                  <CommandItem
                                    key={tz.iana}
                                    value={tz.label}
                                    onSelect={() => {
                                      setSaveTimezone(tz.iana);
                                      setTimezoneOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        saveTimezone === tz.iana ? "opacity-100" : "opacity-0"
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

                  <div className="space-y-1">
                    <Label className="text-xs">Notes (optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Internal note"
                      className="text-sm"
                    />
                  </div>
                </>
              )}

              {!isCohort && bookingsInRange.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-xs font-semibold text-amber-900">
                    {bookingsInRange.length} booking{bookingsInRange.length === 1 ? "" : "s"} in range
                  </p>
                  <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs">
                    {bookingsInRange.slice(0, 5).map((slot) => (
                      <li key={`${slot.registration_id}-${slot.starts_at}`} className="text-slate-700">
                        {slot.full_name || "Guest"} - {formatBookedSlotTime(slot, displayZone)}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-[#0070D0] underline-offset-2 hover:underline"
                    onClick={() => navigate("/dashboard/appointments?tab=bookings")}
                  >
                    View all signups
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-slate-100 p-4">
              {(!isCohort ? !isBlocked : true) && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    className="flex-1 bg-[#0070D0] hover:bg-[#0070D0]/90"
                    onClick={() => void handleSave()}
                    disabled={saving || targetDates.length === 0}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarDays className="mr-2 h-4 w-4" />
                    )}
                    Save {targetDates.length} day{targetDates.length === 1 ? "" : "s"}
                  </Button>
                  {datesWithAvailabilityInRange > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-destructive"
                      disabled={saving}
                      onClick={() => void handleRemoveInRange()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}

              {isSingleDay && !isCohort && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("w-full", !isBlocked && "text-red-600")}
                  disabled={saving}
                  onClick={() =>
                    startKey && void (isBlocked ? onUnblockDate(startKey) : onBlockDate(startKey))
                  }
                >
                  {isBlocked ? "Reopen this date" : "Close this date for bookings"}
                </Button>
              )}
            </div>
          </aside>
        )}

        {!panelOpen && (
          <div className="hidden w-[280px] shrink-0 flex-col items-center justify-center border-l border-dashed border-slate-200 bg-slate-50/50 p-6 text-center lg:flex">
            <CalendarDays className="mb-3 h-10 w-10 text-[#0070D0]/30" />
            <p className="text-sm font-medium text-slate-700">Select a time slot</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag on the week view or click a day in month view to set availability.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
