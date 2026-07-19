import { DateTime } from "luxon";

import type { AvailableScheduleRow } from "@/api/axios";

export type MeetingTimeSlot = {
  scheduleId: number;
  startsAt: string;
  label: string;
  schedule: AvailableScheduleRow;
};

export type MeetingCalendarConfig = {
  blocked_months: string[];
  blocked_dates: string[];
};

export type BookedMeetingSlot = {
  starts_at: string;
  schedule_id?: number | null;
  registration_id?: number | null;
  full_name?: string | null;
  email?: string | null;
  status?: string | null;
  schedule_label?: string | null;
};

export const DEFAULT_MEETING_CALENDAR: MeetingCalendarConfig = {
  blocked_months: [],
  blocked_dates: [],
};

/** Fallback when API is unreachable — empty until admin sets dates on calendar. */
export const DEFAULT_MEETING_SCHEDULES: AvailableScheduleRow[] = [];

export function normalizeScheduleDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function scheduleDateKey(
  schedule: AvailableScheduleRow,
  fallbackZone = "Africa/Nairobi"
): string | null {
  return normalizeScheduleDate(schedule.available_on_date ?? undefined);
}

/** Wall-clock window on a calendar day for admin grid display. */
export function scheduleWindowMinutes(
  schedule: AvailableScheduleRow,
  dayKeyStr: string,
  viewerZone: string
): { startMin: number; endMin: number } | null {
  if (normalizeScheduleDate(schedule.available_on_date ?? undefined) !== dayKeyStr) return null;

  const sourceZone = resolveScheduleTimezone(schedule.timezone, viewerZone);
  const startParts = parseTimeParts(schedule.start_time);
  const endParts = parseTimeParts(schedule.end_time);

  if (sourceZone === viewerZone) {
    const startMin = startParts.hour * 60 + startParts.minute;
    const endMin = endParts.hour * 60 + endParts.minute;
    if (endMin <= startMin) return null;
    return { startMin, endMin };
  }

  const base = DateTime.fromISO(dayKeyStr, { zone: sourceZone }).startOf("day");
  const start = base.set({ hour: startParts.hour, minute: startParts.minute }).setZone(viewerZone);
  const end = base.set({ hour: endParts.hour, minute: endParts.minute }).setZone(viewerZone);
  if (end <= start) return null;
  return {
    startMin: start.hour * 60 + start.minute,
    endMin: end.hour * 60 + end.minute,
  };
}

function parseTimeParts(time: string | null | undefined): { hour: number; minute: number } {
  const raw = String(time ?? "").slice(0, 5);
  const [h, m] = raw.split(":").map((v) => Number(v) || 0);
  return { hour: h, minute: m };
}

export function dateKey(date: Date, zone: string): string {
  return DateTime.fromJSDate(date, { zone }).toFormat("yyyy-MM-dd");
}

function monthKey(date: Date, zone: string): string {
  return DateTime.fromJSDate(date, { zone }).startOf("month").toFormat("yyyy-MM");
}

const WINDOWS_TZ_TO_IANA: Record<string, string> = {
  "E. Africa Standard Time": "Africa/Nairobi",
  "South Africa Standard Time": "Africa/Johannesburg",
  "W. Central Africa Standard Time": "Africa/Lagos",
  "Central Europe Standard Time": "Europe/Berlin",
  "GMT Standard Time": "Europe/London",
  "Pacific Standard Time": "America/Los_Angeles",
  "Eastern Standard Time": "America/New_York",
  "Central Standard Time": "America/Chicago",
  "Mountain Standard Time": "America/Denver",
};

