import { getLearnerDashboard, type LearnerDashboardData } from "@/api/axios";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { dashboardCacheKey, resolveLearnerStudentId } from "@/lib/dashboardUser";

/** Shared learner dashboard payload — cached across Progress, Certificates, Live Classes, etc. */
export function useLearnerDashboardData() {
  const studentId = resolveLearnerStudentId();
  return useDashboardQuery<LearnerDashboardData>(
    dashboardCacheKey("learner-dashboard", studentId),
    () => getLearnerDashboard(studentId),
    { enabled: studentId > 0 },
  );
}
