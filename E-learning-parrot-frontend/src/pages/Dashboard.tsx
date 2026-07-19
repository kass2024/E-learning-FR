import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import DashboardNavbar from "@/components/DashboardNavbar";
import DashboardSidebar from "@/components/DashboardSidebar";
import { cn } from "@/lib/utils";
import { unlockDashboardPageScroll } from "@/lib/dashboardPageScroll";
import { Loader2 } from "lucide-react";
import AdminDashboardPrefetch from "@/components/admin/AdminDashboardPrefetch";
import RoleDashboardPrefetch from "@/components/dashboard/RoleDashboardPrefetch";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import ComingSoonPanel from "./dashboard/ComingSoonPanel";
import InstructorCreateCourse from "./dashboard/InstructorCreateCourse";
import InstructorEditCourse from "./dashboard/InstructorEditCourse";
import type { HubRole } from "@/lib/hubConfig";
import { formatUserDisplayName } from "@/lib/brandSanitize";
import AdminViewAsBanner from "@/components/AdminViewAsBanner";
import {
  exitAdminViewAs,
  getAdminImpersonation,
  clearAdminImpersonation,
  type AdminImpersonationState,
} from "@/lib/adminImpersonation";
import { saveInstitutionContext, refreshInstitutionBrandingFromApi, isStoredMainAdmin, isPartnerInstitutionUser, getInstitutionLoginRedirect, isAdminRoleViewAsPreview } from "@/lib/institutionContext";
import { performDashboardLogout } from "@/lib/dashboardLogout";
import InstructorDashboard from "./dashboard/InstructorDashboard";
import LearnerDashboard from "./dashboard/LearnerDashboard";

const LearnerPayment = lazy(() => import("./dashboard/LearnerPayment"));
const LearnerMyCourses = lazy(() => import("./dashboard/LearnerMyCourses"));
const InstructorStudents = lazy(() => import("./dashboard/InstructorStudents"));
const InstructorEarnings = lazy(() => import("./dashboard/InstructorEarnings"));
const InstructorPerformance = lazy(() => import("./dashboard/InstructorPerformance"));
const InstructorQuizzes = lazy(() => import("./dashboard/InstructorQuizzes"));
import AdminRevenueManagement from "./dashboard/AdminRevenueManagement";
import AdminInstructorPayoutsPage from "./dashboard/AdminInstructorPayoutsPage";
import AdminDashboard from "./dashboard/AdminDashboard";
const AdminPaymentManagement = lazy(() => import("./dashboard/AdminPaymentManagement"));
const AdminMarketingManagement = lazy(() => import("./dashboard/AdminMarketingManagement"));
const InstructorApproval = lazy(() => import("./dashboard/InstructorApproval"));
const CourseApproval = lazy(() => import("./dashboard/CourseApproval"));
const ProgramManagement = lazy(() => import("./dashboard/ProgramManagement"));
const AdminInstitutionManagement = lazy(() => import("./dashboard/AdminInstitutionManagement"));

const UserManagement = lazy(() => import("./dashboard/UserManagement"));
const CourseManagement = lazy(() => import("./dashboard/CourseManagement"));
const InstructorManagement = lazy(() => import("./dashboard/InstructorManagement"));
const InstructorMyCourses = lazy(() => import("./dashboard/InstructorMyCourses"));
const InstructorMaterials = lazy(() => import("./dashboard/InstructorMaterials"));
const CourseMaterials = lazy(() => import("./dashboard/CourseMaterials"));
const ZoomManagement = lazy(() => import("./dashboard/ZoomManagement"));
const RecordedMeetings = lazy(() => import("./dashboard/RecordedMeetings"));
const StudentManagement = lazy(() => import("./dashboard/StudentManagement"));
import Appointments from "./dashboard/Appointments";
const StudyShiftsManagement = lazy(() => import("./dashboard/StudyShiftsManagement"));
import LiveZoomCohort from "./dashboard/LiveZoomCohort";
const LearnerProgress = lazy(() => import("./dashboard/LearnerProgress"));
const LearnerCertificates = lazy(() => import("./dashboard/LearnerCertificates"));
const LearnerCourseMaterials = lazy(() => import("./dashboard/LearnerCourseMaterials"));
const LearnerLiveClasses = lazy(() => import("./dashboard/LearnerLiveClasses"));
const LearnerRecordings = lazy(() => import("./dashboard/LearnerRecordings"));
const LearnerQuizTake = lazy(() => import("./dashboard/LearnerQuizTake"));
const Settings = lazy(() => import("./dashboard/Settings"));
const AdminAnalyticsPage = lazy(() => import("./dashboard/AdminAnalytics"));

