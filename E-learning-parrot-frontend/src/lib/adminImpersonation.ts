import type { PlatformInstitutionInfo } from "./institutionContext";
import { getStoredInstitution, saveInstitutionContext } from "./institutionContext";
import { invalidateDashboardCache, notifyDashboardCacheRefresh } from "./dashboardCache";
import { warmupSidebarNavigation } from "./dashboardPrefetchData";

const IMPERSONATION_KEY = "parrot_admin_impersonation";

export type ViewAsRole = "instructor" | "learner" | "partner_company";

export interface AdminImpersonationState {
  adminRole: string;
  adminName: string | null;
  adminEmail: string | null;
  adminStudentId: string | null;
  viewAsRole: ViewAsRole;
  viewAsName: string;
  viewAsEmail: string | null;
  viewAsStudentId: string | null;
  viewAsInstitution?: PlatformInstitutionInfo | null;
  savedInstitution?: PlatformInstitutionInfo | null;
  savedIsMainAdmin?: boolean;
  returnPath: string;
}

function readStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function isMainPlatformAdminRole(role: string | null | undefined): boolean {
  const value = (role ?? "").toLowerCase();
  return value === "admin" || value === "staff";
}

export function getAdminImpersonation(): AdminImpersonationState | null {
  const raw = readStored(IMPERSONATION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AdminImpersonationState;
    if (!parsed?.adminRole || !parsed?.viewAsRole || !parsed?.viewAsName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isAdminViewAsActive(): boolean {
  return getAdminImpersonation() !== null;
}

/** Main admin or partner admin previewing instructor/learner (not institution portal). */
export function isAdminRoleViewAsPreview(): boolean {
  const state = getAdminImpersonation();
  if (!state) return false;
  return state.viewAsRole === "instructor" || state.viewAsRole === "learner";
}

export function isMainAdminViewAsPreview(): boolean {
  const state = getAdminImpersonation();
  if (!state) return false;
  return isMainPlatformAdminRole(state.adminRole) && isAdminRoleViewAsPreview();
}

function readAdminActorCredentials(): Pick<
  AdminImpersonationState,
  "adminRole" | "adminName" | "adminEmail" | "adminStudentId"
> | null {
  const existing = getAdminImpersonation();
  if (existing) {
    return {
      adminRole: existing.adminRole,
      adminName: existing.adminName,
      adminEmail: existing.adminEmail,
      adminStudentId: existing.adminStudentId,
    };
  }

  const currentRole = readStored("parrot_user_role");
  if (!currentRole) return null;

  const role = currentRole.toLowerCase();
  if (role !== "admin" && role !== "staff" && role !== "partner_company") return null;

  return {
    adminRole: currentRole,
    adminName: readStored("parrot_user_name"),
    adminEmail: readStored("parrot_user_email"),
    adminStudentId: readStored("parrot_student_id"),
  };
}

export function startAdminInstitutionViewAs(options: {
  institution: PlatformInstitutionInfo;
  ownerName: string;
  ownerEmail: string;
  returnPath?: string;
}) {
  if (typeof window === "undefined") return;

  const admin = readAdminActorCredentials();
  if (!admin) return;

  const state: AdminImpersonationState = {
    ...admin,
    viewAsRole: "partner_company",
    viewAsName: options.institution.name,
    viewAsEmail: options.ownerEmail,
    viewAsStudentId: null,
    viewAsInstitution: options.institution,
    savedIsMainAdmin: readStored("parrot_is_main_admin") === "1",
    returnPath: options.returnPath ?? "/dashboard/institutions",
  };

  window.localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));
  window.localStorage.setItem("parrot_user_role", "partner_company");
  window.localStorage.setItem("parrot_user_name", options.ownerName);
  window.localStorage.setItem("parrot_user_email", options.ownerEmail);
  window.localStorage.removeItem("parrot_student_id");
  saveInstitutionContext(options.institution, false);
  invalidateDashboardCache();
  notifyDashboardCacheRefresh();
  window.dispatchEvent(new CustomEvent("parrot-session-refresh"));
}

export function startAdminViewAs(options: {
  viewAsRole: ViewAsRole;
  viewAsName: string;
  viewAsEmail?: string | null;
  viewAsStudentId?: number | string | null;
  returnPath?: string;
}): boolean {
  if (typeof window === "undefined") return false;

  const admin = readAdminActorCredentials();
  if (!admin) return false;

  const isPartnerAdmin = admin.adminRole.toLowerCase() === "partner_company";
  const isMainAdmin = isMainPlatformAdminRole(admin.adminRole);
  const defaultReturnPath = isPartnerAdmin ? "/dashboard/admin" : "/dashboard/admin";

  const state: AdminImpersonationState = {
    ...admin,
    viewAsRole: options.viewAsRole,
    viewAsName: options.viewAsName,
    viewAsEmail: options.viewAsEmail ?? null,
    viewAsStudentId:
      options.viewAsStudentId != null && options.viewAsStudentId !== ""
        ? String(options.viewAsStudentId)
        : null,
    returnPath: options.returnPath ?? defaultReturnPath,
    savedInstitution: getStoredInstitution(),
    savedIsMainAdmin: isMainAdmin || readStored("parrot_is_main_admin") === "1",
  };

  window.localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));
  window.localStorage.setItem("parrot_user_role", options.viewAsRole);

  if (options.viewAsName) {
    window.localStorage.setItem("parrot_user_name", options.viewAsName);
  }
  if (options.viewAsEmail) {
    window.localStorage.setItem("parrot_user_email", options.viewAsEmail);
  } else {
    window.localStorage.removeItem("parrot_user_email");
  }

  if (options.viewAsRole === "learner" && options.viewAsStudentId) {
    window.localStorage.setItem("parrot_student_id", String(options.viewAsStudentId));
  } else {
    window.localStorage.removeItem("parrot_student_id");
  }

  invalidateDashboardCache();
  notifyDashboardCacheRefresh();
  window.dispatchEvent(new CustomEvent("parrot-session-refresh"));

  if (options.viewAsRole === "instructor") {
    warmupSidebarNavigation("instructor");
  } else if (options.viewAsRole === "learner") {
    warmupSidebarNavigation("learner");
  }

  return true;
}

