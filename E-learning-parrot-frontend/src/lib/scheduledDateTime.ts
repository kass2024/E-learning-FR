import { DateTime } from "luxon";

function parseDatetimeLocalParts(datetimeLocal: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} | null {
  if (!datetimeLocal?.includes("T")) return null;
  const [datePart, timePart] = datetimeLocal.split("T");
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split("-").map((v) => Number(v));
  const [hour, minute] = timePart.split(":").map((v) => Number(v));
  if (!year || !month || !day || !Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return { year, month, day, hour, minute };
}

function datetimeLocalFromParts(
  parts: { year: number; month: number; day: number; hour: number; minute: number },
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function toZonedDateTime(datetimeLocal: string, timeZone: string): DateTime | null {
  const parts = parseDatetimeLocalParts(datetimeLocal);
  if (!parts) return null;

  const dt = DateTime.fromObject(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: parts.hour,
      minute: parts.minute,
    },
    { zone: timeZone },
  );

  return dt.isValid ? dt : null;
}

/** Convert datetime-local value in a named zone to UTC ISO for the API. */
export function localDatetimeToIso(datetimeLocal: string, timeZone: string): string | null {
  const dt = toZonedDateTime(datetimeLocal, timeZone);
  return dt?.toUTC().toISO() ?? null;
}

/** Zoom + Laravel schedule: local wall time in the given IANA zone (not UTC). */
export function localDatetimeToZoomStart(datetimeLocal: string, timeZone: string): string | null {
  const dt = toZonedDateTime(datetimeLocal, timeZone);
  return dt?.toFormat("yyyy-MM-dd'T'HH:mm:ss") ?? null;
}

export function splitDatetimeLocal(datetimeLocal: string, timeZone?: string): {
  date: Date | undefined;
  time: string;
} {
  const parts = parseDatetimeLocalParts(datetimeLocal);
  if (!parts) {
    return { date: undefined, time: "09:00" };
  }

  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dt = DateTime.fromObject(
    { year: parts.year, month: parts.month, day: parts.day },
    { zone },
  );

  return {
    date: dt.isValid ? new Date(parts.year, parts.month - 1, parts.day) : undefined,
    time: `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`,
  };
}

export function combineDatetimeLocal(date: Date, time: string, timeZone?: string): string {
  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [hourRaw = "9", minuteRaw = "0"] = time.split(":");
  const dt = DateTime.fromObject(
    {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: Number(hourRaw),
      minute: Number(minuteRaw),
    },
    { zone },
  );

  return dt.toFormat("yyyy-MM-dd'T'HH:mm");
}

export type Time12Parts = {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
};

export function parseTime24(time24: string): Time12Parts {
  const [hourRaw = "9", minuteRaw = "0"] = time24.split(":");
  let hour24 = Number(hourRaw);
  const minute = Number(minuteRaw) || 0;

  if (!Number.isFinite(hour24)) hour24 = 9;
  hour24 = ((hour24 % 24) + 24) % 24;

  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  return { hour12, minute: Math.min(59, Math.max(0, minute)), period };
}

export function formatTime24(parts: Time12Parts): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  let hour24 = parts.hour12;
  if (parts.period === "AM") {
    if (hour24 === 12) hour24 = 0;
  } else if (hour24 !== 12) {
    hour24 += 12;
  }
  return `${pad(hour24)}:${pad(parts.minute)}`;
}

export function formatTime12Label(time24: string): string {
  const parts = parseTime24(time24);
  return `${parts.hour12}:${String(parts.minute).padStart(2, "0")} ${parts.period}`;
}

/** Default schedule slot: ~30 minutes from now, rounded to next 5 minutes. */
export function defaultFutureDatetimeLocal(timeZone: string, minutesAhead = 30): string {
  const now = DateTime.now().setZone(timeZone).plus({ minutes: minutesAhead });
  const minute = now.minute;
  const roundedMinute = minute % 5 === 0 ? minute : minute + (5 - (minute % 5));
  const dt = now.set({ minute: roundedMinute, second: 0, millisecond: 0 });
  return dt.toFormat("yyyy-MM-dd'T'HH:mm");
}

export function minDatetimeLocalInZone(timeZone: string): string {
  return DateTime.now().setZone(timeZone).toFormat("yyyy-MM-dd'T'HH:mm");
}

export function isFutureScheduled(datetimeLocal: string, timeZone: string, bufferMinutes = 1): boolean {
  const dt = toZonedDateTime(datetimeLocal, timeZone);
  if (!dt) return false;
  return dt > DateTime.now().setZone(timeZone).plus({ minutes: bufferMinutes });
}

export function scheduleValidationMessage(datetimeLocal: string, timeZone: string): string | null {
  const dt = toZonedDateTime(datetimeLocal, timeZone);
  if (!dt) return "Choose a valid date and time.";

  const now = DateTime.now().setZone(timeZone);
  if (dt <= now.plus({ minutes: 1 })) {
    if (dt.hasSame(now, "day")) {
      return "That time has already passed today. Pick a later time or another date.";
    }
    return "Pick a future date and time.";
  }

  return null;
}

/** Bump datetime forward if it is in the past (same zone wall clock). */
export function clampToFutureDatetimeLocal(datetimeLocal: string, timeZone: string): string {
  if (isFutureScheduled(datetimeLocal, timeZone)) return datetimeLocal;
  return defaultFutureDatetimeLocal(timeZone, 15);
}

/** Convert stored UTC ISO to datetime-local in the instructor's chosen zone. */
export function isoToLocalDatetime(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(timeZone);
  if (!dt.isValid) return "";

  return dt.toFormat("yyyy-MM-dd'T'HH:mm");
}

export function formatScheduledLabel(iso?: string | null, timeZone?: string): string {
  if (!iso) return "";
  const zone = timeZone || "utc";
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(zone);
  if (!dt.isValid) return "";

  return dt.toLocaleString(DateTime.DATETIME_MED);
}
