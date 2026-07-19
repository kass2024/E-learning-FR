/** Official-style Zoom mark for platform (non-institution) meetings when no host profile is loaded. */
export const PLATFORM_ZOOM_LOGO_URL = "/zoom-logo.svg";

export function platformZoomLogoFallback(logoUrl?: string | null): string {
  const trimmed = logoUrl?.trim();
  return trimmed || PLATFORM_ZOOM_LOGO_URL;
}
