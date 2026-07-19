/** Ultimate fallback — local file, always available */
export const DEFAULT_IMAGE = "/placeholder.svg";

/** Reliable online defaults (picsum seeds — stable, no broken links) */
export const DEFAULT_IMAGES = {
  course: "https://picsum.photos/seed/xander-course/800/500",
  exam: "https://picsum.photos/seed/xander-exam/800/500",
  language: "https://picsum.photos/seed/xander-language/800/500",
  hero: "https://picsum.photos/seed/xander-hero/1400/900",
  heroAlt: "https://picsum.photos/seed/xander-students/800/600",
  live: "https://picsum.photos/seed/xander-live/1200/800",
  mission: "https://picsum.photos/seed/xander-global/1200/800",
  instructor: "https://picsum.photos/seed/xander-teach/1200/800",
  avatar: "https://picsum.photos/seed/xander-user/200/200",
} as const;

export function resolveImage(
  src?: string | null,
  fallback: string = DEFAULT_IMAGES.course
): string {
  const value = src?.trim();
  if (!value) return fallback;
  return value;
}

export function getExamImage(title: string): string {
  const key = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `https://picsum.photos/seed/xander-${key}/600/400`;
}

export function getLanguageImage(title: string): string {
  const key = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `https://picsum.photos/seed/xander-lang-${key}/600/400`;
}

export function getAvatarImage(name: string): string {
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `https://picsum.photos/seed/xander-avatar-${key}/200/200`;
}
