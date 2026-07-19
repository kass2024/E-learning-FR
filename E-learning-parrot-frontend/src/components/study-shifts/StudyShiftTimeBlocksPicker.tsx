import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AmPmTimePicker } from "@/components/ui/AmPmTimePicker";
import {
  SHIFT_PRESETS,
  SHIFT_PERIOD_STYLES,
  formatShiftTimeRange,
  getShiftPeriod,
  isValidTimeRange,
  sortShiftsByTime,
  newStudyShiftTimeSlot,
  type StudyShiftTimeSlot,
} from "@/lib/studyShiftUtils";
import { cn } from "@/lib/utils";
import { Check, Clock, Moon, Plus, Sun, Sunset, X } from "lucide-react";

const PRESET_ICONS = {
  morning: Sun,
  afternoon: Sunset,
  evening: Moon,
} as const;

function slotTimeKey(start: string, end: string) {
  return `${start.slice(0, 5)}-${end.slice(0, 5)}`;
}

function isPresetActive(slots: StudyShiftTimeSlot[], start: string, end: string) {
  return slots.some((s) => slotTimeKey(s.start_time, s.end_time) === slotTimeKey(start, end));
}

function isCustomSlot(slot: StudyShiftTimeSlot) {
  return !SHIFT_PRESETS.some(
    (p) => slotTimeKey(p.start_time, p.end_time) === slotTimeKey(slot.start_time, slot.end_time)
  );
}

type StudyShiftTimeBlocksPickerProps = {
  slots: StudyShiftTimeSlot[];
  onChange: (slots: StudyShiftTimeSlot[]) => void;
};

export function StudyShiftTimeBlocksPicker({ slots, onChange }: StudyShiftTimeBlocksPickerProps) {
  const [customStart, setCustomStart] = useState("10:00");
  const [customEnd, setCustomEnd] = useState("12:00");
  const [showCustomForm, setShowCustomForm] = useState(false);

  const customSlots = slots.filter(isCustomSlot);
  const selectedCount = slots.length;

  const applySlots = (next: StudyShiftTimeSlot[]) => {
    const sorted = sortShiftsByTime(
      next.map((s) => ({
        ...s,
        start_time: s.start_time.slice(0, 5),
        end_time: s.end_time.slice(0, 5),
      }))
    ) as StudyShiftTimeSlot[];
    onChange(sorted);
  };

  const togglePreset = (start: string, end: string, name: string) => {
    const key = slotTimeKey(start, end);
    if (isPresetActive(slots, start, end)) {
      applySlots(slots.filter((s) => slotTimeKey(s.start_time, s.end_time) !== key));
      return;
    }
    const slot = newStudyShiftTimeSlot(start, end);
    slot.name = name;
    applySlots([...slots, slot]);
  };

  const selectAllPresets = () => {
    const merged = [...slots];
    for (const preset of SHIFT_PRESETS) {
      if (!isPresetActive(merged, preset.start_time, preset.end_time)) {
        const slot = newStudyShiftTimeSlot(preset.start_time, preset.end_time);
        slot.name = preset.name;
        merged.push(slot);
      }
    }
    applySlots(merged);
  };

  const clearAll = () => applySlots([]);

  const addCustomSlot = () => {
    if (!isValidTimeRange(customStart, customEnd)) return;
    const key = slotTimeKey(customStart, customEnd);
    if (slots.some((s) => slotTimeKey(s.start_time, s.end_time) === key)) return;
    applySlots([...slots, newStudyShiftTimeSlot(customStart, customEnd)]);
    setShowCustomForm(false);
  };

  const removeSlot = (id: string) => {
    applySlots(slots.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Turn on every block you teach. All selected times apply to the days above.
        </p>
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={selectAllPresets}>
            Select all
          </Button>
          {selectedCount > 0 && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {SHIFT_PRESETS.map((preset) => {
          const active = isPresetActive(slots, preset.start_time, preset.end_time);
          const Icon = PRESET_ICONS[preset.id as keyof typeof PRESET_ICONS] ?? Clock;
          const periodStyle = SHIFT_PERIOD_STYLES[getShiftPeriod(preset.start_time)];

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => togglePreset(preset.start_time, preset.end_time, preset.name)}
              className={cn(
                "relative rounded-xl border p-3 text-left transition-all",
                active
                  ? "border-[#0070D0] bg-[#0070D0]/5 ring-2 ring-[#0070D0]/20"
                  : "border-slate-200 bg-white hover:border-[#0070D0]/30"
              )}
            >
              {active && (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0070D0] text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn("h-4 w-4", active ? "text-[#0070D0]" : "text-slate-400")} />
                <span className="text-sm font-semibold text-slate-800">{preset.label}</span>
              </div>
              <span className={cn("text-xs font-medium", active ? "text-[#0070D0]" : "text-slate-500")}>
                {formatShiftTimeRange(preset.start_time, preset.end_time)}
              </span>
              <span className={cn("mt-2 block text-[10px] font-medium px-2 py-0.5 rounded-full w-fit", periodStyle.badge)}>
                {active ? "Included" : "Tap to add"}
              </span>
            </button>
          );
        })}
      </div>

      {customSlots.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600">Custom times</Label>
          {customSlots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{slot.name}</p>
                <p className="text-xs text-slate-500">
                  {formatShiftTimeRange(slot.start_time, slot.end_time)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-red-600"
                onClick={() => removeSlot(slot.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {!showCustomForm ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => setShowCustomForm(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add a custom time (optional)
        </Button>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-3">
          <p className="text-xs font-semibold text-slate-700">Custom time block</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <AmPmTimePicker value={customStart} onChange={setCustomStart} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End</Label>
              <AmPmTimePicker value={customEnd} onChange={setCustomEnd} />
            </div>
          </div>
          {!isValidTimeRange(customStart, customEnd) && (
            <p className="text-xs text-red-600">End time must be after start time.</p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-[#0070D0] hover:bg-[#0070D0]/90"
              disabled={!isValidTimeRange(customStart, customEnd)}
              onClick={addCustomSlot}
            >
              Add this time
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowCustomForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {selectedCount === 0 ? (
        <p className="text-xs text-red-600">Select at least one time block.</p>
      ) : (
        <p className="text-xs font-medium text-[#0070D0]">
          {selectedCount} time block{selectedCount === 1 ? "" : "s"} selected
          {selectedCount > 0 && (
            <span className="text-slate-500 font-normal">
              {" "}
              ({slots.map((s) => formatShiftTimeRange(s.start_time, s.end_time)).join(", ")})
            </span>
          )}
        </p>
      )}
    </div>
  );
}