interface DashboardProps {
  initialRole?: HubRole;
}

const DEFAULT_ROLE: HubRole = "learner";

const ADMIN_ONLY_PATHS = [
  "/dashboard/admin",
  "/dashboard/users",
  "/dashboard/institutions",
  "/dashboard/students",
  "/dashboard/revenue",
  "/dashboard/instructor-payouts",
  "/dashboard/payments",
  "/dashboard/marketing",
  "/dashboard/analytics",
  "/dashboard/instructor-approval",
  "/dashboard/course-approval",
  "/dashboard/courses",
  "/dashboard/instructors",
  "/dashboard/zoom",
  "/dashboard/zoom-meetings",
  "/dashboard/zoom-webinars",
  "/dashboard/zoom-recordings",
  "/dashboard/live-zoom-cohort",
];

function pathRequiresAdmin(pathname: string) {
  return ADMIN_ONLY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function normalizeStoredRole(role: string | null): HubRole | null {
  if (!role) return null;
  const value = role.toLowerCase().trim();
  if (value === "staff") return "admin";
  if (value === "admin" || value === "instructor" || value === "learner" || value === "meeting_user" || value === "partner_company") {
    return value as HubRole;
  }
  return null;
}

const DashboardPanelFallback = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-10 bg-muted rounded w-1/3" />
    <TableSkeleton rows={5} cols={4} />
  </div>
);

