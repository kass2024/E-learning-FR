import type { ZoomMeetingBranding } from "@/api/axios";
import type { HostBranding } from "@/components/live/HostWaitingStage";
import type { ParticipantBranding } from "@/components/live/ParticipantWaitingStage";
import {
  getStoredInstitution,
  isStoredMainAdmin,
  resolveInstitutionLogoUrl,
  showsPlatformHubBranding,
} from "@/lib/institutionContext";
import { isMainPlatformZoomHost } from "@/lib/mainPlatformZoomHost";
import { LOGO, logoUrl } from "@/lib/brandLogo";
import {
  resolveBrandingImageUrl,
  resolveMeetingAvatarUrl,
  resolveZoomBrandingLogoUrl,
  isZoomCdnAvatarUrl,
  isPlaceholderAvatarUrl,
} from "@/lib/zoomAvatars";
import { HUB } from "@/lib/hubConfig";
import { getAppDisplayName, sanitizeLegacyBrandText } from "@/lib/brandSanitize";
import type { ZoomClientBranding } from "@/lib/zoomClientBranding";
import { resolveInstitutionZoomDisplayName } from "@/lib/zoomJoinDisplayName";

type BuildBrandingOptions = {
  isHost: boolean;
  fallbackName: string;
  sessionTitle?: string | null;
  courseTitle?: string | null;
};

function enrichAuth(auth: ZoomMeetingBranding | null | undefined): ZoomMeetingBranding | null | undefined {
  if (!auth) return auth;

  if (isMainPlatformZoomHost(auth) || auth.use_hub_branding || auth.is_main_platform_host) {
    const hubName = getAppDisplayName();
    const zoomAvatar = resolveMainZoomProfile(auth);
    return {
      ...auth,
      use_institution_logo: false,
      is_main_platform_host: true,
      use_hub_branding: true,
      institution: undefined,
      host: {
        name: hubName,
        email: auth.host?.email ?? null,
        avatar_url: zoomAvatar,
      },
      company: {
        name: hubName,
      },
    };
  }

  if (auth.use_institution_logo === false) return auth;

  let next = auth;

  // Never hydrate partner branding from localStorage for hub sessions or main operators.
  // Guests joining hub webinars often still have a leftover parrot_institution (e.g. Prime Gateway).
  if (
    auth.use_institution_logo &&
    !auth.institution &&
    !isStoredMainAdmin() &&
    !showsPlatformHubBranding()
  ) {
    const stored = getStoredInstitution();
    if (stored) {
      next = { ...next, institution: stored };
    }
  }

  if (next.institution?.id && next.use_institution_logo !== false) {
    const institutionName = next.institution.name?.trim();
    if (institutionName) {
      next = {
        ...next,
        use_institution_logo: true,
        company: { name: institutionName },
      };
    }
  }

  return next;
}

function usesInstitutionBranding(auth: ZoomMeetingBranding | null | undefined): boolean {
  if (isMainPlatformZoomHost(auth)) return false;
  if (auth?.use_institution_logo === true) return true;
  if (auth?.institution?.id && auth.use_institution_logo !== false) {
    const role = (typeof window !== "undefined" ? localStorage.getItem("parrot_user_role") : "") ?? "";
    const roleLower = role.toLowerCase();
    if (roleLower === "instructor" || roleLower === "partner_company" || roleLower === "learner") {
      return true;
    }
  }
  return false;
}

function resolveInstitutionDisplayName(
  auth: ZoomMeetingBranding | null | undefined,
): string | null {
  return auth?.institution?.name?.trim() || auth?.company?.name?.trim() || null;
}

/** Institution logo for partner meetings — never the Zoom host profile. */
function resolveInstitutionMeetingLogo(
  auth: ZoomMeetingBranding | null | undefined,
): string | null {
  if (auth?.institution) {
    const fromInstitution = resolveZoomBrandingLogoUrl(resolveInstitutionLogoUrl(auth.institution));
    if (fromInstitution) return fromInstitution;
  }

  const stored = getStoredInstitution();
  if (stored && !isStoredMainAdmin() && !showsPlatformHubBranding()) {
    const fromStored = resolveZoomBrandingLogoUrl(resolveInstitutionLogoUrl(stored));
    if (fromStored) return fromStored;
  }

  return resolveZoomBrandingLogoUrl(auth?.host?.avatar_url);
}