/** Abbreviations / legacy codes stored in DB instead of IANA IDs. */
const TIMEZONE_CODE_TO_IANA: Record<string, string> = {
  EAT: "Africa/Nairobi",
  CAT: "Africa/Harare",
  WAT: "Africa/Lagos",
  SAST: "Africa/Johannesburg",
  UTC: "Etc/UTC",
  GMT: "Europe/London",
  CET: "Europe/Berlin",
  EET: "Europe/Athens",
  GST: "Asia/Dubai",
  IST: "Asia/Kolkata",
  CST: "America/Chicago",
  EST: "America/New_York",
  MST: "America/Denver",
  PST: "America/Los_Angeles",
  JST: "Asia/Tokyo",
  AEST: "Australia/Sydney",
  "CAT-RW": "Africa/Kigali",
  "EAT-KE": "Africa/Nairobi",
  "EAT-TZ": "Africa/Dar_es_Salaam",
  "EAT-UG": "Africa/Kampala",
  "EAT-ET": "Africa/Addis_Ababa",
};

const FRIENDLY_TZ_LABELS: Record<string, string> = {
  "Africa/Nairobi": "Kenya · East Africa Time",
  "Africa/Kampala": "Uganda · East Africa Time",
  "Africa/Dar_es_Salaam": "Tanzania · East Africa Time",
  "Africa/Kigali": "Rwanda · Central Africa Time",
  "Africa/Bujumbura": "Burundi · Central Africa Time",
  "Africa/Lagos": "Nigeria · West Africa Time",
  "Africa/Johannesburg": "South Africa Time",
  "Europe/London": "United Kingdom · GMT/BST",
  "Europe/Paris": "France · Central European Time",
  "America/New_York": "US Eastern Time",
  "America/Los_Angeles": "US Pacific Time",
  "Asia/Dubai": "UAE · Gulf Standard Time",
  "Asia/Kolkata": "India Standard Time",
};

function inferTimezoneFromOffset(): string | null {
  if (typeof Date === "undefined") return null;
  const offsetMin = -new Date().getTimezoneOffset();
  if (offsetMin === 180) {
    const lang = (typeof navigator !== "undefined" ? navigator.language : "")?.toLowerCase() ?? "";
    const region = lang.split("-")[1]?.toUpperCase();
    if (region === "KE") return "Africa/Nairobi";
    if (region === "UG") return "Africa/Kampala";
    if (region === "TZ") return "Africa/Dar_es_Salaam";
    if (region === "RW") return "Africa/Kigali";
    if (region === "BI") return "Africa/Bujumbura";
    return "Africa/Nairobi";
  }
  if (offsetMin === 120) return "Africa/Kigali";
  if (offsetMin === 60) return "Africa/Lagos";
  if (offsetMin === 0) return "Etc/UTC";
  if (offsetMin === -300) return "America/New_York";
  if (offsetMin === -480) return "America/Los_Angeles";
  return null;
}

/** IANA timezone from the visitor's computer clock (e.g. Africa/Nairobi for Kenya). */
export function getBrowserTimezone(): string | null {
  if (typeof Intl === "undefined" || !Intl.DateTimeFormat) {
    return inferTimezoneFromOffset();
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
    if (tz?.includes("/")) return tz;
    if (tz && WINDOWS_TZ_TO_IANA[tz]) return WINDOWS_TZ_TO_IANA[tz];
    return inferTimezoneFromOffset();
  } catch {
    return inferTimezoneFromOffset();
  }
}

