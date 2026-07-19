import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type MeetingProviderChoice = "daily" | "zoom";

type Props = {
  value: MeetingProviderChoice;
  onChange: (next: MeetingProviderChoice) => void;
  available?: string[];
  disabled?: boolean;
  dailyConfigured?: boolean;
  dailyDomain?: string | null;
  hint?: string;
  showStatus?: boolean;
};

/**
 * Shared Daily / Zoom platform picker used across Settings surfaces.
 */
export function MeetingProviderPicker({
  value,
  onChange,
  available = ["daily", "zoom"],
  disabled = false,
  dailyConfigured = false,
  dailyDomain = null,
  hint,
  showStatus = true,
}: Props) {
  const dailyOk = available.includes("daily");
  const zoomOk = available.includes("zoom");

  return (
    <div className="max-w-lg space-y-3">
      <Label>Meeting platform</Label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!dailyOk || disabled}
          onClick={() => onChange("daily")}
          className={cn(
            "rounded-lg border px-4 py-3 text-left transition-colors",
            value === "daily"
              ? "border-[#0070D0] bg-[#0070D0] text-white"
              : "border-[#0070D0]/20 bg-white hover:border-[#0070D0]/40",
            (!dailyOk || disabled) && "cursor-not-allowed opacity-50",
          )}
        >
          <p className="text-sm font-semibold">Daily</p>
          <p className={cn("mt-1 text-xs", value === "daily" ? "text-white/80" : "text-muted-foreground")}>
            Default · private rooms
          </p>
        </button>
        <button
          type="button"
          disabled={!zoomOk || disabled}
          onClick={() => onChange("zoom")}
          className={cn(
            "rounded-lg border px-4 py-3 text-left transition-colors",
            value === "zoom"
              ? "border-[#0070D0] bg-[#0070D0] text-white"
              : "border-[#0070D0]/20 bg-white hover:border-[#0070D0]/40",
            (!zoomOk || disabled) && "cursor-not-allowed opacity-50",
          )}
        >
          <p className="text-sm font-semibold">Zoom</p>
          <p className={cn("mt-1 text-xs", value === "zoom" ? "text-white/80" : "text-muted-foreground")}>
            Licensed Zoom hosts
          </p>
        </button>
      </div>
      {showStatus && value === "daily" && dailyConfigured && dailyDomain ? (
        <p className="text-xs text-emerald-700">Daily configured ({dailyDomain})</p>
      ) : null}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
