import type { ZoomMeetingBranding } from "@/api/axios";
import { isStoredMainAdmin } from "@/lib/institutionContext";

type ZoomHostAuth = Pick<ZoomMeetingBranding, "is_main_platform_host" | "use_institution_logo"> | null | undefined;

/** Main platform admin/staff — always Zoom profile from .env, never institution tenant branding. */
export function isMainPlatformZoomHost(auth?: ZoomHostAuth): boolean {
  if (auth?.is_main_platform_host === true) return true;
  if (auth?.use_institution_logo === false && isStoredMainAdmin()) return true;
  return isStoredMainAdmin();
}
