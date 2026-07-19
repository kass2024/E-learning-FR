import { cn } from "@/lib/utils";
import { LOGO, logoUrl } from "@/lib/brandLogo";

type ParrotLogoProps = {
  className?: string;
  imgClassName?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showRing?: boolean;
};

const sizeMap = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-14 h-14",
} as const;

export function ParrotLogo({
  className,
  imgClassName,
  alt = LOGO.alt,
  size = "md",
  showRing = true,
}: ParrotLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-white overflow-hidden",
        showRing && "ring-2 ring-primary shadow-sm",
        sizeMap[size],
        className
      )}
    >
      <img
        src={logoUrl(LOGO.src)}
        alt={alt}
        className={cn("w-full h-full object-contain", imgClassName)}
        decoding="async"
      />
    </span>
  );
}

export default ParrotLogo;
