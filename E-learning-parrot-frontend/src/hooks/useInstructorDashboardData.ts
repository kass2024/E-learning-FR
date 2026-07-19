import { getInstructorDashboard, type InstructorDashboardData } from "@/api/axios";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { dashboardCacheKey, resolveInstructorEmail } from "@/lib/dashboardUser";

/** Shared instructor dashboard payload — cached across Dashboard, Performance, etc. */
export function useInstructorDashboardData() {
  const email = resolveInstructorEmail();
  return useDashboardQuery<InstructorDashboardData>(
    dashboardCacheKey("instructor-dashboard", email),
    () => getInstructorDashboard(email),
    { enabled: email.length > 0 },
  );
}
