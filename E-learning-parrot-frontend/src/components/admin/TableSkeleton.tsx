export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-8 bg-muted rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-10 bg-muted/70 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