export function normalizeTimeHHMM(value: string | null | undefined): string {
  if (!value) return "";
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

/** Normalize timezone stored on a schedule row to a valid IANA ID. */
export function resolveScheduleTimezone(
  stored: string | null | undefined,
  fallback = "Africa/Nairobi"
): string {
  const trimmed = stored?.trim();
  if (!trimmed) return fallback;
  if (trimmed.includes("/")) return trimmed;
  if (WINDOWS_TZ_TO_IANA[trimmed]) return WINDOWS_TZ_TO_IANA[trimmed];

  const upper = trimmed.toUpperCase();
  if (TIMEZONE_CODE_TO_IANA[upper]) return TIMEZONE_CODE_TO_IANA[upper];

  return fallback;
}

export function resolveLearnerTimezone(
  learnerTimezone: string | null | undefined,
  fallback?: string
): string {
  if (learnerTimezone?.includes("/")) return learnerTimezone;
  const resolved = resolveScheduleTimezone(learnerTimezone, "");
  if (resolved) return resolved;
  return fallback ?? getBrowserTimezone() ?? "Africa/Nairobi";
}

export function resolveMeetingSchedules(
  schedules: AvailableScheduleRow[],
  options?: { useFallback?: boolean }
): AvailableScheduleRow[] {
  const active = schedules.filter((s) => s.is_active !== false);
  if (active.length > 0) return active;
  return options?.useFallback ? DEFAULT_MEETING_SCHEDULES : [];
}

export function isMonthBlocked(
  month: Date,
  calendar: MeetingCalendarConfig,
  zone: string
): boolean {
  const key = monthKey(month, zone);
  return calendar.blocked_months.includes(key);
}

export function isDateBlocked(
  date: Date,
  calendar: MeetingCalendarConfig,
  zone: string
): boolean {
  const mKey = monthKey(date, zone);
  if (calendar.blocked_months.includes(mKey)) return true;
  return calendar.blocked_dates.includes(dateKey(date, zone));
}

export function schedulesForDate(
  schedules: AvailableScheduleRow[],
  date: Date,
  zone: string
): AvailableScheduleRow[] {
  const key = dateKey(date, zone);
  return schedules.filter((s) => {
    if (s.is_active === false) return false;
    return normalizeScheduleDate(s.available_on_date ?? undefined) === key;
  });
}

/** @deprecated use schedulesForDate */
export function schedulesForDay(
  schedules: AvailableScheduleRow[],
  date: Date
): AvailableScheduleRow[] {
  return schedulesForDate(schedules, date, "Africa/Nairobi");
}

export function dateHasConfiguredAvailability(
  schedules: AvailableScheduleRow[],
  date: Date,
  zone: string
): boolean {
  return schedulesForDate(schedules, date, zone).length > 0;
}

export function dateHasAvailability(
  schedules: AvailableScheduleRow[],
  date: Date,
  learnerTimezone: string,
  calendar: MeetingCalendarConfig = DEFAULT_MEETING_CALENDAR,
  bookedSlots: BookedMeetingSlot[] = []
): boolean {
  const zone = resolveLearnerTimezone(learnerTimezone);
  const startOfDay = DateTime.fromJSDate(date, { zone }).startOf("day");

  if (startOfDay < DateTime.now().setZone(zone).startOf("day")) {
    return false;
  }

  if (isDateBlocked(date, calendar, zone)) {
    return false;
  }

  return getTimeSlotsForDate(date, schedules, zone, bookedSlots).length > 0;
}

export function monthHasBookableDates(
  month: Date,
  schedules: AvailableScheduleRow[],
  learnerTimezone: string,
  calendar: MeetingCalendarConfig = DEFAULT_MEETING_CALENDAR,
  bookedSlots: BookedMeetingSlot[] = []
): boolean {
  const zone = resolveLearnerTimezone(learnerTimezone);

  if (isMonthBlocked(month, calendar, zone)) {
    return false;
  }

  const dt = DateTime.fromJSDate(month, { zone }).startOf("month");
  const daysInMonth = dt.daysInMonth ?? 30;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = dt.set({ day: d }).toJSDate();
    if (dateHasAvailability(schedules, date, zone, calendar, bookedSlots)) {
      return true;
    }
  }

  return false;
}

