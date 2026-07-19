import { KeyboardEvent, useRef, useState } from "react";
import { AlertCircle, Mail, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

function emailInitial(email: string) {
  const local = email.split("@")[0] ?? "";
  return (local[0] ?? "?").toUpperCase();
}

type EmailChipInputProps = {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  description?: string;
};

export function EmailChipInput({
  value,
  onChange,
  placeholder = "name@example.com",
  className,
  disabled,
  label,
  description,
}: EmailChipInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addEmail = (raw: string) => {
    const email = normalizeEmail(raw);
    if (!email) return false;
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email address.");
      return false;
    }
    if (value.includes(email)) {
      setError("This email is already added.");
      return false;
    }
    onChange([...value, email]);
    setDraft("");
    setError(null);
    return true;
  };

  const addFromDraft = () => {
    addEmail(draft);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (!draft.trim()) return;
      e.preventDefault();
      addFromDraft();
    }
    if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handlePaste = (text: string) => {
    const parts = text.split(/[\s,;]+/).map(normalizeEmail).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    let added = false;
    for (const email of parts) {
      if (!EMAIL_RE.test(email) || next.includes(email)) continue;
      next.push(email);
      added = true;
    }
    if (added) {
      onChange(next);
      setDraft("");
      setError(null);
    }
  };

  const focusInput = () => {
    if (!disabled) inputRef.current?.focus();
  };

  return (
    <div className={cn("space-y-2", className)}>
      {(label || description) && (
        <div className="space-y-0.5">
          {label && (
            <p className="text-sm font-medium text-[#0070D0] flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-[#0070D0]/70" />
              {label}
            </p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <div
        role="group"
        aria-label={label ?? "Email addresses"}
        onClick={focusInput}
        className={cn(
          "group relative rounded-xl border bg-white transition-all duration-200 cursor-text",
          "shadow-sm hover:shadow-md hover:border-[#0070D0]/25",
          focused && !error && "border-[#0070D0]/40 ring-2 ring-[#0070D0]/10 shadow-md",
          error && "border-red-300 ring-2 ring-red-100",
          disabled && "opacity-60 pointer-events-none bg-slate-50",
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 min-h-[52px]">
          {value.map((email) => (
            <span
              key={email}
              className={cn(
                "inline-flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-lg text-xs font-medium",
                "bg-gradient-to-r from-[#0070D0]/10 to-[#1A8AD8]/8 text-[#0070D0]",
                "border border-[#0070D0]/15 shadow-sm",
                "animate-in fade-in zoom-in-95 duration-150",
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#0070D0] text-[10px] font-bold text-white">
                {emailInitial(email)}
              </span>
              <span className="max-w-[180px] truncate">{email}</span>
              <button
                type="button"
                className={cn(
                  "rounded-md p-0.5 text-[#0070D0]/60 transition-colors",
                  "hover:bg-[#0070D0]/15 hover:text-[#0070D0]",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((e) => e !== email));
                }}
                aria-label={`Remove ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          <div className="flex flex-1 min-w-[140px] items-center gap-2">
            {value.length === 0 && !draft && !focused && (
              <Mail className="h-4 w-4 shrink-0 text-[#0070D0]/25 ml-0.5" />
            )}
            <input
              ref={inputRef}
              type="email"
              value={draft}
              disabled={disabled}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                if (draft.trim()) addFromDraft();
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (/[\s,;]/.test(text)) {
                  e.preventDefault();
                  handlePaste(text);
                }
              }}
              placeholder={value.length === 0 ? placeholder : "Add another…"}
              className={cn(
                "flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60",
                "h-8 py-1",
              )}
            />
          </div>

          <Button
            type="button"
            size="sm"
            disabled={disabled || !draft.trim()}
            onClick={(e) => {
              e.stopPropagation();
              addFromDraft();
            }}
            className={cn(
              "shrink-0 h-8 px-3 gap-1.5 rounded-lg font-medium transition-all",
              "bg-[#FCC400] text-[#0070D0] hover:bg-[#e8954a] border-0 shadow-sm",
              "disabled:opacity-40 disabled:bg-[#FCC400]/50",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-0.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {value.length === 0 ? (
            <>
              <span>Press</span>
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 shadow-sm">
                Enter
              </kbd>
              <span>or paste comma-separated emails</span>
            </>
          ) : (
            <span className="font-medium text-[#0070D0]/70">
              {value.length} guest{value.length === 1 ? "" : "s"} added
            </span>
          )}
        </div>
        {value.length > 0 && (
          <button
            type="button"
            className="text-xs font-medium text-[#0070D0]/60 hover:text-[#0070D0] hover:underline transition-colors"
            onClick={() => onChange([])}
          >
            Clear all
          </button>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 animate-in fade-in slide-in-from-top-1 duration-150">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
