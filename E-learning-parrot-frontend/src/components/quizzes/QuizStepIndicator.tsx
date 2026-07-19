import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type Step = { id: number; label: string };

type Props = {
  steps: Step[];
  current: number;
};

export const QuizStepIndicator = ({ steps, current }: Props) => (
  <ol className="flex flex-wrap gap-2 sm:gap-0 sm:items-center sm:justify-between mb-6">
    {steps.map((step, idx) => {
      const done = current > step.id;
      const active = current === step.id;
      return (
        <li key={step.id} className="flex items-center gap-2 sm:flex-1">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors",
              done && "bg-primary border-primary text-primary-foreground",
              active && !done && "border-primary text-primary bg-primary/10",
              !done && !active && "border-muted-foreground/30 text-muted-foreground",
            )}
          >
            {done ? <Check className="h-4 w-4" /> : step.id}
          </div>
          <span
            className={cn(
              "text-xs sm:text-sm font-medium hidden sm:inline",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {step.label}
          </span>
          {idx < steps.length - 1 && (
            <div className="hidden sm:block flex-1 h-px bg-border mx-2 min-w-[12px]" aria-hidden />
          )}
        </li>
      );
    })}
  </ol>
);

export default QuizStepIndicator;
