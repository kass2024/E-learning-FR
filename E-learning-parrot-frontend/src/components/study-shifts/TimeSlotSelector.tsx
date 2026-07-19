import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AmPmTimePicker } from "@/components/ui/AmPmTimePicker";
import {
  SHIFT_PRESETS,
  SHIFT_PERIOD_STYLES,
  deriveShiftNameFromTimes,
  formatDuration,
  formatShiftTimeRange,
  getShiftPeriod,
  getTimeRangeDurationMinutes,
  isAutoDerivedShiftName,
  isValidTimeRange,
  matchShiftPreset,
  minutesToTime,
  parseTimeToMinutes,
  type ShiftPeriod,
} from "@/lib/studyShiftUtils";
import { cn } from "@/lib/utils";
import { Clock, Moon, Sun, Sunset } from "lucide-react";

const SLOT_ICONS: Record<string, typeof Sun> = {
  morning: Sun,
  afternoon: Sunset,
  evening: Moon,
  custom: Clock,
};

const SLOT_ICON_COLORS: Record<string, string> = {
  morning: "text-amber-500",
  afternoon: "text-sky-500",
  evening: "text-indigo-500",
  custom: "text-slate-500",
};

type TimeSlotValue = {
  name: string;
  start_time: string;
  end_time: string;
};

type TimeSlotSelectorProps = {
  value: TimeSlotValue;
  onChange: (patch: Partial<TimeSlotValue>) => void;
};

export function TimeSlotSelector({ value, onChange }: TimeSlotSelectorProps) {
  const matched = matchShiftPreset(value.start_time, value.end_time);
  const activeSlotId = matched?.id ?? "custom";
  const period: ShiftPeriod = value.start_time ? getShiftPeriod(value.start_time) : "morning";
  const periodStyle = SHIFT_PERIOD_STYLES[period];
  const duration = getTimeRangeDurationMinutes(value.start_time, value.end_time);
  const timeValid = isValidTimeRange(value.start_time, value.end_time);
  const nameAuto = isAutoDerivedShiftName(value.name, value.start_time, value.end_time);

  const applySlot = (start: string, end: string, slotName?: string) => {
    const nextName = nameAuto
      ? slotName ?? deriveShiftNameFromTimes(start, end)
      : value.name;
    onChange({ start_time: start, end_time: end, name: nextName });
  };

  const selectPreset = (preset: (typeof SHIFT_PRESETS)[number]) => {
    applySlot(preset.start_time, preset.end_time, preset.name);
  };

  const handleStartChange = (newStart: string) => {
    if (!newStart) return;
    const startMins = parseTimeToMinutes(newStart);
    const keepDuration = duration > 0 ? duration : 120;
    const newEnd = minutesToTime(startMins + keepDuration);
    applySlot(newStart, newEnd);
  };

  const handleEndChange = (newEnd: string) => {
    if (!newEnd) return;
    applySlot(value.start_time, newEnd);
  };

  const handleDurationChange = (mins: number) => {
    const startMins = parseTimeToMinutes(value.start_time);
    applySlot(value.start_time, minutesToTime(startMins + mins));
  };

  const slots = [
    ...SHIFT_PRESETS.map((p) => ({ ...p, isCustom: false })),
    {
      id: "custom" as const,
      label: "Custom",
      name: "Custom",
      start_time: value.start_time,
      end_time: value.end_time,
      isCustom: true,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {slots.map((slot) => {
          const isActive = activeSlotId === slot.id;
          const Icon = SLOT_ICONS[slot.id] ?? Clock;
          const iconColor = SLOT_ICON_COLORS[slot.id] ?? "text-slate-500";
          const range =
            isActive || slot.isCustom
              ? formatShiftTimeRange(value.start_time, value.end_time)
              : formatShiftTimeRange(slot.start_time, slot.end_time);

          const className = cn(
            "rounded-xl border p-3 text-left transition-all",
            isActive
              ? "border-[#0070D0] bg-[#0070D0]/5 ring-2 ring-[#0070D0]/20 shadow-sm"
              : "border-slate-200 bg-white hover:border-[#0070D0]/30",
            slot.isCustom && "cursor-default"
          );

          const inner = (
            <>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn("h-3.5 w-3.5", iconColor)} />
                <span className="text-xs font-semibold text-slate-800">{slot.label}</span>
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium block",
                  isActive ? "text-[#0070D0]" : "text-slate-500"
                )}
              >
                {range}
              </span>
            </>
          );

          if (slot.isCustom) {
            return (
              <div key={slot.id} className={className}>
                {inner}
              </div>
            );
          }

          return (
            <button key={slot.id} type="button" onClick={() => selectPreset(slot)} className={className}>
              {inner}
            </button>
          );
        })}
      </div>

      {/* Active slot editor � start, end, duration linked */}
      <div className={cn("rounded-xl border p-4 space-y-4", periodStyle.bg, periodStyle.border)}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Active time slot
            </p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {formatShiftTimeRange(value.start_time, value.end_time)}
            </p>
          </div>
          {timeValid && (
            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-white/90 border border-slate-200 text-slate-600">
              {formatDuration(duration)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">
              Start <span className="text-red-500">*</span>
            </Label>
            <AmPmTimePicker
              value={value.start_time}
              onChange={handleStartChange}
              className="bg-white"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              End <span className="text-red-500">*</span>
            </Label>
            <AmPmTimePicker
              value={value.end_time}
              onChange={handleEndChange}
              className="bg-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Duration</span>
            <span className="font-medium">{timeValid ? formatDuration(duration) : "�"}</span>
          </div>
          <Slider
            min={30}
            max={480}
            step={15}
            value={[Math.min(480, Math.max(30, duration || 120))]}
            onValueChange={([mins]) => handleDurationChange(mins)}
            disabled={!value.start_time || !timeValid}
            className="py-1"
          />
          <p className="text-[10px] text-slate-500">
            Drag to adjust length � end time moves with start automatically.
          </p>
        </div>

        {!timeValid && value.start_time && value.end_time && (
          <p className="text-xs text-red-600">End time must be after start time.</p>
        )}
      </div>
    </div>
  );
}

export { deriveShiftNameFromTimes, isAutoDerivedShiftName };
