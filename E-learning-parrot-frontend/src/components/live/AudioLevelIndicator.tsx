import { Mic, MicOff } from "lucide-react";

type Props = {
  level: number;
  muted: boolean;
  label?: string;
};

export function AudioLevelIndicator({ level, muted, label = "Mic level" }: Props) {
  const bars = 7;
  const activeBars = muted ? 0 : Math.ceil(Math.min(1, Math.max(0, level)) * bars);

  return (
    <div
      className="pointer-events-none absolute bottom-[80px] left-4 z-[15] flex items-center gap-2 rounded-lg bg-black/70 px-3 py-2 backdrop-blur-sm"
      aria-label={label}
    >
      <span className={muted ? "text-red-400" : "text-emerald-400"}>
        {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </span>
      <div className="flex items-end gap-[2px]">
        {Array.from({ length: bars }).map((_, index) => (
          <span
            key={index}
            className={`w-[3px] rounded-sm transition-all duration-75 ${
              index < activeBars
                ? index >= 5
                  ? "bg-amber-400"
                  : "bg-emerald-400"
                : "bg-zinc-600"
            }`}
            style={{ height: 4 + index * 2.5 }}
          />
        ))}
      </div>
      <span className="text-[10px] text-zinc-400">{muted ? "Muted" : level > 0.05 ? "Speaking" : "Live"}</span>
    </div>
  );
}