const Dashboard = ({ initialRole }: DashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<HubRole>(initialRole ?? DEFAULT_ROLE);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [impersonation, setImpersonation] = useState<AdminImpersonationState | null>(() =>
    getAdminImpersonation()
  );

  useEffect(() => {
    unlockDashboardPageScroll();
  }, [location.pathname]);

  useEffect(() => {
    const syncSessionFromStorage = () => {
      const storedRole = normalizeStoredRole(localStorage.getItem("parrot_user_role"));
      const storedName = localStorage.getItem("parrot_user_name");
      const storedEmail = localStorage.getItem("parrot_user_email");

      if (!storedRole && !initialRole) {
        navigate(getInstitutionLoginRedirect(), { replace: true });
        return;
      }

      if (storedRole) {
        setUserRole(storedRole);
      } else if (initialRole) {
        setUserRole(initialRole);
      }

      if (storedName) {
        const formatted = formatUserDisplayName(storedName, storedEmail);
        setUserName(formatted);
        if (formatted !== storedName) {
          localStorage.setItem("parrot_user_name", formatted);
        }
      }
      if (storedEmail) setUserEmail(storedEmail);
      setImpersonation(getAdminImpersonation());

      if (storedEmail && !isAdminRoleViewAsPreview()) {
        void refreshInstitutionBrandingFromApi(storedEmail);
      }
    };

    syncSessionFromStorage();
    window.addEventListener("parrot-session-refresh", syncSessionFromStorage);
    return () => window.removeEventListener("parrot-session-refresh", syncSessionFromStorage);
  }, [initialRole, navigate]);

  useEffect(() => {
    if (location.pathname === "/dashboard/browse") {
      navigate("/dashboard/my-courses", { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const loginFlag = localStorage.getItem("parrot_login_success");
    if (loginFlag) {
      localStorage.removeItem("parrot_login_success");
      toast({
        variant: "success" as any,
        title: "Login successful",
        description: "Welcome back to your dashboard.",
        duration: 4000,
      });
    }
  }, [toast]);

  const handleLogout = () => {
    performDashboardLogout(navigate);
  };

  const handleExitViewAs = () => {
    const restored = exitAdminViewAs();
    if (!restored) return;

    const adminRole = restored.adminRole.toLowerCase() === "staff" ? "admin" : restored.adminRole;
    setUserRole(adminRole as HubRole);
    setUserName(restored.adminName);
    setUserEmail(restored.adminEmail);
    setImpersonation(null);

    const isPartnerAdmin = restored.adminRole.toLowerCase() === "partner_company";
    toast({
      variant: "success" as any,
      title: isPartnerAdmin ? "Back to dashboard" : "Back to admin",
      description: isPartnerAdmin
        ? "You are viewing your partner dashboard again."
        : "You are viewing the admin dashboard again.",
      duration: 4000,
    });

    navigate(restored.returnPath || "/dashboard/admin", { replace: true });
  };

  const renderDashboard = () => {
    if (location.pathname === "/dashboard/settings") {
      return <Settings />;
    }

    const isPartnerTenant = userRole === "partner_company";
    const isPlatformAdmin = userRole === "admin" || userRole === "staff";
    const hasAdminPortalAccess = isPlatformAdmin || isPartnerTenant;

    if (pathRequiresAdmin(location.pathname) && !hasAdminPortalAccess) {
      return (
        <ComingSoonPanel
          title="Admin access required"
          description={`You are signed in as "${userRole}". Log out and sign in with an admin account to approve instructor payout requests.`}
          backTo={getInstitutionLoginRedirect()}
          backLabel="Go to login"
        />
      );
    }

    if (location.pathname === "/dashboard/progress") {
      if (userRole === "learner") {
        return <LearnerProgress />;
      }
      return (
        <ComingSoonPanel
          title="Learning progress"
          description="Track lessons, quizzes, and completion rates here in a future update."
        />
      );
    }

    if (location.pathname === "/dashboard/certificates") {
      if (userRole === "learner") {
        return <LearnerCertificates />;
      }
      return (
        <ComingSoonPanel
          title="Certificates"
          description="Download verified certificates after course completion."
        />
      );
    }

    if (location.pathname === "/dashboard/learner/materials") {
      if (userRole === "learner") {
        return <LearnerCourseMaterials />;
      }
    }

    if (location.pathname.startsWith("/dashboard/learner/quiz/")) {
      if (userRole === "learner") {
        return <LearnerQuizTake />;
      }
    }

    if (location.pathname === "/dashboard/learner/live-classes") {
      if (userRole === "learner") {
        return <LearnerLiveClasses />;
      }
    }

    if (location.pathname === "/dashboard/learner/recordings") {
      if (userRole === "learner") {
        return <LearnerRecordings />;
      }
    }

    if (userRole === "meeting_user") {
      if (
        location.pathname === "/dashboard/available-schedules" ||
        location.pathname === "/dashboard/meeting-registrations" ||
        location.pathname === "/dashboard/appointments"
      ) {
        return <Appointments />;
      }
      return <Appointments />;
    }

    if (hasAdminPortalAccess) {
      if (location.pathname === "/dashboard/institutions") {
        if (isStoredMainAdmin() && isPlatformAdmin) {
          return <AdminInstitutionManagement />;
        }
        return (
          <ComingSoonPanel
            title="Platform admin only"
            description="Partner institution management is only available to the main platform administrator."
            backTo="/dashboard/admin"
          />
        );
      }
      if (location.pathname === "/dashboard/users") {
        return <UserManagement />;
      }
      if (location.pathname === "/dashboard/students") {
        return <StudentManagement />;
      }
      if (
        location.pathname === "/dashboard/meeting-registrations" ||
        location.pathname === "/dashboard/available-schedules" ||
        location.pathname === "/dashboard/appointments"
      ) {
        return <Appointments />;
      }
      if (location.pathname === "/dashboard/study-shifts") {
        return <StudyShiftsManagement />;
      }
      if (location.pathname === "/dashboard/live-zoom-cohort") {
        return <LiveZoomCohort />;
      }
      if (location.pathname === "/dashboard/courses") {
        return <CourseManagement />;
      }
      if (location.pathname === "/dashboard/programs") {
        return <ProgramManagement />;
      }
      if (location.pathname === "/dashboard/instructors") {
        return <InstructorManagement />;
      }
      if (location.pathname === "/dashboard/classes") {
        return <InstructorMaterials />;
      }
      if (location.pathname === "/dashboard/materials") {
        return <CourseMaterials />;
      }
      if (location.pathname === "/dashboard/zoom" || location.pathname === "/dashboard/zoom-meetings") {
        return <ZoomManagement initialMeetingType="meeting" />;
      }
      if (location.pathname === "/dashboard/zoom-webinars") {
        return <ZoomManagement initialMeetingType="webinar" />;
      }
      if (location.pathname === "/dashboard/zoom-recordings") {
        return <RecordedMeetings />;
      }
      if (location.pathname === "/dashboard/analytics") {
        return <AdminAnalyticsPage />;
      }
      if (location.pathname === "/dashboard/revenue") {
        return <AdminRevenueManagement />;
      }
      if (location.pathname === "/dashboard/instructor-payouts") {
        return <AdminInstructorPayoutsPage />;
      }
      if (location.pathname === "/dashboard/payments") {
        return <AdminPaymentManagement />;
      }
      if (location.pathname === "/dashboard/marketing") {
        return <AdminMarketingManagement />;
      }
      if (location.pathname === "/dashboard/instructor-approval") {
        return <InstructorApproval />;
      }
      if (location.pathname === "/dashboard/course-approval") {
        return <CourseApproval />;
      }
      if (location.pathname === "/dashboard/admin") {
        return <AdminDashboard />;
      }
    }

    switch (userRole) {
      case "learner":
        if (location.pathname === "/dashboard/payment" || location.pathname === "/dashboard/learner/payment") {
          return <LearnerPayment />;
        }
        if (location.pathname === "/dashboard/my-courses") {
          return <LearnerMyCourses />;
        }
        return <LearnerDashboard />;
      case "instructor":
        if (location.pathname === "/dashboard/my-courses") {
          return <InstructorMyCourses />;
        }
        if (location.pathname === "/dashboard/classes") {
          return <InstructorMaterials />;
        }
        if (location.pathname === "/dashboard/materials") {
          return <CourseMaterials />;
        }
        if (location.pathname === "/dashboard/instructor/students") {
          return <InstructorStudents />;
        }
        if (location.pathname === "/dashboard/instructor/earnings") {
          return <InstructorEarnings />;
        }
        if (location.pathname === "/dashboard/instructor/performance") {
          return <InstructorPerformance />;
        }
        if (location.pathname === "/dashboard/instructor/quizzes") {
          return <InstructorQuizzes />;
        }
        if (location.pathname === "/dashboard/programs") {
          return <ProgramManagement />;
        }
        if (location.pathname === "/dashboard/instructor/create-course") {
          return <InstructorCreateCourse />;
        }
        if (location.pathname.startsWith("/dashboard/instructor/edit-course/")) {
          return <InstructorEditCourse />;
        }
        if (location.pathname === "/dashboard/study-shifts") {
          return <StudyShiftsManagement />;
        }
        return <InstructorDashboard />;
      case "admin":
        return <AdminDashboard />;
      case "partner_company":
        return <AdminDashboard />;
      default:
        return <LearnerDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminDashboardPrefetch role={userRole} />
      <RoleDashboardPrefetch role={userRole} />
      <DashboardNavbar
        role={userRole}
        userName={userName}
        userEmail={userEmail}
        onLogout={handleLogout}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />
      <DashboardSidebar userRole={userRole} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main
        className={cn(
          "pt-16 transition-all duration-300",
          "lg:pl-64",
          sidebarOpen ? "lg:ml-0 pointer-events-none lg:pointer-events-auto" : "pointer-events-auto"
        )}
      >
        <div className="container mx-auto p-4 sm:p-6">
          {impersonation && (
            <AdminViewAsBanner state={impersonation} onExit={handleExitViewAs} />
          )}
          <Suspense fallback={<DashboardPanelFallback />}>{renderDashboard()}</Suspense>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