export function getTimeSlotsForDate(
  date: Date,
  schedules: AvailableScheduleRow[],
  learnerTimezone: string,
  bookedSlots: BookedMeetingSlot[] = []
): MeetingTimeSlot[] {
  const zone = resolveLearnerTimezone(learnerTimezone);
  const now = DateTime.now().setZone(zone);
  const selectedDay = DateTime.fromJSDate(date, { zone }).startOf("day");
  const isFutureDay = selectedDay > now.startOf("day");
  const matching = schedulesForDate(schedules, date, zone);
  const slots: MeetingTimeSlot[] = [];

  const bookedKeys = new Set(
    bookedSlots
      .map((slot) => {
        try {
          return DateTime.fromISO(slot.starts_at, { zone: "utc" }).toUTC().toISO();
        } catch {
          return null;
        }
      })
      .filter((key): key is string => Boolean(key))
  );

  for (const schedule of matching) {
    const sourceZone = resolveScheduleTimezone(schedule.timezone, zone);
    const dayKeyStr =
      normalizeScheduleDate(schedule.available_on_date ?? undefined) ?? dateKey(date, zone);
    const startParts = parseTimeParts(schedule.start_time);
    const endParts = parseTimeParts(schedule.end_time);

    const dayBase = DateTime.fromISO(dayKeyStr, { zone: sourceZone }).startOf("day");
    let cursor = dayBase.set({ hour: startParts.hour, minute: startParts.minute });
    const endAt = dayBase.set({ hour: endParts.hour, minute: endParts.minute });

    if (!cursor.isValid || !endAt.isValid || endAt <= cursor) continue;

    const slotMinutes = Math.max(
      15,
      Math.min(180, Number(schedule.meeting_duration_minutes) || 60)
    );

    const slotStarts = new Set<string>();

    const tryAddSlot = (at: DateTime) => {
      if (at.plus({ minutes: slotMinutes }) > endAt || at < windowStart) return;
      const learnerLocal = at.setZone(zone);
      const startsAt = at.toUTC().toISO() ?? at.toISO() ?? "";
      if (!startsAt || slotStarts.has(startsAt)) return;

      const isBooked = bookedKeys.has(
        DateTime.fromISO(startsAt, { zone: "utc" }).toUTC().toISO() ?? startsAt
      );

      if ((isFutureDay || learnerLocal > now) && !isBooked) {
        slotStarts.add(startsAt);
        slots.push({
          scheduleId: schedule.id,
          startsAt,
          label: learnerLocal.toFormat("h:mm a"),
          schedule,
        });
      }
    };

    const windowStart = cursor;
    while (cursor.plus({ minutes: slotMinutes }) <= endAt) {
      tryAddSlot(cursor);
      cursor = cursor.plus({ minutes: slotMinutes });
    }

    // When end time has minutes (e.g. 5:30 PM), include the last slot that ends exactly at close.
    // Hourly steps from 7:00 AM would otherwise stop at 4:00 PM and miss 4:30-5:30 PM.
    tryAddSlot(endAt.minus({ minutes: slotMinutes }));
  }

  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function formatSelectedMeeting(
  startsAt: string,
  learnerTimezone: string
): string {
  const zone = resolveLearnerTimezone(learnerTimezone);
  const dt = DateTime.fromISO(startsAt, { zone: "utc" }).setZone(zone);
  return dt.toFormat("cccc, LLLL d, yyyy h:mm a");
}

/** Full booking label for emails — learner local time, duration, timezone. */
export function formatBookingConfirmationLabel(
  startsAt: string,
  learnerTimezone: string,
  schedule: AvailableScheduleRow | null | undefined
): string {
  const zone = resolveLearnerTimezone(learnerTimezone);
  const start = DateTime.fromISO(startsAt, { zone: "utc" }).setZone(zone);
  const durationMin = meetingDurationMinutes(schedule);
  const end = start.plus({ minutes: durationMin });
  const tzLabel = timezoneDisplayLabel(zone);
  return `${start.toFormat("cccc, LLLL d, yyyy h:mm a")} – ${end.toFormat("h:mm a")} (${tzLabel}) · ${formatDurationMinutes(durationMin)}`;
}

export function availabilityWindowLabel(schedule: AvailableScheduleRow | null | undefined): string {
  if (!schedule) return "-";
  const dow = Number(schedule.day_of_week);
  const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dow] ?? String(dow);
  const start = String(schedule.start_time ?? "").slice(0, 5);
  const end = String(schedule.end_time ?? "").slice(0, 5);
  const tz = schedule.timezone ? ` (${schedule.timezone})` : "";
  return `${day} ${start}-${end}${tz}`;
}

