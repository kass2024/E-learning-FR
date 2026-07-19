import { useState, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  Video,
  FileText,
  Calendar,
  CalendarClock,
  ClipboardList,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  X,
  Settings,
  DollarSign,
  CreditCard,
  Megaphone,
  BarChart3,
  UserCheck,
  ShieldCheck,
  PlusCircle,
  Wallet,
  Award,
  Target,
  Clock,
  Building2,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { type HubRole } from "@/lib/hubConfig";
import { prefetchDashboardRoute, prefetchMyCourses } from "@/lib/dashboardPrefetchRoutes";
import { prefetchDashboardData, warmupSidebarNavigation } from "@/lib/dashboardPrefetchData";
import { formatUserDisplayName } from "@/lib/brandSanitize";
import { isStoredMainAdmin, isPartnerInstitutionUser, useInstitutionBrandingRevision } from "@/lib/institutionContext";
import { getAdminImpersonation } from "@/lib/adminImpersonation";
import { performDashboardLogout } from "@/lib/dashboardLogout";
import { InstitutionBrandLogo, dashboardBrandTitle, dashboardBrandSubtitle } from "@/components/InstitutionBrandLogo";

interface DashboardSidebarProps {
  userRole: HubRole;
  isOpen?: boolean;
  onClose?: () => void;
}

type NavLinkItem = { to: string; label: string; icon: typeof LayoutDashboard };
type NavGroupItem = { label: string; icon: typeof LayoutDashboard; children: NavLinkItem[] };
type NavItem = NavLinkItem | NavGroupItem;

const isNavGroup = (item: NavItem): item is NavGroupItem => "children" in item;

const ZOOM_MEETING_LINKS: NavLinkItem[] = [
  { to: "/dashboard/classes", label: "Live Classes", icon: Calendar },
  { to: "/dashboard/zoom-meetings", label: "Meeting", icon: Video },
  { to: "/dashboard/zoom-webinars", label: "Webinars", icon: Video },
  { to: "/dashboard/zoom-recordings", label: "Recordings", icon: Video },
  { to: "/dashboard/appointments", label: "Appointments", icon: CalendarClock },
  { to: "/dashboard/live-zoom-cohort", label: "Live Cohorts", icon: CalendarClock },
];

const ADMIN_SECTIONS: Array<{ title: string; links: NavItem[] }> = [
  {
    title: "Overview",
    links: [{ to: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Administration",
    links: [
      { to: "/dashboard/instructor-payouts", label: "Instructor Payouts", icon: Wallet },
      { to: "/dashboard/revenue", label: "Revenue Management", icon: DollarSign },
      { to: "/dashboard/payments", label: "Payment Management", icon: CreditCard },
      { to: "/dashboard/users", label: "User Management", icon: Users },
      { to: "/dashboard/institutions", label: "Partner Institutions", icon: Building2 },
      { to: "/dashboard/instructor-approval", label: "Instructor Approval", icon: UserCheck },
      { to: "/dashboard/course-approval", label: "Course Approval", icon: ShieldCheck },
      { to: "/dashboard/students", label: "Student Management", icon: GraduationCap },
      { to: "/dashboard/marketing", label: "Marketing Management", icon: Megaphone },
    ],
  },
  {
    title: "Analytics",
    links: [{ to: "/dashboard/analytics", label: "Reports & Analytics", icon: BarChart3 }],
  },
  {
    title: "Learning ops",
    links: [
      { to: "/dashboard/courses", label: "Courses", icon: BookOpen },
      { to: "/dashboard/programs", label: "Programs", icon: FolderOpen },
      { to: "/dashboard/study-shifts", label: "Study Shifts", icon: Clock },
      { to: "/dashboard/instructors", label: "Instructors", icon: Users },
      {
        label: "Zoom meetings",
        icon: Video,
        children: ZOOM_MEETING_LINKS,
      },
      { to: "/dashboard/materials", label: "Materials", icon: FileText },
    ],
  },
  {
    title: "Account",
    links: [{ to: "/dashboard/settings", label: "Settings", icon: Settings }],
  },
];

const INSTRUCTOR_SECTIONS: Array<{ title: string; links: NavLinkItem[] }> = [
  {
    title: "Overview",
    links: [{ to: "/dashboard/instructor", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Teaching",
    links: [
      { to: "/dashboard/programs", label: "Programs", icon: FolderOpen },
      { to: "/dashboard/instructor/create-course", label: "Create Course", icon: PlusCircle },
      { to: "/dashboard/my-courses", label: "My Courses", icon: BookOpen },
      { to: "/dashboard/materials", label: "Materials", icon: FileText },
      { to: "/dashboard/instructor/quizzes", label: "Assessment", icon: ClipboardList },
      { to: "/dashboard/classes", label: "Live Classes", icon: Calendar },
      { to: "/dashboard/study-shifts", label: "Study Shifts", icon: CalendarClock },
    ],
  },
  {
    title: "Students & analytics",
    links: [
      { to: "/dashboard/instructor/students", label: "Students", icon: GraduationCap },
      { to: "/dashboard/instructor/performance", label: "Performance", icon: BarChart3 },
    ],
  },
  {
    title: "Earnings",
    links: [{ to: "/dashboard/instructor/earnings", label: "Earnings & Payouts", icon: Wallet }],
  },
  {
    title: "Account",
    links: [{ to: "/dashboard/settings", label: "Settings", icon: Settings }],
  },
];

const LEARNER_SECTIONS: Array<{ title: string; links: NavLinkItem[] }> = [
  {
    title: "Overview",
    links: [{ to: "/dashboard/learner", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Learning",
    links: [
      { to: "/dashboard/my-courses", label: "My Courses", icon: BookOpen },
      { to: "/dashboard/learner/materials", label: "Materials", icon: FileText },
      { to: "/dashboard/learner/live-classes", label: "Live Classes", icon: Video },
      { to: "/dashboard/progress", label: "Progress", icon: Target },
      { to: "/dashboard/certificates", label: "Certificates", icon: Award },
    ],
  },
  {
    title: "Account",
    links: [{ to: "/dashboard/settings", label: "Settings", icon: Settings }],
  },
];

const DashboardSidebar = ({ userRole, isOpen, onClose }: DashboardSidebarProps) => {
  useInstitutionBrandingRevision();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const zoomChildActive = ZOOM_MEETING_LINKS.some(
    (link) =>
      location.pathname === link.to ||
      (link.to === "/dashboard/appointments" &&
        (location.pathname === "/dashboard/meeting-registrations" ||
          location.pathname === "/dashboard/available-schedules")),
  );
  const [zoomOpen, setZoomOpen] = useState(zoomChildActive);

  useEffect(() => {
    if (zoomChildActive) setZoomOpen(true);
  }, [zoomChildActive]);

  const learnerLinks: NavLinkItem[] = LEARNER_SECTIONS.flatMap((s) => s.links);

  const meetingUserLinks: NavLinkItem[] = [
    { to: "/dashboard/appointments", label: "Appointments", icon: CalendarClock },
    { to: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const linkPrefetchProps = (to: string) => ({
    onMouseEnter: () => {
      prefetchDashboardRoute(to);
      prefetchDashboardData(to);
      if (to === "/dashboard/my-courses") {
        prefetchMyCourses(userRole === "instructor" ? "instructor" : "learner");
      }
    },
    onFocus: () => {
      prefetchDashboardRoute(to);
      prefetchDashboardData(to);
    },
    onClick: () => {
      prefetchDashboardRoute(to);
      prefetchDashboardData(to);
    },
  });

  const isActive = (path: string) => {
    if (path === "/dashboard/appointments") {
      return (
        location.pathname === "/dashboard/appointments" ||
        location.pathname === "/dashboard/meeting-registrations" ||
        location.pathname === "/dashboard/available-schedules"
      );
    }
    return location.pathname === path;
  };

  const sidebarLinkClass = (path: string) =>
    cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline hover:no-underline",
      "text-muted-foreground hover:bg-muted hover:text-foreground transition-all",
      isActive(path) && "bg-primary/10 text-primary font-medium",
    );

  const handleLogout = () => {
    performDashboardLogout();
  };

  const closeMobile = () => {
    if (window.innerWidth < 1024) onClose?.();
  };

  const renderNavLink = (link: NavLinkItem, options?: { end?: boolean; nested?: boolean }) => (
    <NavLink
      key={link.to}
      to={link.to}
      end={options?.end}
      onClick={closeMobile}
      {...linkPrefetchProps(link.to)}
      className={cn(sidebarLinkClass(link.to), options?.nested && "pl-9")}
    >
      <link.icon className="shrink-0 w-5 h-5" />
      {!collapsed && <span className="text-sm">{link.label}</span>}
    </NavLink>
  );

  const renderNavItem = (item: NavItem, endPath?: string) => {
    if (isNavGroup(item)) {
      if (collapsed) {
        return item.children.map((child) => renderNavLink(child));
      }

      return (
        <Collapsible key={item.label} open={zoomOpen} onOpenChange={setZoomOpen} className="w-full">
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg",
              "text-muted-foreground hover:bg-muted hover:text-foreground transition-all",
              zoomChildActive && "bg-primary/10 text-primary font-medium",
            )}
          >
            <item.icon className="shrink-0 w-5 h-5" />
            <span className="text-sm flex-1 text-left">{item.label}</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", zoomOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-1 mt-1">
            {item.children.map((child) => renderNavLink(child, { nested: true }))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return renderNavLink(item, { end: endPath ? item.to === endPath : undefined });
  };

  const renderFlatLinks = (links: NavLinkItem[]) =>
    links.map((link) =>
      renderNavLink(link, {
        end: link.to === "/dashboard/admin" || link.to === "/dashboard/learner" || link.to === "/dashboard/instructor",
      }),
    );

  const hubTitle = dashboardBrandTitle();
  const hubSubtitle = dashboardBrandSubtitle();
  const impersonation = getAdminImpersonation();
  const menuRole: HubRole =
    impersonation?.viewAsRole === "instructor" || impersonation?.viewAsRole === "learner"
      ? impersonation.viewAsRole
      : userRole;
  const partnerView = isPartnerInstitutionUser() && menuRole !== "instructor" && menuRole !== "learner";

  useEffect(() => {
    if (partnerView || menuRole === "admin" || menuRole === "staff") {
      warmupSidebarNavigation("admin");
      return;
    }
    if (menuRole === "partner_company") {
      warmupSidebarNavigation("partner_company");
      return;
    }
    if (menuRole === "instructor" || menuRole === "learner") {
      warmupSidebarNavigation(menuRole);
    }
  }, [menuRole, partnerView]);

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card border-r border-border transition-all duration-300 z-40 flex flex-col justify-between",
        "lg:translate-x-0 pointer-events-auto",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 lg:hidden h-8 w-8 rounded-full z-50"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-4 h-6 w-6 rounded-full border border-border bg-background shadow-soft hidden lg:flex"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {!collapsed && (
        <div className="px-4 pt-6 pb-2 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <InstitutionBrandLogo size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary truncate">{hubTitle}</p>
              <p className="text-[10px] text-muted-foreground truncate">{hubSubtitle}</p>
            </div>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="flex justify-center pt-4 pb-2 border-b border-border">
          <InstitutionBrandLogo size="xs" showRing={false} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <nav className="dashboard-sidebar-nav flex flex-col gap-1 p-4">
          {partnerView || menuRole === "admin" || menuRole === "staff" || menuRole === "partner_company" ? (
            ADMIN_SECTIONS.map((section) => (
              <div key={section.title} className="mb-3">
                {!collapsed && (
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </p>
                )}
                {section.links
                  .filter((link) => {
                    if (isNavGroup(link)) return true;
                    return (
                      link.to !== "/dashboard/institutions" ||
                      (isStoredMainAdmin() && !partnerView && menuRole !== "partner_company")
                    );
                  })
                  .map((link) => renderNavItem(link, "/dashboard/admin"))}
              </div>
            ))
          ) : menuRole === "instructor" ? (
            INSTRUCTOR_SECTIONS.map((section) => (
              <div key={section.title} className="mb-3">
                {!collapsed && (
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </p>
                )}
                {section.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/dashboard/instructor"}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose?.();
                    }}
                    {...linkPrefetchProps(link.to)}
                    className={sidebarLinkClass(link.to)}
                  >
                    <link.icon className="shrink-0 w-5 h-5" />
                    {!collapsed && <span className="text-sm">{link.label}</span>}
                  </NavLink>
                ))}
              </div>
            ))
          ) : menuRole === "meeting_user" ? (
            renderFlatLinks(meetingUserLinks)
          ) : menuRole === "learner" ? (
            LEARNER_SECTIONS.map((section) => (
              <div key={section.title} className="mb-3">
                {!collapsed && (
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </p>
                )}
                {section.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/dashboard/learner"}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose?.();
                    }}
                    {...linkPrefetchProps(link.to)}
                    className={sidebarLinkClass(link.to)}
                  >
                    <link.icon className="shrink-0 w-5 h-5" />
                    {!collapsed && <span className="text-sm">{link.label}</span>}
                  </NavLink>
                ))}
              </div>
            ))
          ) : (
            renderFlatLinks(learnerLinks)
          )}
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {formatUserDisplayName(
                    localStorage.getItem("parrot_user_name"),
                    localStorage.getItem("parrot_user_email")
                  )}
                </p>
                <p className="text-xs text-muted-foreground capitalize truncate">
                  {menuRole === "partner_company" || partnerView
                    ? "Institution Admin"
                    : menuRole === "meeting_user"
                      ? "Meeting Coordinator"
                      : userRole.replace("_", " ")}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 pt-0">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10",
              collapsed && "justify-center p-0 h-10 w-10"
            )}
          >
            <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
            {!collapsed && "Log Out"}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
