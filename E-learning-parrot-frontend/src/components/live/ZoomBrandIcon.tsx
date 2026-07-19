import { cn } from "@/lib/utils";
import { PLATFORM_ZOOM_LOGO_URL } from "@/lib/zoomBrandAssets";

type Props = {
  className?: string;
  size?: number;
};

export function ZoomBrandIcon({ className, size = 16 }: Props) {
  return (
    <img
      src={PLATFORM_ZOOM_LOGO_URL}
      alt=""
      aria-hidden
      className={cn("inline-block shrink-0 rounded-sm object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