function parseMeetingStartUtc(
  startRaw: string,
  schedule: AvailableScheduleRow | null
): DateTime | null {
  const scheduleTz = schedule?.timezone || "Africa/Kigali";
  try {
    const fromIso = DateTime.fromISO(startRaw, { setZone: true });
    if (fromIso.isValid) return fromIso.toUTC();
    const fromSqlUtc = DateTime.fromSQL(startRaw, { zone: "utc" });
    if (fromSqlUtc.isValid) return fromSqlUtc.toUTC();
    const fromSqlLocal = DateTime.fromSQL(startRaw, { zone: scheduleTz });
    return fromSqlLocal.isValid ? fromSqlLocal.toUTC() : null;
  } catch {
    return null;
  }
}

export function formatRegistrationScheduleLabel(row: {
  schedule_label?: string | null;
  zoom_start_time?: string | null;
  availableSchedule?: AvailableScheduleRow | null;
  available_schedule?: AvailableScheduleRow | null;
}): string {
  const saved = String(row.schedule_label ?? "").trim();
  if (saved) return saved;

  const schedule = row.availableSchedule ?? row.available_schedule ?? null;
  const startRaw = row.zoom_start_time;
  if (startRaw) {
    const startUtc = parseMeetingStartUtc(startRaw, schedule);
    if (startUtc) {
      const tz = schedule?.timezone || "Africa/Kigali";
      const start = startUtc.setZone(tz);
      const duration = meetingDurationMinutes(schedule);
      const end = start.plus({ minutes: duration });
      return `${start.toFormat("cccc, LLLL d, yyyy h:mm a")} – ${end.toFormat("h:mm a")} (${timezoneDisplayLabel(tz)})`;
    }
    return startRaw;
  }

  return availabilityWindowLabel(schedule);
}

/** Admin / manager view — always shown in the viewer's local timezone. */
export function formatRegistrationScheduleForViewer(
  row: {
    schedule_label?: string | null;
    zoom_start_time?: string | null;
    availableSchedule?: AvailableScheduleRow | null;
    available_schedule?: AvailableScheduleRow | null;
  },
  viewerTimezone?: string | null
): string {
  const schedule = row.availableSchedule ?? row.available_schedule ?? null;
  const viewerZone = resolveLearnerTimezone(viewerTimezone);
  const startRaw = row.zoom_start_time;

  if (startRaw) {
    const startUtc = parseMeetingStartUtc(startRaw, schedule);
    if (startUtc) {
      const start = startUtc.setZone(viewerZone);
      const duration = meetingDurationMinutes(schedule);
      const end = start.plus({ minutes: duration });
      return `${start.toFormat("cccc, LLLL d, yyyy h:mm a")} – ${end.toFormat("h:mm a")} (${timezoneDisplayLabel(viewerZone)})`;
    }
  }

  return formatRegistrationScheduleLabel(row);
}

export function formatStoredLearnerTimezone(value?: string | null): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  if (raw.includes("/")) return timezoneDisplayLabel(raw);
  return raw;
}

