import { useEffect, useRef, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, Settings, UserRound } from "lucide-react";
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
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem("parrot_user_avatar") || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sync = () => setAvatarUrl(localStorage.getItem("parrot_user_avatar") || "");
    window.addEventListener("storage", sync);
    window.addEventListener("parrot-avatar-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("parrot-avatar-updated", sync);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setMenuOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMenuOpen(false), 180);
  };

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
  const showPlatformSettings =
    role === "admin" || role === "staff" || role === "partner_company" || role === "meeting_user";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur-md border-b border-border shadow-soft">
      <div className="h-full px-2 sm:px-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="lg:hidden flex items-center justify-center"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <NavLink
          to={useHubBrand ? "/" : "/dashboard/admin"}
          className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl md:text-2xl font-bold text-foreground min-w-0 no-underline hover:no-underline"
        >
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

        <div className="flex items-center gap-2 sm:gap-3">
          {role === "learner" && <LearnerNotificationBell />}

          <div
            ref={menuRef}
            className="relative"
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 sm:pr-2 hover:bg-muted/60 transition-colors"
              aria-label="Open profile menu"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <div className="hidden md:flex flex-col items-end leading-tight mr-1">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground">{roleLabel}</span>
              </div>
              <div className="md:hidden text-right mr-1">
                <span className="text-xs font-medium block">{displayName}</span>
                <span className="text-xs text-muted-foreground">{roleLabel}</span>
              </div>
              <span className="h-9 w-9 sm:h-10 sm:w-10 rounded-full overflow-hidden border-2 border-primary/20 bg-primary/10 flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs sm:text-sm font-bold text-primary">{initials}</span>
                )}
              </span>
            </button>

            {/* pt-2 keeps a hover bridge so the cursor can reach menu items */}
            <div
              role="menu"
              className={cn(
                "absolute right-0 top-full z-[60] w-56 pt-2 transition-opacity duration-100",
                menuOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none",
              )}
            >
              <div className="rounded-xl border border-border bg-background py-1 shadow-lg">
                <div className="px-4 py-2 border-b border-border">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail || roleLabel}</p>
                </div>
                <NavLink
                  to="/dashboard/profile"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 no-underline"
                >
                  <UserRound className="h-4 w-4" />
                  <span>My profile</span>
                </NavLink>
                {showPlatformSettings && (
                  <NavLink
                    to="/dashboard/settings"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 no-underline"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Platform settings</span>
                  </NavLink>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout?.();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;
