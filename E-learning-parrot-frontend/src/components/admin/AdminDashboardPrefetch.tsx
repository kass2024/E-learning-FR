import { useEffect } from "react";
import type { HubRole } from "@/lib/hubConfig";
import { prefetchAdminRoutes } from "@/lib/dashboardPrefetchRoutes";
import { warmupAdminDashboardData } from "@/lib/dashboardPrefetchData";

/** Warm API cache + lazy chunks immediately so admin/partner sidebar pages open without spinners. */
export function AdminDashboardPrefetch({ role }: { role: HubRole }) {
  useEffect(() => {
    if (role !== "admin" && role !== "staff" && role !== "partner_company") return;

    prefetchAdminRoutes();
    warmupAdminDashboardData();
  }, [role]);

  return null;
}

export default AdminDashboardPrefetch;
