import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_IMAGE, resolveImage } from "@/lib/defaultImages";

type SafeImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: string;
};

export function SafeImage({
  src,
  alt = "",
  fallback = DEFAULT_IMAGE,
  className,
  onError,
  ...props
}: SafeImageProps) {
  const [currentSrc, setCurrentSrc] = useState(() => resolveImage(src, fallback));

  useEffect(() => {
    setCurrentSrc(resolveImage(src, fallback));
  }, [src, fallback]);

  const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    onError?.(event);
    setCurrentSrc((prev) => {
      if (prev === DEFAULT_IMAGE) return prev;
      if (prev !== fallback) return fallback;
      return DEFAULT_IMAGE;
    });
  };

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      className={cn("bg-muted object-cover", className)}
      onError={handleError}
      loading={props.loading ?? "lazy"}
    />
  );
}
