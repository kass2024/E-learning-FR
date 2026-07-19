import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock3 } from "lucide-react";
import { DateTime } from "luxon";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimezoneCombobox } from "@/components/ui/TimezoneCombobox";
import { timezoneLabel } from "@/lib/commonTimezones";
import {
  clampToFutureDatetimeLocal,
  combineDatetimeLocal,
  formatTime12Label,
  formatTime24,
  isFutureScheduled,
  minDatetimeLocalInZone,
  parseTime24,
  scheduleValidationMessage,
  splitDatetimeLocal,
  type Time12Parts,
} from "@/lib/scheduledDateTime";
import { cn } from "@/lib/utils";

type SmartDateTimePickerProps = {
  value: string;
  timezone: string;
  onValueChange: (datetimeLocal: string) => void;
  onTimezoneChange: (iana: string) => void;
  idPrefix?: string;
  className?: string;
};

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTE_STEPS = Array.from({ length: 12 }, (_, i) => i * 5);

function startOfTodayInZone(timezone: string): Date {
  return DateTime.now().setZone(timezone).startOf("day").toJSDate();
}

type TimePickerPanelProps = {
  time24: string;
  onChange: (time24: string) => void;
  /** Close the popover after minute pick — reopen via the time button. */
  onComplete?: () => void;
};

