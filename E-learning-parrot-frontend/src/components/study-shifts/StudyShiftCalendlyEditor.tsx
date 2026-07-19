import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { CoursePayload } from "@/api/axios";
import { timezoneDisplayLabel } from "@/lib/meetingScheduleUtils";
import { SchedulingTimezonePicker } from "@/components/scheduling/SchedulingTimezonePicker";
import {
  WEEKDAY_OPTIONS,
  WEEKDAY_PRESETS,
  formatDaysShort,
  formatShiftTimeRange,
  getShiftPeriod,
  getWeekdayShort,
  isAutoDerivedShiftName,
  isValidTimeRange,
  deriveShiftNameFromTimes,
  SHIFT_PERIOD_STYLES,
  newStudyShiftTimeSlot,
  type StudyShiftTimeSlot,
} from "@/lib/studyShiftUtils";
import { TimeSlotSelector } from "@/components/study-shifts/TimeSlotSelector";
import { StudyShiftTimeBlocksPicker } from "@/components/study-shifts/StudyShiftTimeBlocksPicker";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

export type { StudyShiftTimeSlot };
export { newStudyShiftTimeSlot as newTimeSlot };

export type CalendlyShiftForm = {
  course_id: number | null;
  course_ids: number[];
  name: string;
  days_of_week: number[];
  time_slots: StudyShiftTimeSlot[];
  start_time: string;
  end_time: string;
  timezone: string;
  max_students: number | null;
  is_active: boolean;
  notes: string;
};

type StudyShiftCalendlyEditorProps = {
  value: CalendlyShiftForm;
  onChange: (value: CalendlyShiftForm) => void;
  courses: CoursePayload[];
  isAdmin: boolean;
  isInstructor: boolean;
  singleDay?: boolean;
};

