import { useState } from "react";
import { Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatTime12Label,
  formatTime24,
  parseTime24,
  type Time12Parts,
} from "@/lib/scheduledDateTime";
import { cn } from "@/lib/utils";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTE_STEPS = Array.from({ length: 12 }, (_, i) => i * 5);

type AmPmTimePickerProps = {
  value: string;
  onChange: (time24: string) => void;
  id?: string;
  className?: string;
};

function TimePickerPanel({
  time24,
  onChange,
  onComplete,
}: {
  time24: string;
  onChange: (time24: string) => void;
  onComplete?: () => void;
}) {
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
        <p className="text-xl sm:text-2xl font-semibold tabular-nums text-[#0070D0]">
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

export function AmPmTimePicker({ value, onChange, id, className }: AmPmTimePickerProps) {
  const [open, setOpen] = useState(false);
  const time24 = value?.length >= 5 ? value.slice(0, 5) : value || "09:00";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full justify-start gap-2 font-normal tabular-nums",
            className,
          )}
        >
          <Clock3 className="h-4 w-4 shrink-0 text-[#0070D0]" />
          {formatTime12Label(time24)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-3 max-w-[calc(100vw-1.5rem)]"
        align="start"
        sideOffset={6}
        collisionPadding={12}
      >
        <TimePickerPanel
          time24={time24}
          onChange={onChange}
          onComplete={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
