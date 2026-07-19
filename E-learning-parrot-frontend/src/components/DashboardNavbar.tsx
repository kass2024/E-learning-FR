import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, Menu, X, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import LearnerNotificationBell from "@/components/LearnerNotificationBell";

import { HUB, type HubRole } from "@/lib/hubConfig";
import { InstitutionBrandLogo, dashboardBrandTitle } from "@/components/InstitutionBrandLogo";
import { showsPlatformHubBranding, useInstitutionBrandingRevision } from "@/lib/institutionContext";

type DashboardRole = HubRole;

interface DashboardNavbarProps {
  role: DashboardRole;
  userName?: string | null;
  userEmail?: string | null;
  onLogout?: () => void;
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
}

const DashboardNavbar = ({ role, userName, userEmail, onLogout, onMenuToggle, sidebarOpen }: DashboardNavbarProps) => {
  useInstitutionBrandingRevision();
  const roleLabelMap: Record<DashboardRole, string> = {
    learner: "Learner",
    instructor: "Instructor",
    admin: "Admin",
    staff: "Staff",
    meeting_user: "Meeting Coordinator",
    partner_company: "Institution Admin",
  };

  const roleLabel = roleLabelMap[role] ?? role;
  const displayName = userName || "User";
  const brandTitle = dashboardBrandTitle();
  const useHubBrand = showsPlatformHubBranding();
  const displayEmail = userEmail || "";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur-md border-b border-border shadow-soft">
      <div className="h-full px-2 sm:px-4 flex items-center justify-between">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="lg:hidden flex items-center justify-center"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Logo */}
        <NavLink to={useHubBrand ? "/" : "/dashboard/admin"} className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl md:text-2xl font-bold text-foreground min-w-0 no-underline hover:no-underline">
          {useHubBrand ? (
            <img
              src="/logo.png"
              alt={`${HUB.name} logo`}
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 object-contain drop-shadow-md rounded-full bg-white shrink-0"
            />
          ) : (
            <InstitutionBrandLogo size="sm" showRing={false} className="!h-9 !w-9 sm:!h-10 sm:!w-10" />
          )}
          <span className="hidden xs:inline sm:inline truncate max-w-[12rem] sm:max-w-none">{brandTitle}</span>
        </NavLink>

        {/* Right Side - User Profile */}
        <div className="flex items-center gap-2 sm:gap-4">
          {role === "learner" && <LearnerNotificationBell />}
          {/* User Info */}
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          </div>
          
          {/* Mobile User Info */}
          <div className="md:hidden text-right">
            <span className="text-xs font-medium block">{displayName}</span>
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          </div>
          
          {/* Profile Icon */}
          <div className="relative group">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-background border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <NavLink
                to="/dashboard/settings"
                className={cn(
                  "w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                  "flex items-center gap-2"
                )}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </NavLink>
              <button
                onClick={() => onLogout && onLogout()}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                  "flex items-center gap-2"
                )}
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;