export function meetingDurationMinutes(schedule: AvailableScheduleRow | null | undefined): number {
  const minutes = Number(schedule?.meeting_duration_minutes);
  if (Number.isFinite(minutes) && minutes >= 15) {
    return Math.min(180, minutes);
  }
  return 60;
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${minutes} minutes`;
}

export function scheduleDurationLabel(schedule: AvailableScheduleRow | null): string {
  return formatDurationMinutes(meetingDurationMinutes(schedule));
}

export function resolveDurationSchedule(
  schedules: AvailableScheduleRow[],
  selectedDate: Date | undefined,
  selectedSlot: MeetingTimeSlot | null,
  learnerTimezone?: string | null
): AvailableScheduleRow | null {
  if (selectedSlot?.schedule) return selectedSlot.schedule;
  const zone = resolveLearnerTimezone(learnerTimezone);
  if (selectedDate) {
    const daySchedules = schedulesForDate(schedules, selectedDate, zone);
    if (daySchedules.length > 0) return daySchedules[0];
  }
  return schedules[0] ?? null;
}

export function timezoneDisplayLabel(iana: string | null | undefined): string {
  if (!iana) return "Your local time";
  const friendly = FRIENDLY_TZ_LABELS[iana];
  try {
    const dt = DateTime.now().setZone(iana);
    const offset = dt.toFormat("ZZ");
    if (friendly) return `${friendly} (${offset})`;

    let intlName: string | undefined;
    if (typeof Intl !== "undefined") {
      intlName = new Intl.DateTimeFormat("en", {
        timeZone: iana,
        timeZoneName: "long",
      })
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value;
    }

    const city = iana.includes("/") ? iana.split("/").pop()?.replace(/_/g, " ") : iana;
    const name = intlName && intlName !== iana ? intlName : city;
    return `${name} (${offset})`;
  } catch {
    return friendly ?? iana;
  }
}

export function buildTimezoneOptions(
  presets: { iana: string; label: string }[]
): { iana: string; label: string }[] {
  const browser = getBrowserTimezone();
  if (!browser) return presets;
  const rest = presets.filter((t) => t.iana !== browser);
  const existing = presets.find((t) => t.iana === browser);
  return [
    { iana: browser, label: existing?.label ?? timezoneDisplayLabel(browser) },
    ...rest,
  ];
}

export function parseAvailableSchedulesResponse(data: unknown): {
  schedules: AvailableScheduleRow[];
  calendar: MeetingCalendarConfig;
  bookedSlots: BookedMeetingSlot[];
} {
  if (Array.isArray(data)) {
    return {
      schedules: resolveMeetingSchedules(data),
      calendar: DEFAULT_MEETING_CALENDAR,
      bookedSlots: [],
    };
  }

  const payload = data as {
    schedules?: AvailableScheduleRow[];
    calendar?: Partial<MeetingCalendarConfig>;
    booked_slots?: BookedMeetingSlot[];
    data?: AvailableScheduleRow[];
  };

  const rawSchedules = payload.schedules ?? payload.data ?? [];
  const calendar = payload.calendar ?? DEFAULT_MEETING_CALENDAR;
  const bookedSlots = Array.isArray(payload.booked_slots) ? payload.booked_slots : [];

  const normalizedSchedules = (Array.isArray(rawSchedules) ? rawSchedules : []).map((row) => ({
    ...row,
    start_time: normalizeTimeHHMM(row.start_time) || row.start_time,
    end_time: normalizeTimeHHMM(row.end_time) || row.end_time,
    timezone: resolveScheduleTimezone(row.timezone),
  }));

  return {
    schedules: resolveMeetingSchedules(normalizedSchedules),
    calendar: {
      blocked_months: Array.isArray(calendar.blocked_months) ? calendar.blocked_months : [],
      blocked_dates: Array.isArray(calendar.blocked_dates) ? calendar.blocked_dates : [],
    },
    bookedSlots,
  };
}

export type AvailabilityRecurrence = "once" | "daily" | "weekdays" | "weekly" | "monthly";

const MAX_AVAILABILITY_DATES = 400;

export function expandAvailabilityDates(
  startKey: string,
  endKey: string,
  recurrence: AvailabilityRecurrence,
  zone: string,
  options?: { weekdays?: number[] }
): string[] {
  let start = DateTime.fromISO(startKey, { zone }).startOf("day");
  let end = DateTime.fromISO(endKey, { zone }).startOf("day");
  if (!start.isValid || !end.isValid) return [];
  if (end < start) [start, end] = [end, start];

  const today = DateTime.now().setZone(zone).startOf("day");
  const keys: string[] = [];

  const push = (dt: DateTime) => {
    if (dt < today) return;
    keys.push(dt.toFormat("yyyy-MM-dd"));
  };

  if (recurrence === "once") {
    push(start);
    return keys;
  }

  if (recurrence === "daily") {
    let cursor = start;
    while (cursor <= end && keys.length < MAX_AVAILABILITY_DATES) {
      push(cursor);
      cursor = cursor.plus({ days: 1 });
    }
    return keys;
  }

  if (recurrence === "weekdays") {
    let cursor = start;
    while (cursor <= end && keys.length < MAX_AVAILABILITY_DATES) {
      const jsDow = cursor.weekday === 7 ? 0 : cursor.weekday;
      if (jsDow >= 1 && jsDow <= 5) push(cursor);
      cursor = cursor.plus({ days: 1 });
    }
    return keys;
  }

  if (recurrence === "weekly") {
    const allowed = new Set(
      (options?.weekdays?.length ? options.weekdays : [start.weekday === 7 ? 0 : start.weekday]).map(
        Number
      )
    );
    let cursor = start;
    while (cursor <= end && keys.length < MAX_AVAILABILITY_DATES) {
      const jsDow = cursor.weekday === 7 ? 0 : cursor.weekday;
      if (allowed.has(jsDow)) push(cursor);
      cursor = cursor.plus({ days: 1 });
    }
    return keys;
  }

  if (recurrence === "monthly") {
    const dayOfMonth = start.day;
    let cursor = start.startOf("month");
    while (cursor <= end && keys.length < MAX_AVAILABILITY_DATES) {
      const dim = cursor.daysInMonth ?? 28;
      const candidate = cursor.set({ day: Math.min(dayOfMonth, dim) });
      if (candidate >= start && candidate <= end) push(candidate);
      cursor = cursor.plus({ months: 1 }).startOf("month");
    }
    return keys;
  }

  return keys;
}

export function filterBookableAvailabilityDates(
  dates: string[],
  calendar: MeetingCalendarConfig,
  zone: string
): string[] {
  return dates.filter((key) => {
    const dt = DateTime.fromISO(key, { zone });
    if (!dt.isValid) return false;
    return !isDateBlocked(dt.toJSDate(), calendar, zone);
  });
}

export function bookedSlotDateKey(slot: BookedMeetingSlot, zone: string): string | null {
  try {
    const dt = DateTime.fromISO(slot.starts_at, { zone: "utc" }).setZone(zone);
    return dt.isValid ? dt.toFormat("yyyy-MM-dd") : null;
  } catch {
    return null;
  }
}

export function dateHasBookings(
  date: Date,
  bookedSlots: BookedMeetingSlot[],
  zone: string
): boolean {
  const key = dateKey(date, zone);
  return bookedSlots.some((slot) => bookedSlotDateKey(slot, zone) === key);
}

export function bookingsForDate(
  date: Date,
  bookedSlots: BookedMeetingSlot[],
  zone: string
): BookedMeetingSlot[] {
  const key = dateKey(date, zone);
  return bookedSlots
    .filter((slot) => bookedSlotDateKey(slot, zone) === key)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function bookingsInDateRange(
  startKey: string,
  endKey: string,
  bookedSlots: BookedMeetingSlot[],
  zone: string
): BookedMeetingSlot[] {
  let start = DateTime.fromISO(startKey, { zone });
  let end = DateTime.fromISO(endKey, { zone });
  if (!start.isValid || !end.isValid) return [];
  if (end < start) [start, end] = [end, start];

  return bookedSlots
    .filter((slot) => {
      const key = bookedSlotDateKey(slot, zone);
      if (!key) return false;
      const dt = DateTime.fromISO(key, { zone });
      return dt >= start.startOf("day") && dt <= end.startOf("day");
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function formatBookedSlotTime(
  slot: BookedMeetingSlot,
  zone: string
): string {
  const saved = String(slot.schedule_label ?? "").trim();
  if (saved) return saved;

  try {
    const dt = DateTime.fromISO(slot.starts_at, { zone: "utc" }).setZone(zone);
    return dt.toFormat("cccc, LLL d, yyyy h:mm a");
  } catch {
    return slot.starts_at;
  }
}

export function formatBookedSlotTimeShort(
  slot: BookedMeetingSlot,
  zone: string
): string {
  try {
    const dt = DateTime.fromISO(slot.starts_at, { zone: "utc" }).setZone(zone);
    return dt.toFormat("h:mm a");
  } catch {
    return "";
  }
}
