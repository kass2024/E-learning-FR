import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Clock, CalendarDays } from "lucide-react";
import { getStudyShifts, type StudyShiftRow } from "@/api/axios";
import {
  readStudyShiftCache,
  writeStudyShiftCache,
} from "@/lib/studyShiftCache";
import {
  formatDaysShort,
  formatShiftTimeRange,
  getShiftPeriod,
  getWeekdayShort,
  groupShiftsBySchedule,
  SHIFT_PERIOD_STYLES,
} from "@/lib/studyShiftUtils";
import { cn } from "@/lib/utils";

type StudyShiftPickerProps = {
  courseId: number;
  value?: number[];
  platformInstitutionId?: number | null;
  ensureDefaults?: boolean;
  onChange: (shiftIds: number[], shifts: StudyShiftRow[]) => void;
  onShiftsLoaded?: (hasShifts: boolean) => void;
};

function shiftScheduleKey(shift: StudyShiftRow): string {
  return `${shift.name}|${shift.start_time}|${shift.end_time}`;
}

function toggleShiftSelection(
  currentIds: number[],
  shift: StudyShiftRow,
  allShifts: StudyShiftRow[]
): number[] {
  if (currentIds.includes(shift.id)) {
    return currentIds.filter((id) => id !== shift.id);
  }

  const groupKey = shiftScheduleKey(shift);
  const withoutSameGroup = currentIds.filter((id) => {
    const existing = allShifts.find((s) => s.id === id);
    if (!existing) return true;
    return shiftScheduleKey(existing) !== groupKey;
  });

  return [...withoutSameGroup, shift.id];
}

export function StudyShiftPicker({
  courseId,
  value = [],
  platformInstitutionId = null,
  ensureDefaults = false,
  onChange,
  onShiftsLoaded,
}: StudyShiftPickerProps) {
  const cached = readStudyShiftCache(courseId, platformInstitutionId);
  const [loading, setLoading] = useState(!cached);
  const [shifts, setShifts] = useState<StudyShiftRow[]>(cached ?? []);
  const [error, setError] = useState<string | null>(null);
  const onLoadedRef = useRef(onShiftsLoaded);

  onLoadedRef.current = onShiftsLoaded;

  useEffect(() => {
    let mounted = true;
    let notified = false;
    const notifyLoaded = (hasShifts: boolean) => {
      if (notified) return;
      notified = true;
      onLoadedRef.current?.(hasShifts);
    };

    const cachedRows = readStudyShiftCache(courseId, platformInstitutionId);

    if (cachedRows) {
      setShifts(Array.isArray(cachedRows) ? cachedRows : []);
      setLoading(false);
      notifyLoaded(Array.isArray(cachedRows) && cachedRows.length > 0);
    } else {
      setLoading(true);
      setShifts([]);
    }
    setError(null);

    getStudyShifts({
      course_id: courseId,
      active_only: true,
      platform_institution_id: platformInstitutionId,
      ensure_defaults: ensureDefaults,
    })
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data?.study_shifts) ? data.study_shifts : [];
        setShifts(list);
        writeStudyShiftCache(courseId, list, platformInstitutionId);
        notifyLoaded(list.length > 0);
      })
      .catch(() => {
        if (!mounted) return;
        if (!cachedRows) {
          setError("Could not load study shifts.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [courseId, platformInstitutionId, ensureDefaults]);

  const groups = useMemo(() => groupShiftsBySchedule(shifts), [shifts]);

  const selectedShifts = useMemo(
    () => shifts.filter((s) => value.includes(s.id)).sort((a, b) => a.day_of_week - b.day_of_week),
    [shifts, value]
  );

  const handleDayClick = (shift: StudyShiftRow) => {
    const nextIds = toggleShiftSelection(value, shift, shifts);
    const nextShifts = shifts.filter((s) => nextIds.includes(s.id));
    onChange(nextIds, nextShifts);
  };

  if (loading && shifts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading available shifts�
      </div>
    );
  }

  if (error && shifts.length === 0) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (groups.length === 0) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
        Weekly study times are not available for this course yet. Please try again or contact support.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      {loading && shifts.length > 0 && (
        <p className="text-[10px] text-slate-400 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Refreshing shifts�
        </p>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-[#0070D0]" />
          Weekly study time <span className="text-red-500">*</span>
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Pick one day per time block. You can select multiple blocks on the same day (e.g. morning and afternoon).
        </p>
      </div>

      <div className="space-y-2">
        {groups.map((group) => {
          const period = getShiftPeriod(group.start_time);
          const styles = SHIFT_PERIOD_STYLES[period];
          const activeInGroup = group.shifts.some((s) => value.includes(s.id));
          const availableShifts = group.shifts.filter((s) => !s.is_full);

          return (
            <div
              key={group.key}
              className={cn(
                "rounded-lg border bg-white overflow-hidden transition-shadow",
                activeInGroup ? "border-[#0070D0] shadow-sm ring-1 ring-[#0070D0]/20" : "border-slate-200"
              )}
            >
              <div className={cn("px-3 py-2 border-b flex items-center gap-2", styles.bg, styles.border)}>
                <div className={cn("w-1 h-8 rounded-full shrink-0", styles.accent)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{group.name}</p>
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatShiftTimeRange(group.start_time, group.end_time)}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  {formatDaysShort(group.days_of_week)}
                </span>
              </div>

              <div className="p-2.5">
                <p className="text-[10px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                  Choose your day
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(group.shifts ?? []).map((shift) => {
                    const selected = value.includes(shift.id);
                    const disabled = shift.is_full;
                    return (
                      <button
                        key={shift.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleDayClick(shift)}
                        className={cn(
                          "min-w-[3.5rem] rounded-lg border px-3 py-2 text-center transition-all",
                          selected
                            ? "border-[#0070D0] bg-[#0070D0] text-white"
                            : disabled
                              ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
                              : "border-slate-200 hover:border-[#0070D0]/50 bg-white"
                        )}
                      >
                        <span className="text-xs font-bold block">{getWeekdayShort(shift.day_of_week)}</span>
                        {shift.seats_available != null && (
                          <span
                            className={cn(
                              "text-[9px] block mt-0.5",
                              selected ? "text-white/80" : "text-slate-400"
                            )}
                          >
                            {shift.is_full ? "Full" : `${shift.seats_available} left`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {availableShifts.length === 0 && (
                  <p className="text-[10px] text-red-500 mt-1">All days full for this time slot.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedShifts.length > 0 && (
        <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1.5 space-y-0.5">
          <p className="font-medium">Selected ({selectedShifts.length} day{selectedShifts.length === 1 ? "" : "s"}):</p>
          {selectedShifts.map((shift) => (
            <p key={shift.id}>
              {shift.name} � {getWeekdayShort(shift.day_of_week)}{" "}
              {formatShiftTimeRange(shift.start_time, shift.end_time)}
            </p>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <p className="text-[10px] text-amber-700">Please select at least one day and time to continue.</p>
      )}
    </div>
  );
}
