type Props = {
  active: boolean;
  /** 0–1 live mic/speaker level for Zoom-style animated bar heights */
  level?: number;
  label?: string;
  className?: string;
};

export function SpeakingWaveOverlay({ active, level = 0, label, className = "" }: Props) {
  const clamped = Math.min(1, Math.max(0, level));
  const show = active || clamped > 0.04;

  return (
    <div
      className={`pointer-events-none flex items-center gap-2 rounded-full border border-emerald-500/30 bg-black/70 px-3 py-1.5 backdrop-blur-sm transition-opacity duration-150 ${
        show ? "opacity-100" : "opacity-0"
      } ${className}`}
      aria-hidden={!show}
    >
      <div className="flex h-4 items-end gap-0.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => {
          const threshold = (i + 1) / 5;
          const lit = clamped >= threshold * 0.55;
          const h = lit ? 6 + Math.round(clamped * (10 + i * 2)) : 3;
          return (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-75 ${
                lit ? "bg-emerald-400" : "bg-zinc-600"
              } ${active && lit ? "animate-speaking-bar" : ""}`}
              style={{
                height: h,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          );
        })}
      </div>
      {label && <span className="max-w-[160px] truncate text-[11px] font-medium text-emerald-100">{label}</span>}
    </div>
  );
}
