import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { COMMON_TIMEZONES, timezoneLabel, type CommonTimezone } from "@/lib/commonTimezones";

type TimezoneComboboxProps = {
  value: string;
  onChange: (iana: string) => void;
  options?: CommonTimezone[];
  placeholder?: string;
  className?: string;
  id?: string;
};

export function TimezoneCombobox({
  value,
  onChange,
  options = COMMON_TIMEZONES,
  placeholder = "Search time zone…",
  className,
  id,
}: TimezoneComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate text-left">{timezoneLabel(value) || "Select time zone"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No time zone found.</CommandEmpty>
            <CommandGroup>
              {options.map((tz) => (
                <CommandItem
                  key={`${tz.iana}-${tz.code}`}
                  value={`${tz.label} ${tz.name} ${tz.iana}`}
                  onSelect={() => {
                    onChange(tz.iana);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === tz.iana ? "opacity-100" : "opacity-0")} />
                  {tz.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
