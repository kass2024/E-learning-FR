import { useLayoutEffect, useRef, useState } from "react";

type StarburstAutoFitTextProps = {
  lines: string[];
  textColor: string;
  className?: string;
  maxFontSize?: number;
  minFontSize?: number;
};

export function StarburstAutoFitText({
  lines,
  textColor,
  className = "",
  maxFontSize = 26,
  minFontSize = 7,
}: StarburstAutoFitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  const visibleLines = lines.map((l) => l.trim()).filter(Boolean);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure || visibleLines.length === 0) {
      setFontSize(maxFontSize);
      return;
    }

    const fit = () => {
      const maxW = container.clientWidth;
      const maxH = container.clientHeight;
      if (maxW <= 0 || maxH <= 0) return;

      let low = minFontSize;
      let high = maxFontSize;
      let best = minFontSize;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        measure.style.fontSize = `${mid}px`;
        const fits = measure.scrollWidth <= maxW && measure.scrollHeight <= maxH;
        if (fits) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      setFontSize(best);
    };

    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [visibleLines.join("\n"), maxFontSize, minFontSize]);

  if (visibleLines.length === 0) return null;

  const renderLines = () => (
    <div className="flex flex-col items-center justify-center gap-[0.12em] w-full">
      {visibleLines.map((line, i) => (
        <span
          key={`${i}-${line}`}
          className={`font-black uppercase leading-[0.95] tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)] ${
            i === visibleLines.length - 1 && visibleLines.length > 2 ? "opacity-90" : ""
          }`}
          style={{ fontSize: i === visibleLines.length - 1 && visibleLines.length > 2 ? "0.72em" : undefined }}
        >
          {line}
        </span>
      ))}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`absolute inset-[18%] flex items-center justify-center overflow-hidden select-none ${className}`}
      style={{ color: textColor }}
    >
      <div
        ref={measureRef}
        className="invisible absolute left-0 top-0 w-full flex flex-col items-center justify-center pointer-events-none"
        aria-hidden
      >
        {renderLines()}
      </div>
      <div className="w-full text-center" style={{ fontSize: `${fontSize}px` }}>
        {renderLines()}
      </div>
    </div>
  );
}