export function StudyShiftCalendlyEditor({
  value,
  onChange,
  courses,
  isAdmin,
  isInstructor,
  singleDay = false,
}: StudyShiftCalendlyEditorProps) {
  const set = (patch: Partial<CalendlyShiftForm>) => onChange({ ...value, ...patch });

  const toggleDay = (day: number) => {
    if (singleDay) {
      set({ days_of_week: [day] });
      return;
    }
    const has = value.days_of_week.includes(day);
    const next = has
      ? value.days_of_week.filter((d) => d !== day)
      : [...value.days_of_week, day].sort((a, b) => a - b);
    set({ days_of_week: next });
  };

  const applyWeekdayPreset = (days: number[]) => {
    set({ days_of_week: singleDay ? [days[0]] : [...days] });
  };

  const applyTimeSlots = (time_slots: StudyShiftTimeSlot[]) => {
    const primary = time_slots[0];
    onChange({
      ...value,
      time_slots,
      name: primary?.name ?? value.name,
      start_time: primary?.start_time ?? value.start_time,
      end_time: primary?.end_time ?? value.end_time,
    });
  };

  const handleSingleSlotChange = (
    patch: Partial<Pick<CalendlyShiftForm, "name" | "start_time" | "end_time">>
  ) => {
    const slot = value.time_slots[0] ?? newStudyShiftTimeSlot();
    const merged = { ...slot, ...patch };
    const nameWasAuto = isAutoDerivedShiftName(slot.name, slot.start_time, slot.end_time);
    if (nameWasAuto && (patch.start_time != null || patch.end_time != null)) {
      merged.name = deriveShiftNameFromTimes(merged.start_time, merged.end_time);
    }
    applyTimeSlots([merged]);
  };

  const selectCourse = (courseId: number | null) => {
    if (courseId == null) {
      set({ course_ids: [], course_id: null });
      return;
    }
    set({ course_ids: [courseId], course_id: courseId });
  };

  const allTimesValid = value.time_slots.every((slot) =>
    isValidTimeRange(slot.start_time, slot.end_time)
  );
  const daysValid = value.days_of_week.length > 0;
  const primarySlot = value.time_slots[0];
  const period = primarySlot?.start_time ? getShiftPeriod(primarySlot.start_time) : "morning";
  const periodStyle = SHIFT_PERIOD_STYLES[period];

  return (
    <div className="space-y-5">
      {/* Calendly-style weekly availability */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 space-y-3">
        <div>
          <Label className="text-sm font-semibold text-slate-800">
            Weekly availability <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-slate-500 mt-0.5">
            {singleDay
              ? "Select the day this session runs."
              : "Select every day this shift applies � same time on each day."}
          </p>
        </div>

        {!singleDay && (
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px] px-2"
                onClick={() => applyWeekdayPreset([...preset.days])}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_OPTIONS.map((day) => {
            const selected = value.days_of_week.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={cn(
                  "flex flex-col items-center rounded-lg border py-2 px-1 transition-all text-center",
                  selected
                    ? "border-[#0070D0] bg-[#0070D0] text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#0070D0]/40"
                )}
              >
                <span className="text-[10px] font-bold uppercase">{day.short}</span>
                <span className={cn("text-[9px] mt-0.5 hidden sm:block", selected ? "text-white/80" : "text-slate-400")}>
                  {day.label.slice(0, 3)}
                </span>
              </button>
            );
          })}
        </div>

        {!daysValid && (
          <p className="text-xs text-red-600">Select at least one day.</p>
        )}
      </div>

      {/* Time blocks � toggle all slots in one view */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div>
          <Label className="text-sm font-semibold text-slate-800">
            Daily time blocks <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-slate-500 mt-0.5">
            {singleDay
              ? "Set when this session runs."
              : "Choose every time you teach on the selected days - no need to add slots one by one."}
          </p>
        </div>

        {singleDay ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Shift name</Label>
              <Input
                value={value.time_slots[0]?.name ?? value.name}
                onChange={(e) => handleSingleSlotChange({ name: e.target.value })}
                placeholder={deriveShiftNameFromTimes(
                  value.time_slots[0]?.start_time ?? "09:00",
                  value.time_slots[0]?.end_time ?? "11:00"
                )}
              />
            </div>
            <TimeSlotSelector
              value={{
                name: value.time_slots[0]?.name ?? value.name,
                start_time: value.time_slots[0]?.start_time ?? value.start_time,
                end_time: value.time_slots[0]?.end_time ?? value.end_time,
              }}
              onChange={handleSingleSlotChange}
            />
          </div>
        ) : (
          <StudyShiftTimeBlocksPicker
            slots={value.time_slots}
            onChange={applyTimeSlots}
          />
        )}

        <SchedulingTimezonePicker
          value={value.timezone}
          onChange={(tz) => set({ timezone: tz })}
        />
      </div>

      {/* Course � one course only */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div>
          <Label className="text-sm font-semibold text-slate-800">
            Course {(isInstructor || isAdmin) && <span className="text-red-500"> *</span>}
          </Label>
          <p className="text-xs text-slate-500 mt-0.5">
            One course per availability. Each time block is for that course only.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
          {isAdmin && (
            <label
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors sm:col-span-2",
                value.course_ids.length === 0
                  ? "border-[#0070D0] bg-[#0070D0]/5"
                  : "border-slate-200 hover:border-[#0070D0]/30"
              )}
            >
              <input
                type="radio"
                name="study-shift-course"
                checked={value.course_ids.length === 0}
                onChange={() => selectCourse(null)}
                className="accent-[#0070D0]"
              />
              <span>Shared - all courses (no specific assignment)</span>
            </label>
          )}

          {courses.map((c) => {
            if (!c.id) return null;
            const selected = value.course_id === c.id;
            return (
              <label
                key={c.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors",
                  selected
                    ? "border-[#0070D0] bg-[#0070D0]/5"
                    : "border-slate-200 hover:border-[#0070D0]/30"
                )}
              >
                <input
                  type="radio"
                  name="study-shift-course"
                  checked={selected}
                  onChange={() => selectCourse(c.id!)}
                  className="accent-[#0070D0]"
                />
                <span className="truncate">{c.title}</span>
              </label>
            );
          })}
        </div>

        {value.course_id ? (
          <p className="text-xs text-[#0070D0] font-medium">1 course selected</p>
        ) : isAdmin ? (
          <p className="text-xs text-slate-500">Shared slot for all courses</p>
        ) : null}
      </div>

      {/* Details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Max students</Label>
          <Input
            type="number"
            min={1}
            value={value.max_students ?? ""}
            onChange={(e) =>
              set({ max_students: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="Unlimited"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border px-3 py-2 h-10 mt-6">
          <Label className="text-sm">Active</Label>
          <Switch
            checked={value.is_active}
            onCheckedChange={(checked) => set({ is_active: checked })}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Notes</Label>
          <Textarea
            value={value.notes}
            onChange={(e) => set({ notes: e.target.value })}
            rows={2}
          />
        </div>
      </div>

      {/* Live preview */}
      {daysValid && allTimesValid && value.time_slots.every((s) => s.name.trim()) && (
        <div className={cn("rounded-xl border p-4", periodStyle.bg, periodStyle.border)}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Preview - learners will see
          </p>
          <div className="space-y-3">
            {value.time_slots.map((slot) => (
              <div key={slot.id} className="flex items-start gap-3">
                <div className={cn("w-1 self-stretch rounded-full shrink-0", periodStyle.accent)} />
                <div>
                  <p className="font-semibold text-slate-900">{slot.name}</p>
                  <p className="text-sm text-slate-600 flex items-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formatShiftTimeRange(slot.start_time, slot.end_time)} - {timezoneDisplayLabel(value.timezone)}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {value.days_of_week.map((d) => (
                      <span
                        key={`${slot.id}-${d}`}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/80 border border-slate-200"
                      >
                        {getWeekdayShort(d)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!singleDay && (
            <p className="text-[10px] text-slate-500 mt-3">
              Creates {value.days_of_week.length * value.time_slots.length} slot
              {value.days_of_week.length * value.time_slots.length === 1 ? "" : "s"} across{" "}
              {formatDaysShort(value.days_of_week)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function validateCalendlyForm(
  form: CalendlyShiftForm,
  isInstructor: boolean
): string | null {
  if (form.days_of_week.length === 0) return "Select at least one day.";
  if (!form.timezone?.trim()) return "Timezone is required.";
  if (form.time_slots.length === 0) return "Add at least one time slot.";

  for (const slot of form.time_slots) {
    if (!slot.name.trim()) return "Each time slot needs a name.";
    if (!slot.start_time || !slot.end_time) return "Start and end time are required for each slot.";
    if (!isValidTimeRange(slot.start_time, slot.end_time)) {
      return `"${slot.name}" � end time must be after start time.`;
    }
  }

  const slotKeys = form.time_slots.map((s) => `${s.start_time}-${s.end_time}`);
  if (new Set(slotKeys).size !== slotKeys.length) {
    return "Each time slot must have a different start and end time.";
  }

  if (isInstructor && form.course_ids.length === 0) {
    return "Select one course for this availability.";
  }
  if (form.course_ids.length > 1) {
    return "Select only one course.";
  }
  return null;
}
