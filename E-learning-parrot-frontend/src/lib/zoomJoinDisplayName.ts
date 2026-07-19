import type { ZoomMeetingBranding } from "@/api/axios";
import { getAppDisplayName } from "@/lib/brandSanitize";
import { getStoredInstitution, isStoredMainAdmin } from "@/lib/institutionContext";
import { isMainPlatformZoomHost } from "@/lib/mainPlatformZoomHost";

type SdkAuthLike = Pick<
  ZoomMeetingBranding,
  "use_institution_logo" | "host" | "institution" | "company" | "is_main_platform_host"
> & {
  sdk?: { user_name?: string };
};

function resolveInstitutionJoinName(auth: SdkAuthLike): string | null {
  return (
    auth.institution?.name?.trim() ||
    getStoredInstitution()?.name?.trim() ||
    auth.company?.name?.trim() ||
    null
  );
}

/** Resolve the Zoom SDK join display name from auth + role context. */
export function resolveZoomSdkJoinUserName(
  auth: SdkAuthLike,
  opts: { isHost: boolean; fallbackName?: string },
): string {
  const sdkName = auth.sdk?.user_name?.trim();
  const fallback = opts.fallbackName?.trim() || sdkName || "Host";

  // Host-only branding: never rename participants to the institution / main admin.
  if (!opts.isHost) {
    return sdkName || fallback;
  }

  // Hosts always show the logged-in org name — never personal Zoom / user names.
  if (isMainPlatformZoomHost(auth) || isStoredMainAdmin()) {
    return (
      auth.host?.name?.trim() ||
      auth.company?.name?.trim() ||
      getAppDisplayName() ||
      "F&R Rwanda"
    );
  }

  if (auth.use_institution_logo || auth.institution?.id || getStoredInstitution()?.id) {
    return resolveInstitutionJoinName(auth) || fallback;
  }

  return (
    auth.host?.name?.trim() ||
    auth.company?.name?.trim() ||
    getAppDisplayName() ||
    sdkName ||
    fallback
  );
}

export function resolveInstitutionZoomDisplayName(
  auth: SdkAuthLike | null | undefined,
): string | null {
  if (!auth || isMainPlatformZoomHost(auth) || isStoredMainAdmin()) return null;
  if (!auth.use_institution_logo && !auth.institution?.id) return null;
  return resolveInstitutionJoinName(auth);
}
