import { useEffect, useState } from "react";
import { getPublicStorageUrl } from "@/lib/apiConfig";
import type { PlatformInstitutionInfo } from "@/api/axios";
import { invalidateDashboardCache, notifyDashboardCacheRefresh } from "./dashboardCache";

export type { PlatformInstitutionInfo };

const INSTITUTION_KEY = "parrot_institution";
const IS_MAIN_ADMIN_KEY = "parrot_is_main_admin";
const IMPERSONATION_KEY = "parrot_admin_impersonation";
const INSTITUTION_LOGIN_PATH_KEY = "parrot_institution_login_path";

export const INSTITUTION_CONTEXT_EVENT = "parrot-institution-context-updated";

function notifyInstitutionContextUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INSTITUTION_CONTEXT_EVENT));
  }
}

function normalizeInstitution(
  institution: PlatformInstitutionInfo,
): PlatformInstitutionInfo {
  const logoUrl = resolveInstitutionLogoUrl(institution);
  return {
    ...institution,
    logo_url: logoUrl,
  };
}

export function resolveInstitutionLogoUrl(institution: PlatformInstitutionInfo): string | null {
  if (institution.logo_path?.trim()) {
    const path = institution.logo_path.trim();
    return (
      getPublicStorageUrl(path) ??
      getPublicStorageUrl(`/storage/${path.replace(/^\/+/, "")}`)
    );
  }
  if (institution.logo_url?.trim()) {
    return getPublicStorageUrl(institution.logo_url) ?? institution.logo_url;
  }
  return null;
}

export function saveInstitutionContext(
  institution: PlatformInstitutionInfo | null | undefined,
  isMainAdmin = false,
) {
  const role = (localStorage.getItem("parrot_user_role") ?? "").toLowerCase();
  const mainAdmin =
    role === "partner_company" ? false : isMainAdmin;

  const prevId = getStoredInstitution()?.id ?? null;
  const prevMain = localStorage.getItem(IS_MAIN_ADMIN_KEY) === "1";
  const nextId = mainAdmin ? null : (institution?.id ?? null);
  const tenantChanged = prevId !== nextId || prevMain !== mainAdmin;

  if (mainAdmin) {
    localStorage.removeItem(INSTITUTION_KEY);
  } else if (institution?.id) {
    localStorage.setItem(
      INSTITUTION_KEY,
      JSON.stringify(normalizeInstitution(institution)),
    );
  } else {
    localStorage.removeItem(INSTITUTION_KEY);
  }

  localStorage.setItem(IS_MAIN_ADMIN_KEY, mainAdmin ? "1" : "0");

  // Only wipe dashboard caches when the tenant/role scope changes.
  // Branding refreshes used to clear every sidebar cache on each Dashboard mount.
  if (tenantChanged) {
    invalidateDashboardCache();
    notifyDashboardCacheRefresh();
  }

  notifyInstitutionContextUpdated();
}

export function getStoredInstitution(): PlatformInstitutionInfo | null {
  try {
    const raw = localStorage.getItem(INSTITUTION_KEY);
    if (!raw) return null;
    const inst = JSON.parse(raw) as PlatformInstitutionInfo;
    const logoUrl = resolveInstitutionLogoUrl(inst);
    return logoUrl ? { ...inst, logo_url: logoUrl } : inst;
  } catch {
    return null;
  }
}

function isViewingAsPartnerInstitution(): boolean {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { viewAsRole?: string };
    return parsed?.viewAsRole === "partner_company";
  } catch {
    return false;
  }
}

function readImpersonationState(): { viewAsRole?: string; adminRole?: string } | null {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { viewAsRole?: string; adminRole?: string };
  } catch {
    return null;
  }
}

/** Admin previewing instructor/learner UI — do not swap tenant branding. */
export function isAdminRoleViewAsPreview(): boolean {
  const state = readImpersonationState();
  if (!state?.viewAsRole) return false;
  return state.viewAsRole === "instructor" || state.viewAsRole === "learner";
}

export function isMainAdminViewAsPreview(): boolean {
  const state = readImpersonationState();
  if (!state?.viewAsRole) return false;
  if (state.viewAsRole !== "instructor" && state.viewAsRole !== "learner") return false;
  const adminRole = (state.adminRole ?? "").toLowerCase();
  return adminRole === "admin" || adminRole === "staff";
}

export function isStoredMainAdmin(): boolean {
  if (isMainAdminViewAsPreview()) {
    return true;
  }

  // Explicit partner session — never treat as main admin.
  if (isViewingAsPartnerInstitution()) {
    return false;
  }

  const role = (localStorage.getItem("parrot_user_role") ?? "").toLowerCase();
  if (role === "partner_company") {
    return false;
  }

  // Platform operators keep hub branding even if a partner row is still cached
  // from institution management UI (stale parrot_institution).
  if (localStorage.getItem(IS_MAIN_ADMIN_KEY) === "1") return true;
  if (role === "admin" || role === "staff") return true;

  // Non-operators: a stored institution means tenant branding.
  if (getStoredInstitution()?.id) {
    return false;
  }

  return false;
}

export function isPartnerInstitutionUser(): boolean {
  const role = (localStorage.getItem("parrot_user_role") ?? "").toLowerCase();
  if (role === "partner_company") return true;
  return isViewingAsPartnerInstitution();
}

