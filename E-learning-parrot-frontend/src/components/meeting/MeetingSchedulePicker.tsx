import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Video,
} from "lucide-react";

import type { AvailableScheduleRow } from "@/api/axios";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
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
import { HUB } from "@/lib/hubConfig";
import ParrotLogo from "@/components/ParrotLogo";
import {
  buildTimezoneOptions,
  dateHasAvailability,
  getBrowserTimezone,
  getTimeSlotsForDate,
  isDateBlocked,
  isMonthBlocked,
  monthHasBookableDates,
  resolveLearnerTimezone,
  resolveMeetingSchedules,
  resolveDurationSchedule,
  scheduleDurationLabel,
  timezoneDisplayLabel,
  type MeetingCalendarConfig,
  type MeetingTimeSlot,
  type BookedMeetingSlot,
} from "@/lib/meetingScheduleUtils";
import { cn } from "@/lib/utils";

type TimezoneOption = {
  iana: string;
  label: string;
};

type MeetingSchedulePickerProps = {
  schedules: AvailableScheduleRow[];
  calendar: MeetingCalendarConfig;
  bookedSlots?: BookedMeetingSlot[];
  learnerTimezone: string | null;
  timezoneOptions: TimezoneOption[];
  onTimezoneChange: (iana: string) => void;
  selectedSlot: MeetingTimeSlot | null;
  onSelectSlot: (slot: MeetingTimeSlot | null) => void;
  onContinue: () => void;
  preview?: boolean;
};