/** Main platform admin only — real Zoom CDN profile picture from ZOOM_HOST_USER_ID (.env). */
function resolveMainZoomProfile(
  auth: ZoomMeetingBranding | null | undefined,
): string | null {
  const raw = auth?.host?.avatar_url;
  if (isZoomCdnAvatarUrl(raw)) return raw!.trim();
  if (raw && !isPlaceholderAvatarUrl(raw) && isMainPlatformZoomHost(auth)) {
    return null;
  }
  if (raw && !isPlaceholderAvatarUrl(raw)) {
    return resolveBrandingImageUrl(raw) ?? resolveMeetingAvatarUrl(raw);
  }
  return null;
}

function resolvePlatformCompanyName(
  auth: ZoomMeetingBranding | null | undefined,
  institutionMode: boolean,
): string {
  const raw = institutionMode
    ? (resolveInstitutionDisplayName(auth) || HUB.name)
    : (auth?.company?.name || getAppDisplayName() || HUB.name);
  return sanitizeLegacyBrandText(raw) || HUB.name;
}

function resolveHostAvatar(
  auth: ZoomMeetingBranding | null | undefined,
): string | null {
  if (usesInstitutionBranding(auth)) {
    return resolveInstitutionMeetingLogo(auth);
  }

  return resolveMainZoomProfile(auth) || logoUrl(LOGO.src);
}

function resolveParticipantSelfAvatar(
  auth: ZoomMeetingBranding | null | undefined,
): string | null {
  return resolveMeetingAvatarUrl(auth?.participant?.avatar_url);
}

/** Main platform: hub logo (logo.png) or Zoom CDN profile. Partners: institution logo. */
function resolveClientLogoUrl(
  auth: ZoomMeetingBranding | null | undefined,
  institutionMode: boolean,
  hostAvatar: string | null,
): string | null {
  if (institutionMode) {
    return resolveZoomBrandingLogoUrl(hostAvatar);
  }

  const profile = resolveZoomBrandingLogoUrl(resolveMainZoomProfile(auth));
  if (profile) return profile;
  // F&R Rwanda mark for main-account video-off tiles.
  return logoUrl(LOGO.src);
}

export function buildZoomClientBranding(
  auth: ZoomMeetingBranding | null | undefined,
): ZoomClientBranding {
  const enriched = enrichAuth(auth);
  const institutionMode = usesInstitutionBranding(enriched);
  const hostAvatar = resolveHostAvatar(enriched);
  const companyName = institutionMode
    ? resolvePlatformCompanyName(enriched, true)
    : sanitizeLegacyBrandText(enriched?.company?.name) || getAppDisplayName();

  return {
    companyName,
    logoUrl: resolveClientLogoUrl(enriched, institutionMode, hostAvatar),
    institutionMode,
  };
}

/** Map API host/participant branding into ZoomMeetingExperience props. */
export function buildZoomMeetingBranding(
  auth: ZoomMeetingBranding | null | undefined,
  options: BuildBrandingOptions,
): {
  avatarUrl: string | null;
  hostBranding?: HostBranding;
  participantBranding?: ParticipantBranding;
  clientBranding: ZoomClientBranding;
} {
  const enriched = enrichAuth(auth);
  const institutionMode = usesInstitutionBranding(enriched);
  const hostAvatar = resolveHostAvatar(enriched);
  const participantSelfAvatar = resolveParticipantSelfAvatar(enriched);
  const institutionName = resolveInstitutionDisplayName(enriched);
  const hubName = getAppDisplayName();
  const hostName = institutionMode
    ? (resolveInstitutionZoomDisplayName(enriched) || institutionName || options.fallbackName)
    : hubName;
  const participantName = enriched?.participant?.name?.trim() || options.fallbackName;
  const companyName = resolvePlatformCompanyName(enriched, institutionMode);
  const cohortTitle = options.sessionTitle?.trim() || enriched?.session_title?.trim() || undefined;

  const clientBranding: ZoomClientBranding = {
    companyName: institutionMode ? companyName : hubName,
    logoUrl: resolveClientLogoUrl(enriched, institutionMode, hostAvatar),
    institutionMode,
  };

  if (options.isHost) {
    const hostBranding: HostBranding = {
      name: hostName,
      avatarUrl: hostAvatar || clientBranding.logoUrl,
      companyName: clientBranding.companyName,
      cohortTitle,
      institutionMode,
    };

    return {
      avatarUrl: hostBranding.avatarUrl ?? null,
      hostBranding,
      clientBranding,
    };
  }

  const participantBranding: ParticipantBranding = {
    name: participantName,
    avatarUrl: participantSelfAvatar,
    hostAvatarUrl: hostAvatar,
    companyName: options.courseTitle?.trim() || companyName,
    cohortTitle,
    institutionMode,
  };

  return {
    avatarUrl: participantSelfAvatar,
    participantBranding,
    clientBranding,
  };
}
