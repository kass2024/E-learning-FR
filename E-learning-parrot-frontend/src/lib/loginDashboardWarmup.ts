import { resolveInstructorEmail } from "@/lib/dashboardUser";
import { prefetchDashboardRoute } from "@/lib/dashboardPrefetchRoutes";
import {
  warmupAdminDashboardData,
  warmupInstructorDashboardData,
  warmupLearnerDashboardData,
} from "@/lib/dashboardPrefetchData";

/**
 * Start warming only what the first dashboard screen needs.
 * Heavy sidebar chunks + secondary APIs are deferred so login → dashboard is snappy.
 */
export function warmupDashboardAfterLogin(role: string): void {
  const normalized = role.toLowerCase().trim();
  const isAdminPortal =
    normalized === "admin" || normalized === "staff" || normalized === "partner_company";

  if (!isAdminPortal) {
    if (normalized === "instructor") {
      prefetchDashboardRoute("/dashboard/instructor");
      warmupInstructorDashboardData(resolveInstructorEmail());
      window.setTimeout(() => {
        prefetchDashboardRoute("/dashboard/my-courses");
        prefetchDashboardRoute("/dashboard/instructor/quizzes");
        prefetchDashboardRoute("/dashboard/study-shifts");
      }, 2500);
    } else if (normalized === "learner") {
      prefetchDashboardRoute("/dashboard/learner");
      warmupLearnerDashboardData();
      window.setTimeout(() => {
        prefetchDashboardRoute("/dashboard/learner/live-classes");
        prefetchDashboardRoute("/dashboard/progress");
      }, 2500);
    }
    return;
  }

  prefetchDashboardRoute("/dashboard/admin");
  warmupAdminDashboardData();

  // Defer non-critical route chunks so they don't compete with the home dashboard APIs.
  window.setTimeout(() => {
    [
      "/dashboard/live-zoom-cohort",
      "/dashboard/appointments",
      "/dashboard/zoom-meetings",
      "/dashboard/zoom-webinars",
      "/dashboard/courses",
      "/dashboard/students",
      "/dashboard/analytics",
      "/dashboard/settings",
    ].forEach(prefetchDashboardRoute);
  }, 3000);
}