export function MeetingSchedulePicker({
  schedules,
  calendar,
  bookedSlots = [],
  learnerTimezone,
  timezoneOptions,
  onTimezoneChange,
  selectedSlot,
  onSelectSlot,
  onContinue,
  preview = false,
}: MeetingSchedulePickerProps) {
  const zone = resolveLearnerTimezone(learnerTimezone);
  const [month, setMonth] = useState(() => DateTime.now().setZone(zone).toJSDate());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [timezoneOpen, setTimezoneOpen] = useState(false);

  const sortedTimezoneOptions = useMemo(
    () => buildTimezoneOptions(timezoneOptions),
    [timezoneOptions]
  );

  const activeSchedules = useMemo(
    () => resolveMeetingSchedules(schedules),
    [schedules]
  );

  const hasNoSchedules = activeSchedules.length === 0;
  const CONTACT_EMAIL = HUB.supportEmail;

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    return getTimeSlotsForDate(selectedDate, activeSchedules, zone, bookedSlots);
  }, [selectedDate, activeSchedules, zone, bookedSlots]);

  const durationSchedule = useMemo(
    () => resolveDurationSchedule(activeSchedules, selectedDate, selectedSlot, zone),
    [activeSchedules, selectedDate, selectedSlot, zone]
  );

  const monthBlocked = useMemo(
    () => isMonthBlocked(month, calendar, zone),
    [month, calendar, zone]
  );

  const monthBookable = useMemo(
    () => monthHasBookableDates(month, activeSchedules, zone, calendar, bookedSlots),
    [month, activeSchedules, zone, calendar, bookedSlots]
  );

  useEffect(() => {
    if (selectedDate) return;
    const today = DateTime.now().setZone(zone).startOf("day");
    for (let i = 0; i < 90; i++) {
      const candidate = today.plus({ days: i }).toJSDate();
      if (dateHasAvailability(activeSchedules, candidate, zone, calendar, bookedSlots)) {
        setSelectedDate(candidate);
        setMonth(candidate);
        break;
      }
    }
  }, [activeSchedules, zone, calendar, bookedSlots, selectedDate]);

  useEffect(() => {
    const detected = getBrowserTimezone();
    if (detected && !learnerTimezone) {
      onTimezoneChange(detected);
    }
  }, [learnerTimezone, onTimezoneChange]);

  const goNextMonth = () => {
    const next = DateTime.fromJSDate(month, { zone }).plus({ months: 1 }).toJSDate();
    setMonth(next);
    setSelectedDate(undefined);
    onSelectSlot(null);
  };

  const goPrevMonth = () => {
    const prev = DateTime.fromJSDate(month, { zone }).minus({ months: 1 }).toJSDate();
    const now = DateTime.now().setZone(zone).startOf("month");
    if (DateTime.fromJSDate(prev, { zone }) < now) return;
    setMonth(prev);
    setSelectedDate(undefined);
    onSelectSlot(null);
  };

  const selectedDateLabel = selectedDate
    ? DateTime.fromJSDate(selectedDate, { zone }).toFormat("cccc, LLLL d")
    : null;

  const monthLabel = DateTime.fromJSDate(month, { zone }).toFormat("LLLL yyyy");

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
      <div className="grid min-h-[520px] lg:grid-cols-[minmax(260px,300px)_1fr]">
        {/* Left: event details (Calendly-style) */}
        <aside className="border-b border-slate-200 bg-slate-50/50 p-6 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex justify-center lg:justify-start">
            <ParrotLogo size="sm" alt="F&R Rwanda" />
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {HUB.company}
          </p>
          <h2 className="mt-1 text-xl font-bold text-[#0070D0] leading-snug">
            Book a meeting
          </h2>
          <p className="mt-2 text-sm text-slate-600">{HUB.tagline}</p>

          <ul className="mt-6 space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#0070D0]" />
              <span>{scheduleDurationLabel(durationSchedule)}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Video className="mt-0.5 h-4 w-4 shrink-0 text-[#0070D0]" />
              <span>Web conferencing details provided upon confirmation</span>
            </li>
          </ul>
        </aside>

        {/* Right: date & time selection */}
        <div className="flex flex-col p-6 md:p-8">
          <h3 className="text-lg font-bold text-[#0070D0]">Select a Date &amp; Time</h3>

          {hasNoSchedules ? (
            <div className="mt-8 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-slate-700 font-medium">
                For appointment scheduling, please contact us at
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-1 text-sm font-semibold text-[#0070D0] hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          ) : monthBlocked ? (
            <div className="mt-8 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-slate-700 font-medium">Bookings are closed for {monthLabel}.</p>
              <button
                type="button"
                onClick={goNextMonth}
                className="mt-3 text-sm font-semibold text-[#0070D0] hover:underline"
              >
                View next month
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "mt-5 flex flex-1 flex-col gap-6 lg:flex-row lg:gap-0",
                selectedDate && "lg:divide-x lg:divide-slate-200"
              )}
            >
              {/* Calendar column */}
              <div className={cn("shrink-0", selectedDate ? "lg:pr-8" : "lg:pr-0")}>
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={goPrevMonth}
                    className="rounded-full p-2 hover:bg-slate-100"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4 text-[#0070D0]" />
                  </button>
                  <span className="text-sm font-semibold text-[#0070D0]">{monthLabel}</span>
                  <button
                    type="button"
                    onClick={goNextMonth}
                    className="rounded-full p-2 hover:bg-slate-100"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4 text-[#0070D0]" />
                  </button>
                </div>

                <Calendar
                  mode="single"
                  month={month}
                  onMonthChange={setMonth}
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    onSelectSlot(null);
                  }}
                  disabled={(date) => {
                    const dt = DateTime.fromObject(
                      {
                        year: date.getFullYear(),
                        month: date.getMonth() + 1,
                        day: date.getDate(),
                      },
                      { zone }
                    ).startOf("day");
                    if (dt < DateTime.now().setZone(zone).startOf("day")) return true;
                    if (isDateBlocked(date, calendar, zone)) return true;
                    return !dateHasAvailability(activeSchedules, date, zone, calendar, bookedSlots);
                  }}
                  modifiers={{
                    available: (date) =>
                      dateHasAvailability(activeSchedules, date, zone, calendar, bookedSlots),
                  }}
                  modifiersClassNames={{
                    available:
                      "font-semibold text-[#0070D0] after:absolute after:bottom-0.5 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-[#0069FF] after:content-['']",
                  }}
                  className="p-0"
                  classNames={{
                    months: "w-full",
                    month: "w-full space-y-2",
                    caption: "hidden",
                    nav: "hidden",
                    head_cell: "text-slate-500 w-10 font-medium text-xs uppercase",
                    row: "flex w-full mt-1",
                    cell: "relative h-10 w-10 text-center text-sm p-0",
                    day: cn(
                      "h-10 w-10 p-0 font-medium rounded-full hover:bg-[#0069FF]/10",
                      "aria-selected:bg-[#0069FF] aria-selected:text-white aria-selected:hover:bg-[#0069FF]"
                    ),
                    day_disabled: "text-slate-300 hover:bg-transparent",
                    day_today: "font-bold text-[#0069FF]",
                  }}
                />

                {!monthBlocked && monthBookable && (
                  <p className="mt-2 text-xs text-slate-500">
                    Blue dots mark days with open slots.
                  </p>
                )}

                <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#0070D0]"
                    >
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">{timezoneDisplayLabel(zone)}</span>
                      <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search time zone..." />
                      <CommandList>
                        <CommandEmpty>No time zone found.</CommandEmpty>
                        <CommandGroup>
                          {sortedTimezoneOptions.map((tz) => (
                            <CommandItem
                              key={tz.iana}
                              value={tz.label}
                              onSelect={() => {
                                onTimezoneChange(tz.iana);
                                onSelectSlot(null);
                                setTimezoneOpen(false);
                              }}
                            >
                              {tz.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time slots column (Calendly-style) */}
              {selectedDate && (
                <div className="flex min-h-[280px] flex-1 flex-col lg:pl-8">
                  {!selectedDateLabel ? null : timeSlots.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                      <p className="font-medium text-slate-700">No times available</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Try another date or email {CONTACT_EMAIL}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="mb-3 text-sm font-semibold text-[#0070D0]">
                        {selectedDateLabel}
                      </p>
                      <div className="max-h-[340px] flex-1 space-y-2 overflow-y-auto pr-1">
                        {timeSlots.map((slot) => {
                          const isSelected =
                            selectedSlot?.startsAt === slot.startsAt &&
                            selectedSlot?.scheduleId === slot.scheduleId;
                          return (
                            <button
                              key={`${slot.scheduleId}-${slot.startsAt}`}
                              type="button"
                              onClick={() => onSelectSlot(isSelected ? null : slot)}
                              className={cn(
                                "w-full rounded-md border px-4 py-3 text-sm font-semibold transition-all",
                                isSelected
                                  ? "border-[#0069FF] bg-[#0069FF] text-white shadow-sm"
                                  : "border-[#0069FF]/40 bg-white text-[#0069FF] hover:border-[#0069FF] hover:bg-[#0069FF]/5"
                              )}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedSlot && !preview && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <Button
                type="button"
                onClick={onContinue}
                className="w-full rounded-md bg-[#0069FF] py-6 text-base font-semibold hover:bg-[#005bcc]"
              >
                Continue
              </Button>
            </div>
          )}

          {preview && (
            <p className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
              Preview only - learners see this on the Meeting Registration page.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
