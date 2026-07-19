import { getPublicStorageUrl } from "@/lib/apiConfig";
import { getAvatarImage } from "@/lib/defaultImages";

export function isHttpAvatarUrl(value?: string | null): boolean {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Institution / meeting branding images (includes uploaded logo.png paths). */
export function resolveBrandingImageUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (isHttpAvatarUrl(trimmed)) return trimmed;
  const publicUrl = getPublicStorageUrl(trimmed);
  if (publicUrl) return publicUrl;
  if (trimmed.startsWith("/")) return trimmed;
  return null;
}

/** Prefer Zoom CDN avatars; reject site logo paths mistaken for profile pictures. */
export function isZoomCdnAvatarUrl(value?: string | null): boolean {
  if (!isHttpAvatarUrl(value)) return false;
  return /zoom\.us|zoomcdn/i.test(value!.trim());
}

/** Stock/placeholder URLs must never appear as a meeting host profile. */
export function isPlaceholderAvatarUrl(value?: string | null): boolean {
  if (!value?.trim()) return true;
  const lower = value.trim().toLowerCase();
  if (lower.includes("picsum.photos")) return true;
  if (lower.includes("xander-avatar") || lower.includes("xander-user")) return true;
  if (/\/placeholder[-_]?logo/i.test(lower)) return true;
  if (/\/default[-_]?avatar/i.test(lower)) return true;
  return false;
}

/** Resolve institution / platform logo for Zoom UI (brand bar + host tile). */
export function resolveZoomBrandingLogoUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (isPlaceholderAvatarUrl(trimmed)) return null;
  if (isZoomCdnAvatarUrl(trimmed)) return trimmed;
  const fromStorage = resolveBrandingImageUrl(trimmed);
  if (fromStorage) return fromStorage;
  if (isHttpAvatarUrl(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) {
    const publicUrl = getPublicStorageUrl(trimmed);
    return publicUrl ?? trimmed;
  }
  return getPublicStorageUrl(trimmed);
}

export function resolveDisplayAvatarUrl(value?: string | null): string | null {
  if (!value?.trim() || isPlaceholderAvatarUrl(value)) return null;
  const trimmed = value.trim();
  if (isZoomCdnAvatarUrl(trimmed)) return trimmed;
  return resolveBrandingImageUrl(trimmed) ?? resolveMeetingAvatarUrl(trimmed);
}

export function resolveMeetingAvatarUrl(value?: string | null): string | null {
  if (!isHttpAvatarUrl(value) || isPlaceholderAvatarUrl(value)) return null;
  const trimmed = value!.trim();
  return trimmed;
}

export function collectZoomAvatarUrls(
  participants: Array<{ userId?: number; avatar?: string; isHost?: boolean }>,
): Record<number, string> {
  const map: Record<number, string> = {};
  for (const participant of participants) {
    const userId = participant.userId;
    if (typeof userId !== "number" || !isHttpAvatarUrl(participant.avatar)) continue;
    map[userId] = participant.avatar!.trim();
  }
  return map;
}

/** Let Zoom CDN avatars load inside the embedded SDK (referrer blocks otherwise). */
export function patchSdkAvatarImages(root: HTMLElement | null): void {
  if (!root) return;
  const images = root.querySelectorAll<HTMLImageElement>(
    '[class*="avatar"] img, [class*="Avatar"] img, img[src*="zoom.us"], img[src*="zoomcdn"]',
  );
  for (const img of images) {
    if (img.dataset.zoomAvatarPatched === "1") continue;
    img.referrerPolicy = "no-referrer";
    img.crossOrigin = "anonymous";
    img.dataset.zoomAvatarPatched = "1";
  }
}

export function resolveParticipantAvatar(
  participant: { userId?: number; avatar?: string; isHost?: boolean },
  name: string,
  options?: {
    hostAvatarUrl?: string | null;
    avatarByUserId?: Record<number, string>;
  },
): string {
  if (participant.isHost) {
    const branded = resolveBrandingImageUrl(options?.hostAvatarUrl);
    if (branded) return branded;
    const zoomHost = resolveMeetingAvatarUrl(options?.hostAvatarUrl);
    if (zoomHost) return zoomHost;
  }

  const userId = participant.userId;
  if (typeof userId === "number" && isHttpAvatarUrl(options?.avatarByUserId?.[userId])) {
    return options!.avatarByUserId![userId].trim();
  }

  if (isHttpAvatarUrl(participant.avatar)) {
    return participant.avatar!.trim();
  }

  return getAvatarImage(name);
}
