import { useEffect } from "react";
import type { HubRole } from "@/lib/hubConfig";
import { getAdminImpersonation } from "@/lib/adminImpersonation";
import { warmupSidebarNavigation } from "@/lib/dashboardPrefetchData";

/** Warm lazy chunks + API responses for instructor and learner sidebars. */
export function RoleDashboardPrefetch({ role }: { role: HubRole }) {
  useEffect(() => {
    const impersonation = getAdminImpersonation();
    const effectiveRole =
      impersonation?.viewAsRole === "instructor" || impersonation?.viewAsRole === "learner"
        ? impersonation.viewAsRole
        : role;

    if (effectiveRole === "instructor") {
      warmupSidebarNavigation("instructor");
      return;
    }

    if (effectiveRole === "learner") {
      warmupSidebarNavigation("learner");
    }
  }, [role]);

  return null;
}

export default RoleDashboardPrefetch;