export function exitAdminViewAs(): AdminImpersonationState | null {
  if (typeof window === "undefined") return null;

  const state = getAdminImpersonation();
  if (!state) return null;

  window.localStorage.setItem("parrot_user_role", state.adminRole);
  if (state.adminName) {
    window.localStorage.setItem("parrot_user_name", state.adminName);
  } else {
    window.localStorage.removeItem("parrot_user_name");
  }
  if (state.adminEmail) {
    window.localStorage.setItem("parrot_user_email", state.adminEmail);
  } else {
    window.localStorage.removeItem("parrot_user_email");
  }
  if (state.adminStudentId) {
    window.localStorage.setItem("parrot_student_id", state.adminStudentId);
  } else {
    window.localStorage.removeItem("parrot_student_id");
  }

  if (state.viewAsRole === "partner_company") {
    saveInstitutionContext(null, state.savedIsMainAdmin ?? true);
  } else if (isMainPlatformAdminRole(state.adminRole)) {
    saveInstitutionContext(state.savedInstitution ?? null, state.savedIsMainAdmin ?? true);
  } else if (state.adminRole.toLowerCase() === "partner_company" && state.savedInstitution) {
    saveInstitutionContext(state.savedInstitution, false);
  }

  window.localStorage.removeItem(IMPERSONATION_KEY);
  invalidateDashboardCache();
  notifyDashboardCacheRefresh();
  window.dispatchEvent(new CustomEvent("parrot-session-refresh"));
  return state;
}

export function clearAdminImpersonation() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(IMPERSONATION_KEY);
  invalidateDashboardCache();
  notifyDashboardCacheRefresh();
}