function TimePickerPanel({ time24, onChange, onComplete }: TimePickerPanelProps) {
  const parts = parseTime24(time24);

  const setParts = (next: Partial<Time12Parts>, complete = false) => {
    onChange(formatTime24({ ...parts, ...next }));
    if (complete) onComplete?.();
  };

  return (
    <div className="w-[min(100%,280px)] max-w-[calc(100vw-2.5rem)] space-y-3 sm:space-y-4 p-0.5 sm:p-1">
      <div className="rounded-lg bg-[#0070D0]/5 px-3 py-2 text-center">
        <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Selected time
        </p>
        <p className="text-xl sm:text-2xl font-semibold tabular-nums text-[#0070D0] transition-colors">
          {formatTime12Label(time24)}
        </p>
      </div>

      <div className="flex gap-2">
        {(["AM", "PM"] as const).map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => setParts({ period })}
            className={cn(
              "flex-1 rounded-lg border py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.98]",
              parts.period === period
                ? "border-[#0070D0] bg-[#0070D0] text-white shadow-sm"
                : "border-[#0070D0]/20 bg-white text-[#0070D0] hover:bg-[#0070D0]/5",
            )}
          >
            {period}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-2 text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Hour
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {HOURS_12.map((hour) => (
            <button
              key={hour}
              type="button"
              onClick={() => setParts({ hour12: hour })}
              className={cn(
                "rounded-md py-2 text-sm font-medium tabular-nums transition-all duration-150 active:scale-[0.96]",
                parts.hour12 === hour
                  ? "bg-[#0070D0] text-white shadow-sm"
                  : "bg-muted/60 text-foreground hover:bg-[#0070D0]/10 hover:text-[#0070D0]",
              )}
            >
              {hour}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Minute
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {MINUTE_STEPS.map((minute) => (
            <button
              key={minute}
              type="button"
              onClick={() => setParts({ minute }, true)}
              className={cn(
                "rounded-md py-2 text-sm font-medium tabular-nums transition-all duration-150 active:scale-[0.96]",
                parts.minute === minute
                  ? "bg-[#0070D0] text-white shadow-sm"
                  : "bg-muted/60 text-foreground hover:bg-[#0070D0]/10 hover:text-[#0070D0]",
              )}
            >
              {String(minute).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-center text-muted-foreground">
        Choose AM/PM and hour, then minute — closes automatically.
      </p>
    </div>
  );
}

export function SmartDateTimePicker({
  value,
  timezone,
  onValueChange,
  onTimezoneChange,
  idPrefix = "schedule",
  className,
}: SmartDateTimePickerProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  const { date: selectedDate, time: selectedTime } = splitDatetimeLocal(value, timezone);

  const preview = useMemo(() => {
    if (!value?.includes("T")) return null;
    const dt = DateTime.fromFormat(value, "yyyy-MM-dd'T'HH:mm", { zone: timezone });
    if (!dt.isValid) return null;
    return dt.toFormat("ccc, LLL d · h:mm a");
  }, [value, timezone]);

  const validationMessage = useMemo(
    () => (value?.includes("T") ? scheduleValidationMessage(value, timezone) : null),
    [value, timezone],
  );

  const minLocal = minDatetimeLocalInZone(timezone);
  const minDate = splitDatetimeLocal(minLocal, timezone).date ?? startOfTodayInZone(timezone);

  const commitValue = (next: string) => {
    onValueChange(clampToFutureDatetimeLocal(next, timezone));
  };

  const updateDate = (date: Date | undefined) => {
    if (!date) return;
    const next = combineDatetimeLocal(date, selectedTime || "09:00", timezone);
    commitValue(next);
    setDateOpen(false);
  };

  const updateTime = (time: string) => {
    const base = selectedDate ?? minDate;
    commitValue(combineDatetimeLocal(base, time, timezone));
  };

  const handleTimezoneChange = (nextZone: string) => {
    onTimezoneChange(nextZone);
    if (value?.includes("T")) {
      const parts = parseTime24(selectedTime || "09:00");
      const dateBase = selectedDate ?? minDate;
      const rebuilt = combineDatetimeLocal(dateBase, formatTime24(parts), nextZone);
      onValueChange(clampToFutureDatetimeLocal(rebuilt, nextZone));
    }
  };

  const isValidFuture = value ? isFutureScheduled(value, timezone) : false;

  return (
    <div
      className={cn(
        "rounded-xl border border-[#0070D0]/15 bg-gradient-to-br from-[#0070D0]/[0.04] to-transparent p-3 sm:p-4 space-y-4",
        className,
      )}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-tz`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Time zone
        </Label>
        <TimezoneCombobox
          id={`${idPrefix}-tz`}
          value={timezone}
          onChange={handleTimezoneChange}
          placeholder="Search Kigali, Nairobi, London…"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</Label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start gap-2 h-11 font-normal border-[#0070D0]/20 hover:bg-[#0070D0]/5",
                  !selectedDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="h-4 w-4 shrink-0 text-[#0070D0]" />
                <span className="truncate">
                  {selectedDate ? format(selectedDate, "EEE, MMM d, yyyy") : "Select date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 max-w-[calc(100vw-1.5rem)]" align="start" sideOffset={6}>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={updateDate}
                disabled={(date) => {
                  const day = DateTime.fromJSDate(date).startOf("day");
                  const minDay = DateTime.fromJSDate(minDate).startOf("day");
                  return day < minDay;
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</Label>
          <Popover open={timeOpen} onOpenChange={setTimeOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 justify-start gap-2 font-normal border-[#0070D0]/20 hover:bg-[#0070D0]/5 tabular-nums"
              >
                <Clock3 className="h-4 w-4 shrink-0 text-[#0070D0]" />
                {formatTime12Label(selectedTime || "09:00")}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-3 max-w-[calc(100vw-1.5rem)]"
              align="start"
              sideOffset={6}
              collisionPadding={12}
            >
              <TimePickerPanel
                time24={selectedTime || "09:00"}
                onChange={updateTime}
                onComplete={() => setTimeOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {preview && (
        <p className={cn("text-sm font-medium", isValidFuture ? "text-[#0070D0]" : "text-amber-700")}>
          {preview}
          <span className="ml-1 font-normal text-muted-foreground">· {timezoneLabel(timezone)}</span>
        </p>
      )}

      {validationMessage && (
        <p className="text-xs font-medium text-amber-700">{validationMessage}</p>
      )}
    </div>
  );
}
