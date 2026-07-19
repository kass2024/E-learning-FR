import type { HubRole } from "@/lib/hubConfig";

/** Prefetch lazy page chunks so sidebar navigation feels instant. */
const prefetched = new Set<string>();

function prefetch(key: string, loader: () => Promise<unknown>): void {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  void loader().catch(() => {
    prefetched.delete(key);
  });
}

export function prefetchDashboardRoute(path: string): void {
  const loaders: Record<string, () => Promise<unknown>> = {
    "/dashboard/admin": () => import("@/pages/dashboard/AdminDashboard"),
    "/dashboard/instructor": () => import("@/pages/dashboard/InstructorDashboard"),
    "/dashboard/instructor/create-course": () => import("@/pages/dashboard/InstructorCreateCourse"),
    "/dashboard/my-courses": () => import("@/pages/dashboard/InstructorMyCourses"),
    "/dashboard/materials": () => import("@/pages/dashboard/CourseMaterials"),
    "/dashboard/instructor/quizzes": () => import("@/pages/dashboard/InstructorQuizzes"),
    "/dashboard/classes": () => import("@/pages/dashboard/InstructorMaterials"),
    "/dashboard/instructor/students": () => import("@/pages/dashboard/InstructorStudents"),
    "/dashboard/instructor/performance": () => import("@/pages/dashboard/InstructorPerformance"),
    "/dashboard/instructor/earnings": () => import("@/pages/dashboard/InstructorEarnings"),
    "/dashboard/learner": () => import("@/pages/dashboard/LearnerDashboard"),
    "/dashboard/learner/materials": () => import("@/pages/dashboard/LearnerCourseMaterials"),
    "/dashboard/learner/live-classes": () => import("@/pages/dashboard/LearnerLiveClasses"),
    "/dashboard/progress": () => import("@/pages/dashboard/LearnerProgress"),
    "/dashboard/certificates": () => import("@/pages/dashboard/LearnerCertificates"),
    "/dashboard/settings": () => import("@/pages/dashboard/Settings"),
    "/dashboard/programs": () => import("@/pages/dashboard/ProgramManagement"),
    "/dashboard/courses": () => import("@/pages/dashboard/CourseManagement"),
    "/dashboard/study-shifts": () => import("@/pages/dashboard/StudyShiftsManagement"),
    "/dashboard/instructors": () => import("@/pages/dashboard/InstructorManagement"),
    "/dashboard/zoom": () => import("@/pages/dashboard/ZoomManagement"),
    "/dashboard/zoom-meetings": () => import("@/pages/dashboard/ZoomManagement"),
    "/dashboard/zoom-webinars": () => import("@/pages/dashboard/ZoomManagement"),
    "/dashboard/zoom-recordings": () => import("@/pages/dashboard/RecordedMeetings"),
    "/dashboard/users": () => import("@/pages/dashboard/UserManagement"),
    "/dashboard/students": () => import("@/pages/dashboard/StudentManagement"),
    "/dashboard/analytics": () => import("@/pages/dashboard/AdminAnalytics"),
    "/dashboard/payments": () => import("@/pages/dashboard/AdminPaymentManagement"),
    "/dashboard/revenue": () => import("@/pages/dashboard/AdminRevenueManagement"),
    "/dashboard/instructor-payouts": () => import("@/pages/dashboard/AdminInstructorPayoutsPage"),
    "/dashboard/marketing": () => import("@/pages/dashboard/AdminMarketingManagement"),
    "/dashboard/instructor-approval": () => import("@/pages/dashboard/InstructorApproval"),
    "/dashboard/course-approval": () => import("@/pages/dashboard/CourseApproval"),
    "/dashboard/meeting-registrations": () => import("@/pages/dashboard/Appointments"),
    "/dashboard/available-schedules": () => import("@/pages/dashboard/Appointments"),
    "/dashboard/appointments": () => import("@/pages/dashboard/Appointments"),
    "/dashboard/live-zoom-cohort": () => import("@/pages/dashboard/LiveZoomCohort"),
    "/dashboard/institutions": () => import("@/pages/dashboard/AdminInstitutionManagement"),
  };

  const loader = loaders[path];
  if (loader) prefetch(path, loader);
}

export function prefetchAdminRoutes(): void {
  [
    "/dashboard/admin",
    "/dashboard/instructor",
    "/dashboard/learner",
    "/dashboard/instructor-payouts",
    "/dashboard/revenue",
    "/dashboard/payments",
    "/dashboard/users",
    "/dashboard/institutions",
    "/dashboard/instructor-approval",
    "/dashboard/course-approval",
    "/dashboard/students",
    "/dashboard/marketing",
    "/dashboard/analytics",
    "/dashboard/courses",
    "/dashboard/programs",
    "/dashboard/study-shifts",
    "/dashboard/instructors",
    "/dashboard/classes",
    "/dashboard/zoom-meetings",
    "/dashboard/zoom-webinars",
    "/dashboard/zoom-recordings",
    "/dashboard/appointments",
    "/dashboard/live-zoom-cohort",
    "/dashboard/materials",
    "/dashboard/instructor/quizzes",
    "/dashboard/settings",
  ].forEach(prefetchDashboardRoute);
}

export function prefetchMyCourses(role: HubRole): void {
  if (role === "instructor") {
    prefetch("instructor-my-courses", () => import("@/pages/dashboard/InstructorMyCourses"));
    return;
  }
  prefetch("learner-my-courses", () => import("@/pages/dashboard/LearnerMyCourses"));
}

export function prefetchInstructorRoutes(): void {
  [
    "/dashboard/instructor",
    "/dashboard/instructor/create-course",
    "/dashboard/materials",
    "/dashboard/instructor/quizzes",
    "/dashboard/classes",
    "/dashboard/instructor/students",
    "/dashboard/instructor/performance",
    "/dashboard/instructor/earnings",
    "/dashboard/programs",
    "/dashboard/study-shifts",
    "/dashboard/settings",
  ].forEach(prefetchDashboardRoute);

  prefetchMyCourses("instructor");
}

export function prefetchLearnerRoutes(): void {
  [
    "/dashboard/learner",
    "/dashboard/my-courses",
    "/dashboard/learner/materials",
    "/dashboard/learner/live-classes",
    "/dashboard/progress",
    "/dashboard/certificates",
    "/dashboard/settings",
  ].forEach(prefetchDashboardRoute);

  prefetchMyCourses("learner");
}
