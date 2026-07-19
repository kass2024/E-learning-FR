import { fetchDashboardCached } from "@/lib/dashboardCache";

import {

  dashboardCacheKey,

  getInstructorEmail,

  getStudentId,

  resolveInstructorEmail,

  resolveLearnerStudentId,

} from "@/lib/dashboardUser";

import type { HubRole } from "@/lib/hubConfig";

import {

  prefetchAdminRoutes,

  prefetchInstructorRoutes,

  prefetchLearnerRoutes,

} from "@/lib/dashboardPrefetchRoutes";

import {

  getAdminAnalytics,

  getAdminPayments,

  getCourses,

  getInstructorAssignedCourses,

  getInstructorDashboard,

  getInstructorLiveClasses,

  getInstructorPayoutPaymentOptions,

  getInstructorPayoutRequests,

  getInstructorQuizzes,

  getInstructorStudents,

  getInstructorsWithCourses,

  getLearnerDashboard,

  getLearningPrograms,

  getStudyShifts,

  getStudents,

  getUsers,

  getLiveZoomCohorts,

  getAvailableSchedules,

  getMeetingRegistrations,

  getZoomMeetings,

  getPlatformMeetingSettings,

  getWebinarStatus,

} from "@/api/axios";



const prefetchedData = new Set<string>();



export function resetDashboardPrefetchFlags(): void {

  prefetchedData.clear();

}



function prefetchOnce(key: string, task: () => Promise<unknown>): void {

  if (prefetchedData.has(key)) return;

  prefetchedData.add(key);

  void task().catch(() => {

    prefetchedData.delete(key);

  });

}



/** Warm admin home first; defer the rest so login → dashboard is not saturated. */
export function warmupAdminDashboardData(): void {
  const email = getInstructorEmail()?.trim() ?? "";

  // Critical: home dashboard analytics only
  prefetchOnce("warmup-admin-critical", async () => {
    await fetchDashboardCached("admin-analytics", getAdminAnalytics);
  });

  // Secondary: common sidebar pages — after first paint
  prefetchOnce("warmup-admin-secondary", async () => {
    await new Promise((r) => setTimeout(r, 1500));
    await Promise.all([
      fetchDashboardCached("courses-list", getCourses),
      fetchDashboardCached("instructors-with-courses", getInstructorsWithCourses),
      fetchDashboardCached("students-list", getStudents),
      fetchDashboardCached("live-zoom-cohorts", getLiveZoomCohorts),
      fetchDashboardCached("available-schedules", getAvailableSchedules),
      fetchDashboardCached("platform-meeting-settings", getPlatformMeetingSettings),
    ]);
  });

  // Tertiary: less-visited admin lists
  prefetchOnce("warmup-admin-tertiary", async () => {
    await new Promise((r) => setTimeout(r, 4000));
    await Promise.all([
      fetchDashboardCached("users-list", getUsers),
      fetchDashboardCached("admin-payments", getAdminPayments),
      fetchDashboardCached("learning-programs-list", () =>
        getLearningPrograms({ withCourses: true }),
      ),
      fetchDashboardCached("learning-programs-picker", () =>
        getLearningPrograms({ activeOnly: false }),
      ),
      fetchDashboardCached("meeting-registrations-bundle", async () => {
        const [regs, schedules, status] = await Promise.all([
          getMeetingRegistrations(),
          getAvailableSchedules(),
          getWebinarStatus(),
        ]);
        return { regs, schedules, status };
      }),
      fetchDashboardCached("zoom-meetings-list", () =>
        getZoomMeetings({ include_recordings: false }),
      ),
      email
        ? fetchDashboardCached(dashboardCacheKey("live-classes-all", email), () =>
            getInstructorLiveClasses(email),
          )
        : Promise.resolve(),
      email
        ? fetchDashboardCached(dashboardCacheKey("study-shifts-list", email), () =>
            getStudyShifts({
              active_only: false,
              group_by_day: true,
              manage: true,
              email,
            }),
          )
        : Promise.resolve(),
    ]);
  });
}



/** Warm all instructor sidebar API caches (call on login, view-as, dashboard mount). */

export function warmupInstructorDashboardData(email?: string | null): void {

  const resolved = (email ?? resolveInstructorEmail()).trim();

  if (!resolved) return;



  prefetchOnce(`warmup-instructor-all:${resolved}`, async () => {

    await Promise.all([

      fetchDashboardCached(dashboardCacheKey("instructor-dashboard", resolved), () =>

        getInstructorDashboard(resolved),

      ),

      fetchDashboardCached(dashboardCacheKey("instructor-courses", resolved), () =>

        getInstructorAssignedCourses(resolved),

      ),

      fetchDashboardCached(dashboardCacheKey("instructor-students", resolved), () =>

        getInstructorStudents(resolved),

      ),

      fetchDashboardCached(dashboardCacheKey("instructor-quizzes", resolved), () =>

        getInstructorQuizzes(resolved),

      ),

      fetchDashboardCached(dashboardCacheKey("live-classes-all", resolved), () =>

        getInstructorLiveClasses(resolved),

      ),

      fetchDashboardCached(dashboardCacheKey("study-shifts-list", resolved), () =>

        getStudyShifts({

          active_only: false,

          group_by_day: true,

          manage: true,

          email: resolved,

        }),

      ),

      fetchDashboardCached(dashboardCacheKey("instructor-payout-requests", resolved), () =>

        getInstructorPayoutRequests(resolved),

      ),

      fetchDashboardCached("instructor-payout-options", getInstructorPayoutPaymentOptions),

      fetchDashboardCached("learning-programs-list", () =>

        getLearningPrograms({ withCourses: true }),

      ),

    ]);

  });

}



