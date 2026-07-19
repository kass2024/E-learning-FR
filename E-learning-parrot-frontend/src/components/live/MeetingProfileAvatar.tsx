import { useEffect, useState } from "react";
import { resolveDisplayAvatarUrl } from "@/lib/zoomAvatars";

type Props = {
  name: string;
  avatarUrl?: string | null;
  className?: string;
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/** Zoom CDN profile picture from the API, with initials fallback (never a random stock image). */
export function MeetingProfileAvatar({ name, avatarUrl, className = "" }: Props) {
  const zoomUrl = resolveDisplayAvatarUrl(avatarUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [zoomUrl]);

  if (!zoomUrl || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-[#0e72ed] text-lg font-semibold text-white ${className}`}
        aria-label={name}
      >
        {initialsFor(name)}
      </div>
    );
  }

  return (
    <img
      src={zoomUrl}
      alt={name}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
