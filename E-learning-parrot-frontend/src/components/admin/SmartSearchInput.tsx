import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  totalCount?: number;
  className?: string;
  id?: string;
};

export function SmartSearchInput({
  value,
  onChange,
  placeholder = "Search by name, email, amount, status…",
  resultCount,
  totalCount,
  className = "",
  id,
}: Props) {
  const showCount = typeof resultCount === "number" && typeof totalCount === "number" && value.trim();

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
            onClick={() => onChange("")}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {showCount ? (
        <p className="text-xs text-muted-foreground">
          Showing {resultCount} of {totalCount} results
        </p>
      ) : null}
    </div>
  );
}

export default SmartSearchInput;
