import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { StudyShiftRow } from "@/api/axios";
import {
  formatShiftTimeRange,
  formatShiftTimezoneShort,
  getShiftPeriod,
  SHIFT_PERIOD_STYLES,
} from "@/lib/studyShiftUtils";
import { timezoneDisplayLabel } from "@/lib/meetingScheduleUtils";
import { cn } from "@/lib/utils";
import { Clock, Globe, Pencil, Trash2, Users } from "lucide-react";

type StudyShiftCardProps = {
  shift: StudyShiftRow;
  showCreator?: boolean;
  compact?: boolean;
  onEdit?: (shift: StudyShiftRow) => void;
  onDelete?: (shift: StudyShiftRow) => void;
};

function courseLabel(shift: StudyShiftRow) {
  const titles = shift.course_titles?.length
    ? shift.course_titles
    : shift.course_title
      ? [shift.course_title]
      : [];
  return titles.length ? titles.join(", ") : "All courses";
}

export function StudyShiftCard({
  shift,
  showCreator = false,
  compact = false,
  onEdit,
  onDelete,
}: StudyShiftCardProps) {
  const period = getShiftPeriod(shift.start_time);
  const styles = SHIFT_PERIOD_STYLES[period];
  const capacity =
    shift.max_students != null && shift.max_students > 0
      ? Math.min(100, Math.round((shift.enrolled_count / shift.max_students) * 100))
      : null;
  const timeRange = formatShiftTimeRange(shift.start_time, shift.end_time);
  const tzShort = formatShiftTimezoneShort(shift.timezone);
  const tzFull = timezoneDisplayLabel(shift.timezone);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md",
        styles.border,
        !shift.is_active && "opacity-65",
        compact ? "p-2.5" : "p-3.5"
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", styles.accent)} />

      <div className="pl-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                styles.badge
              )}
            >
              {period}
            </span>
            {!shift.is_active && (
              <Badge variant="secondary" className="text-[10px] h-5">
                Inactive
              </Badge>
            )}
            {shift.is_full && (
              <Badge variant="destructive" className="text-[10px] h-5">
                Full
              </Badge>
            )}
          </div>

          <div>
            <p
              className={cn(
                "font-semibold text-slate-900 leading-snug",
                compact ? "text-sm line-clamp-2" : "text-base"
              )}
            >
              {shift.name}
            </p>
            <p
              className={cn(
                "mt-1 font-medium text-[#0070D0] leading-snug",
                compact ? "text-[11px] line-clamp-2" : "text-xs"
              )}
            >
              {courseLabel(shift)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className={cn("font-medium tabular-nums whitespace-nowrap", compact ? "text-[11px]" : "text-xs")}>
                {timeRange}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500" title={tzFull}>
              <Globe className="h-3 w-3 shrink-0 text-slate-400" />
              <span className={cn("truncate", compact ? "text-[10px]" : "text-[11px]")}>{tzShort}</span>
            </div>
          </div>

          {shift.max_students != null && (
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {shift.enrolled_count}/{shift.max_students} enrolled
                </span>
                <span>{capacity}%</span>
              </div>
              <Progress
                value={capacity ?? 0}
                className={cn("h-1.5", shift.is_full && "[&>div]:bg-red-500")}
              />
            </div>
          )}

          {showCreator && shift.created_by_name && (
            <p className="text-[10px] text-slate-400 truncate pt-0.5">
              by {shift.created_by_name}
              {shift.created_by_role ? ` (${shift.created_by_role})` : ""}
            </p>
          )}
        </div>

        {shift.can_manage && (onEdit || onDelete) && (
          <div className="flex shrink-0 flex-col gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onEdit(shift)}
                aria-label="Edit shift"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-500 hover:text-red-600"
                onClick={() => onDelete(shift)}
                aria-label="Delete shift"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
