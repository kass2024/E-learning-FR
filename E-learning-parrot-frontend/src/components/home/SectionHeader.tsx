import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-12 max-w-3xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#1F8A4C] mb-3">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#1F8A4C] tracking-tight mb-3">
        {title}
      </h2>
      {description && (
        <p className="text-base text-slate-600 leading-relaxed">{description}</p>
      )}
    </div>
  );
}