export function showsPlatformHubBranding(): boolean {
  if (isMainAdminViewAsPreview()) {
    return true;
  }

  if (isPartnerInstitutionUser()) {
    return false;
  }

  // Main platform admin/staff — hub branding wins over any leftover partner cache.
  if (isStoredMainAdmin()) {
    return true;
  }

  const inst = getStoredInstitution();
  if (inst?.id) {
    return false;
  }

  const role = (localStorage.getItem("parrot_user_role") ?? "").toLowerCase();
  if (role === "learner" || role === "instructor" || role === "meeting_user") {
    return true;
  }

  return false;
}

export function clearInstitutionContext() {
  localStorage.removeItem(INSTITUTION_KEY);
  localStorage.removeItem(IS_MAIN_ADMIN_KEY);
  invalidateDashboardCache();
  notifyInstitutionContextUpdated();
  notifyDashboardCacheRefresh();
}

/** Remember where partner users should return after logout (institution-branded login). */
export function rememberInstitutionLoginPath(slug: string): void {
  const clean = slug.trim().toLowerCase();
  if (!clean) return;
  sessionStorage.setItem(INSTITUTION_LOGIN_PATH_KEY, `/login/${encodeURIComponent(clean)}`);
}

export function getInstitutionLoginRedirect(): string {
  const remembered = sessionStorage.getItem(INSTITUTION_LOGIN_PATH_KEY);
  if (remembered) {
    return remembered;
  }

  const role = (localStorage.getItem("parrot_user_role") ?? "").toLowerCase();
  if (role === "partner_company" || isViewingAsPartnerInstitution()) {
    const slug = getStoredInstitution()?.slug?.trim().toLowerCase();
    if (slug) {
      return `/login/${encodeURIComponent(slug)}`;
    }
  }

  return "/login";
}

export function clearInstitutionLoginPath(): void {
  sessionStorage.removeItem(INSTITUTION_LOGIN_PATH_KEY);
}

export function institutionBrandingName(): string | null {
  const inst = getStoredInstitution();
  if (!inst || showsPlatformHubBranding()) return null;
  return inst.name || null;
}

export function institutionLogoUrl(): string | null {
  const inst = getStoredInstitution();
  if (!inst || showsPlatformHubBranding()) return null;
  return resolveInstitutionLogoUrl(inst);
}

export async function refreshInstitutionBrandingFromApi(email?: string | null): Promise<void> {
  if (isAdminRoleViewAsPreview()) {
    return;
  }

  const resolvedEmail = email?.trim() || localStorage.getItem("parrot_user_email")?.trim();
  if (!resolvedEmail) return;

  const role = (localStorage.getItem("parrot_user_role") ?? "").toLowerCase();
  const shouldRefresh =
    role === "partner_company" ||
    role === "learner" ||
    role === "instructor" ||
    role === "meeting_user" ||
    role === "staff" ||
    role === "admin";

  if (!shouldRefresh) return;

  // Once per browser tab session — avoids re-hitting context API on every sidebar click.
  const sessionKey = `parrot_branding_refreshed:${resolvedEmail}:${role}`;
  if (sessionStorage.getItem(sessionKey) === "1") {
    return;
  }

  try {
    const { getPlatformInstitutionContext } = await import("@/api/axios");
    const ctx = await getPlatformInstitutionContext(resolvedEmail);
    const isPlatformOperator = Boolean(ctx.is_main_admin);

    if (ctx.institution?.id) {
      saveInstitutionContext(ctx.institution, isPlatformOperator);
    } else if (isPlatformOperator) {
      saveInstitutionContext(null, true);
    } else if (role === "learner" || role === "instructor" || role === "meeting_user") {
      saveInstitutionContext(null, false);
    }
    sessionStorage.setItem(sessionKey, "1");
  } catch {
    // keep cached branding if refresh fails
  }
}

export function zoomAuthInstitutionParams(actorEmail?: string): {
  user_email?: string;
  platform_institution_id?: number;
} {
  const email = actorEmail?.trim() || localStorage.getItem("parrot_user_email")?.trim();
  if (isStoredMainAdmin()) {
    return email ? { user_email: email } : {};
  }

  const inst = getStoredInstitution();
  return {
    ...(email ? { user_email: email } : {}),
    ...(inst?.id ? { platform_institution_id: inst.id } : {}),
  };
}

/** Drop stale partner branding before opening Zoom when the session is main-platform admin. */
export function prepareMainAdminZoomSession(): void {
  // Resolve with role/flag first so a leftover parrot_institution cannot block cleanup.
  if (isViewingAsPartnerInstitution()) return;
  const role = (localStorage.getItem("parrot_user_role") ?? "").toLowerCase();
  if (role === "partner_company") return;

  const flaggedMain = localStorage.getItem(IS_MAIN_ADMIN_KEY) === "1";
  const isPlatformOperator = flaggedMain || role === "admin" || role === "staff";
  if (!isPlatformOperator) return;

  const hadInstitution = Boolean(localStorage.getItem(INSTITUTION_KEY));
  if (hadInstitution) {
    localStorage.removeItem(INSTITUTION_KEY);
  }
  localStorage.setItem(IS_MAIN_ADMIN_KEY, "1");
  if (hadInstitution || !flaggedMain) {
    notifyInstitutionContextUpdated();
  }
}

export function useInstitutionBrandingRevision(): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const onUpdate = () => setRevision((value) => value + 1);
    window.addEventListener(INSTITUTION_CONTEXT_EVENT, onUpdate);
    return () => window.removeEventListener(INSTITUTION_CONTEXT_EVENT, onUpdate);
  }, []);

  return revision;
}