/** Warm learner sidebar API caches. */

export function warmupLearnerDashboardData(studentId?: number | null): void {

  const id = studentId ?? resolveLearnerStudentId() ?? getStudentId();

  if (!id) return;



  prefetchOnce(`warmup-learner-all:${id}`, async () => {

    await Promise.all([

      fetchDashboardCached(dashboardCacheKey("learner-dashboard", id), () =>

        getLearnerDashboard(id),

      ),

      fetchDashboardCached("courses-list", getCourses),

    ]);

  });

}



/** Prefetch lazy chunks + API for every sidebar item in the active role. */

export function warmupSidebarNavigation(role: HubRole): void {

  if (role === "instructor") {

    prefetchInstructorRoutes();

    warmupInstructorDashboardData(resolveInstructorEmail());

    return;

  }

  if (role === "learner") {

    prefetchLearnerRoutes();

    warmupLearnerDashboardData();

    return;

  }

  if (role === "admin" || role === "staff" || role === "partner_company") {

    prefetchAdminRoutes();

    warmupAdminDashboardData();

  }

}



/** Prefetch API data for a sidebar route (on hover / before navigation). */

export function prefetchDashboardData(path: string): void {

  const email = resolveInstructorEmail();

  const studentId = resolveLearnerStudentId() || getStudentId();



  const tasks: Record<string, () => void> = {

    "/dashboard/admin": () => warmupAdminDashboardData(),

    "/dashboard/instructor": () => {

      if (!email) return;

      prefetchOnce(`${path}:${email}`, () =>

        fetchDashboardCached(dashboardCacheKey("instructor-dashboard", email), () =>

          getInstructorDashboard(email),

        ),

      );

    },

    "/dashboard/my-courses": () => {

      if (email) {

        prefetchOnce(`${path}-inst:${email}`, () =>

          fetchDashboardCached(dashboardCacheKey("instructor-courses", email), () =>

            getInstructorAssignedCourses(email),

          ),

        );

      }

      if (studentId) {

        prefetchOnce(`${path}-learner:${studentId}`, () =>

          fetchDashboardCached(dashboardCacheKey("learner-dashboard", studentId), () =>

            getLearnerDashboard(studentId),

          ),

        );

      }

    },

    "/dashboard/instructor/quizzes": () => {

      if (!email) return;

      prefetchOnce(`${path}:${email}`, () =>

        Promise.all([

          fetchDashboardCached(dashboardCacheKey("instructor-quizzes", email), () =>

            getInstructorQuizzes(email),

          ),

          fetchDashboardCached(dashboardCacheKey("instructor-courses", email), () =>

            getInstructorAssignedCourses(email),

          ),

        ]),

      );

    },

    "/dashboard/instructor/students": () => {

      if (!email) return;

      prefetchOnce(`${path}:${email}`, () =>

        fetchDashboardCached(dashboardCacheKey("instructor-students", email), () =>

          getInstructorStudents(email),

        ),

      );

    },

    "/dashboard/instructor/performance": () => {

      if (!email) return;

      prefetchOnce(`${path}:${email}`, () =>

        fetchDashboardCached(dashboardCacheKey("instructor-dashboard", email), () =>

          getInstructorDashboard(email),

        ),

      );

    },

    "/dashboard/instructor/earnings": () => {

      if (!email) return;

      prefetchOnce(`${path}:${email}`, () =>

        Promise.all([

          fetchDashboardCached(dashboardCacheKey("instructor-dashboard", email), () =>

            getInstructorDashboard(email),

          ),

          fetchDashboardCached(dashboardCacheKey("instructor-payout-requests", email), () =>

            getInstructorPayoutRequests(email),

          ),

          fetchDashboardCached("instructor-payout-options", getInstructorPayoutPaymentOptions),

        ]),

      );

    },

    "/dashboard/programs": () => {

      prefetchOnce(path, () =>

        fetchDashboardCached("learning-programs-list", () =>

          getLearningPrograms({ withCourses: true }),

        ),

      );

    },

    "/dashboard/classes": () => {

      if (!email) return;

      prefetchOnce(`${path}:${email}`, () =>

        fetchDashboardCached(dashboardCacheKey("live-classes-all", email), () =>

          getInstructorLiveClasses(email),

        ),

      );

    },

    "/dashboard/materials": () => {

      if (!email) return;

      prefetchOnce(`${path}:${email}`, () =>

        fetchDashboardCached(dashboardCacheKey("live-classes-all", email), () =>

          getInstructorLiveClasses(email),

        ),

      );

    },

    "/dashboard/study-shifts": () => {

      if (!email) return;

      prefetchOnce(`${path}:${email}`, () =>

        fetchDashboardCached(dashboardCacheKey("study-shifts-list", email), () =>

          getStudyShifts({

            active_only: false,

            group_by_day: true,

            manage: true,

            email,

          }),

        ),

      );

    },

    "/dashboard/learner": () => {

      if (!studentId) return;

      prefetchOnce(`${path}:${studentId}`, () =>

        fetchDashboardCached(dashboardCacheKey("learner-dashboard", studentId), () =>

          getLearnerDashboard(studentId),

        ),

      );

    },

    "/dashboard/learner/materials": () => {

      if (!studentId) return;

      prefetchOnce(`${path}:${studentId}`, () =>

        fetchDashboardCached(dashboardCacheKey("learner-dashboard", studentId), () =>

          getLearnerDashboard(studentId),

        ),

      );

    },

    "/dashboard/learner/live-classes": () => {

      if (!studentId) return;

      prefetchOnce(`${path}:${studentId}`, () =>

        fetchDashboardCached(dashboardCacheKey("learner-dashboard", studentId), () =>

          getLearnerDashboard(studentId),

        ),

      );

    },

    "/dashboard/progress": () => {

      if (!studentId) return;

      prefetchOnce(`${path}:${studentId}`, () =>

        fetchDashboardCached(dashboardCacheKey("learner-dashboard", studentId), () =>

          getLearnerDashboard(studentId),

        ),

      );

    },

    "/dashboard/certificates": () => {

      if (!studentId) return;

      prefetchOnce(`${path}:${studentId}`, () =>

        fetchDashboardCached(dashboardCacheKey("learner-dashboard", studentId), () =>

          getLearnerDashboard(studentId),

        ),

      );

    },

    "/dashboard/courses": () => {

      prefetchOnce(path, () => fetchDashboardCached("courses-list", getCourses));

    },

    "/dashboard/instructors": () => {

      prefetchOnce(path, () =>

        fetchDashboardCached("instructors-with-courses", getInstructorsWithCourses),

      );

    },

    "/dashboard/users": () => {

      prefetchOnce(path, () => fetchDashboardCached("users-list", getUsers));

    },

    "/dashboard/students": () => {

      prefetchOnce(path, () => fetchDashboardCached("students-list", getStudents));

    },

    "/dashboard/analytics": () => {

      prefetchOnce(path, () => fetchDashboardCached("admin-analytics", getAdminAnalytics));

    },

    "/dashboard/payments": () => {

      prefetchOnce(path, () => fetchDashboardCached("admin-payments", getAdminPayments));

    },

    "/dashboard/revenue": () => {

      prefetchOnce(path, () => fetchDashboardCached("admin-analytics", getAdminAnalytics));

    },

    "/dashboard/instructor-payouts": () => {

      prefetchOnce(path, () => fetchDashboardCached("admin-payments", getAdminPayments));

    },

    "/dashboard/live-zoom-cohort": () => {

      prefetchOnce(path, () => fetchDashboardCached("live-zoom-cohorts", getLiveZoomCohorts));

    },

    "/dashboard/available-schedules": () => {
      prefetchOnce(path, () =>
        fetchDashboardCached("meeting-registrations-bundle", async () => {
          const [regs, schedules, status] = await Promise.all([
            getMeetingRegistrations(),
            getAvailableSchedules(),
            getWebinarStatus(),
          ]);
          return { regs, schedules, status };
        }),
      );
    },

    "/dashboard/meeting-registrations": () => {
      prefetchOnce(path, () =>
        fetchDashboardCached("meeting-registrations-bundle", async () => {
          const [regs, schedules, status] = await Promise.all([
            getMeetingRegistrations(),
            getAvailableSchedules(),
            getWebinarStatus(),
          ]);
          return { regs, schedules, status };
        }),
      );
    },

    "/dashboard/appointments": () => {
      prefetchOnce(path, () =>
        fetchDashboardCached("meeting-registrations-bundle", async () => {
          const [regs, schedules, status] = await Promise.all([
            getMeetingRegistrations(),
            getAvailableSchedules(),
            getWebinarStatus(),
          ]);
          return { regs, schedules, status };
        }),
      );
    },

    "/dashboard/zoom": () => {

      prefetchOnce(path, () =>

        Promise.all([

          fetchDashboardCached("zoom-meetings-list", () =>

            getZoomMeetings({ include_recordings: false }),

          ),

          fetchDashboardCached("platform-meeting-settings", getPlatformMeetingSettings),

        ]),

      );

    },

    "/dashboard/zoom-meetings": () => {

      tasks["/dashboard/zoom"]();

    },

    "/dashboard/zoom-webinars": () => {

      tasks["/dashboard/zoom"]();

    },

  };



  const exact = tasks[path];

  if (exact) {

    exact();

    return;

  }



  const prefix = Object.keys(tasks).find((key) => path.startsWith(`${key}/`));

  if (prefix) tasks[prefix]();

}


