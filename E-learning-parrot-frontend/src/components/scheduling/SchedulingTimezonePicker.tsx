import { useMemo, useState } from "react";
import { ChevronsUpDown, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { COMMON_TIMEZONES } from "@/lib/commonTimezones";
import {
  buildTimezoneOptions,
  timezoneDisplayLabel,
} from "@/lib/meetingScheduleUtils";
import { cn } from "@/lib/utils";

type SchedulingTimezonePickerProps = {
  value: string;
  onChange: (iana: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
};

export function SchedulingTimezonePicker({
  value,
  onChange,
  label = "Timezone",
  required = true,
  className,
}: SchedulingTimezonePickerProps) {
  const [open, setOpen] = useState(false);

  const options = useMemo(
    () =>
      buildTimezoneOptions(
        COMMON_TIMEZONES.map((tz) => ({
          iana: tz.iana,
          label: timezoneDisplayLabel(tz.iana),
        }))
      ),
    []
  );

  const displayLabel = timezoneDisplayLabel(value);

  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-between font-normal text-sm"
          >
            <span className="flex items-center gap-2 truncate">
              <Globe className="h-4 w-4 shrink-0 text-[#0070D0]" />
              <span className="truncate">{displayLabel}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search time zone..." />
            <CommandList>
              <CommandEmpty>No time zone found.</CommandEmpty>
              <CommandGroup>
                {options.map((tz) => (
                  <CommandItem
                    key={tz.iana}
                    value={tz.label}
                    onSelect={() => {
                      onChange(tz.iana);
                      setOpen(false);
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
  );
}
