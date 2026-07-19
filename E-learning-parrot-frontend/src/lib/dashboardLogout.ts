import { clearAdminImpersonation } from "@/lib/adminImpersonation";
import {
  clearInstitutionContext,
  clearInstitutionLoginPath,
  getInstitutionLoginRedirect,
  getStoredInstitution,
} from "@/lib/institutionContext";

export {
  clearInstitutionLoginPath,
  getInstitutionLoginRedirect,
  rememberInstitutionLoginPath,
} from "@/lib/institutionContext";

export function performDashboardLogout(
  navigate?: (path: string, opts?: { replace?: boolean }) => void,
): void {
  const redirect = getInstitutionLoginRedirect();

  clearAdminImpersonation();
  clearInstitutionLoginPath();
  clearInstitutionContext();

  localStorage.removeItem("token");
  localStorage.removeItem("parrot_user_role");
  localStorage.removeItem("parrot_user_name");
  localStorage.removeItem("parrot_user_email");
  localStorage.removeItem("parrot_student_id");
  localStorage.removeItem("parrot_login_success");
  localStorage.removeItem("parrot_user_avatar");

  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("parrot_branding_refreshed:") || key.startsWith("xander_dash_")) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    // ignore
  }

  if (navigate) {
    navigate(redirect, { replace: true });
  } else {
    window.location.href = redirect;
  }
}

export function partnerInstitutionPortalPath(): string | null {
  const slug = getStoredInstitution()?.slug?.trim().toLowerCase();
  return slug ? `/i/${encodeURIComponent(slug)}` : null;
}
