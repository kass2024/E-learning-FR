import { formatTime12Label } from "@/lib/scheduledDateTime";

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
] as const;

export type ShiftPeriod = "morning" | "afternoon" | "evening" | "night";

export const SHIFT_PRESETS = [
  { id: "morning", label: "Morning", name: "Morning", start_time: "09:00", end_time: "11:00" },
  { id: "afternoon", label: "Afternoon", name: "Afternoon", start_time: "14:00", end_time: "16:00" },
  { id: "evening", label: "Evening", name: "Evening", start_time: "18:00", end_time: "20:00" },
] as const;

export const SHIFT_PERIOD_STYLES: Record<
  ShiftPeriod,
  { accent: string; bg: string; border: string; badge: string }
> = {
  morning: {
    accent: "bg-amber-500",
    bg: "bg-amber-50/80",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800",
  },
  afternoon: {
    accent: "bg-sky-500",
    bg: "bg-sky-50/80",
    border: "border-sky-200",
    badge: "bg-sky-100 text-sky-800",
  },
  evening: {
    accent: "bg-indigo-500",
    bg: "bg-indigo-50/80",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-800",
  },
  night: {
    accent: "bg-slate-600",
    bg: "bg-slate-50/80",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-700",
  },
};

export function formatShiftTimeRange(start: string, end: string) {
  return `${formatTime12Label(start.slice(0, 5))} - ${formatTime12Label(end.slice(0, 5))}`;
}

/** Short city label for compact shift cards (ASCII only). */
export function formatShiftTimezoneShort(iana: string | null | undefined): string {
  if (!iana) return "Local time";
  const city = iana.includes("/") ? iana.split("/").pop()?.replace(/_/g, " ") : iana;
  return city ?? iana;
}

export function formatEnrollmentShiftsSummary(
  shifts: Array<{ label?: string; name?: string; day_label?: string; start_time?: string; end_time?: string }>
): string {
  if (!shifts.length) return "None";
  return shifts
    .map((s) =>
      s.label ??
      `${s.name ?? "Shift"} | ${s.day_label ?? ""} ${formatShiftTimeRange(s.start_time ?? "", s.end_time ?? "")}`.trim()
    )
    .join("; ");
}

export function minutesToTime(totalMinutes: number): string {
  const mins = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getTimeRangeDurationMinutes(start: string, end: string): number {
  return Math.max(0, parseTimeToMinutes(end) - parseTimeToMinutes(start));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function matchShiftPreset(start: string, end: string) {
  const s = start.slice(0, 5);
  const e = end.slice(0, 5);
  return SHIFT_PRESETS.find((p) => p.start_time === s && p.end_time === e) ?? null;
}

/** Label synced with the current start/end window. */
export function deriveShiftNameFromTimes(start: string, end: string): string {
  const preset = matchShiftPreset(start, end);
  if (preset) return preset.name;
  const period = getShiftPeriod(start);
  const label = period.charAt(0).toUpperCase() + period.slice(1);
  return `${label} (${formatShiftTimeRange(start, end)})`;
}

export function isAutoDerivedShiftName(name: string, start: string, end: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  const preset = matchShiftPreset(start, end);
  if (preset && trimmed.toLowerCase() === preset.name.toLowerCase()) return true;
  return trimmed === deriveShiftNameFromTimes(start, end);
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function getShiftPeriod(startTime: string): ShiftPeriod {
  const minutes = parseTimeToMinutes(startTime);
  if (minutes < 12 * 60) return "morning";
  if (minutes < 17 * 60) return "afternoon";
  if (minutes < 21 * 60) return "evening";
  return "night";
}

export function getWeekdayLabel(dayOfWeek: number): string {
  return WEEKDAY_OPTIONS.find((d) => d.value === dayOfWeek)?.label ?? "Day";
}

export function getWeekdayShort(dayOfWeek: number): string {
  return WEEKDAY_OPTIONS.find((d) => d.value === dayOfWeek)?.short ?? "?";
}

export function sortShiftsByTime<T extends { start_time: string }>(shifts: T[]): T[] {
  return [...shifts].sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
}

export const WEEKDAY_PRESETS = [
  { id: "weekdays", label: "Mon – Fri", days: [1, 2, 3, 4, 5] },
  { id: "sun-thu", label: "Sun – Thu", days: [0, 1, 2, 3, 4] },
  { id: "mwf", label: "Mon, Wed, Fri", days: [1, 3, 5] },
  { id: "weekend", label: "Weekend", days: [0, 6] },
] as const;

export function isValidTimeRange(start: string, end: string): boolean {
  if (!start?.trim() || !end?.trim()) return false;
  return parseTimeToMinutes(end) > parseTimeToMinutes(start);
}

export type ShiftScheduleGroup = {
  key: string;
  name: string;
  start_time: string;
  end_time: string;
  timezone: string;
  course_id: number | null;
  course_title?: string | null;
  shifts: import("@/api/axios").StudyShiftRow[];
  days_of_week: number[];
};

export function groupShiftsBySchedule(
  shifts: import("@/api/axios").StudyShiftRow[]
): ShiftScheduleGroup[] {
  if (!Array.isArray(shifts)) return [];

  const map = new Map<string, ShiftScheduleGroup>();

  for (const shift of shifts) {
    const key = `${shift.course_id ?? "global"}|${shift.name}|${shift.start_time}|${shift.end_time}|${shift.timezone}`;
    const existing = map.get(key);
    if (existing) {
      existing.shifts.push(shift);
      if (!existing.days_of_week.includes(shift.day_of_week)) {
        existing.days_of_week.push(shift.day_of_week);
      }
    } else {
      map.set(key, {
        key,
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        timezone: shift.timezone,
        course_id: shift.course_id,
        course_title: shift.course_title,
        shifts: [shift],
        days_of_week: [shift.day_of_week],
      });
    }
  }

  return Array.from(map.values()).map((g) => ({
    ...g,
    days_of_week: [...g.days_of_week].sort((a, b) => a - b),
    shifts: sortShiftsByTime(g.shifts),
  }));
}

export function formatDaysShort(days: number[]): string {
  if (days.length === 0) return "";
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.map((d) => getWeekdayShort(d)).join(", ");
}

export type StudyShiftTimeSlot = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
};

let slotIdCounter = 0;

export function newStudyShiftTimeSlot(
  start = "09:00",
  end = "11:00"
): StudyShiftTimeSlot {
  slotIdCounter += 1;
  return {
    id: `slot-${slotIdCounter}`,
    name: deriveShiftNameFromTimes(start, end),
    start_time: start,
    end_time: end,
  };
}
