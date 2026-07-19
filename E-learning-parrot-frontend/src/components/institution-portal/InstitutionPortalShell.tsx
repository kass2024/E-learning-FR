import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import type { PlatformInstitutionInfo } from "@/api/axios";
import { resolveInstitutionLogoUrl } from "@/lib/institutionContext";
import { portalThemeStyle, resolvePortalTheme } from "@/lib/institutionPortal";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Globe,
  LogIn,
  Mail,
  MapPin,
  Menu,
  Phone,
  UserPlus,
  X,
} from "lucide-react";

export type PortalNavSection = "home" | "programs" | "about" | "contact" | "join" | "login";

const SECTION_IDS: PortalNavSection[] = ["home", "programs", "about", "contact"];

type Props = {
  institution: PlatformInstitutionInfo;
  activeSection?: PortalNavSection;
  children: React.ReactNode;
  className?: string;
  compactHero?: boolean;
};

function portalHomePath(slug: string): string {
  return `/i/${encodeURIComponent(slug)}`;
}

function scrollToSection(sectionId: string, behavior: ScrollBehavior = "smooth") {
  if (sectionId === "home") {
    window.scrollTo({ top: 0, behavior });
    return;
  }
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior, block: "start" });
  }
}

const InstitutionPortalShell = ({
  institution,
  activeSection = "home",
  children,
  className,
  compactHero = false,
}: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hashSection, setHashSection] = useState<PortalNavSection | null>(null);

  const slug = institution.slug?.trim().toLowerCase() || "";
  const logo = resolveInstitutionLogoUrl(institution);
  const theme = resolvePortalTheme(institution);
  const portal = institution.portal;
  const homePath = slug ? portalHomePath(slug) : "/";
  const joinUrl = slug ? `/join/${slug}` : "/signup";
  const loginUrl = slug ? `/login/${slug}` : "/login";
  const onPortalHome = location.pathname.replace(/\/$/, "") === homePath;

  const navItems = useMemo(
    () =>
      [
        { id: "home" as const, label: "Home", hash: "" },
        { id: "programs" as const, label: "Programs", hash: "programs" },
        { id: "about" as const, label: "About", hash: "about" },
        { id: "contact" as const, label: "Contact", hash: "contact" },
      ] as const,
    [],
  );

  const goToSection = useCallback(
    (section: PortalNavSection, hash: string) => {
      setMobileOpen(false);
      setHashSection(section);

      if (!onPortalHome) {
        navigate(hash ? `${homePath}#${hash}` : homePath);
        return;
      }

      if (hash) {
        window.history.replaceState(null, "", `${homePath}#${hash}`);
        scrollToSection(hash, "smooth");
      } else {
        window.history.replaceState(null, "", homePath);
        scrollToSection("home", "smooth");
      }
    },
    [homePath, navigate, onPortalHome],
  );

  // Scroll when arriving on /i/:slug#section (from login/join or refresh).
  useEffect(() => {
    if (!onPortalHome) return;
    const raw = (location.hash || "").replace(/^#/, "").trim().toLowerCase();
    if (!raw || !SECTION_IDS.includes(raw as PortalNavSection)) {
      if (!location.hash) setHashSection("home");
      return;
    }
    setHashSection(raw as PortalNavSection);
    const t = window.setTimeout(() => scrollToSection(raw, "smooth"), 80);
    return () => window.clearTimeout(t);
  }, [onPortalHome, location.hash, location.pathname]);

  // Highlight menu from scroll position on the portal home page.
  useEffect(() => {
    if (!onPortalHome || compactHero) return;

    const observers: IntersectionObserver[] = [];
    const ratios = new Map<string, number>();

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
          let best: PortalNavSection = "home";
          let bestRatio = 0;
          ratios.forEach((ratio, key) => {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              best = key as PortalNavSection;
            }
          });
          if (bestRatio > 0.15) setHashSection(best);
        },
        { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.2, 0.4, 0.6] },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [onPortalHome, compactHero, institution.id]);

  const currentSection: PortalNavSection =
    hashSection ??
    (activeSection === "join" || activeSection === "login" ? activeSection : activeSection);

  const linkClass = (section: PortalNavSection) =>
    cn(
      "text-sm font-medium transition-colors",
      currentSection === section ? "text-white" : "text-white/80 hover:text-white",
    );

  return (
    <div
      className={cn("min-h-screen flex flex-col bg-slate-50", className)}
      style={portalThemeStyle(theme)}
    >
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--institution-hero-bg)] text-white shadow-lg">
        <div className="container mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:py-4">
          <button
            type="button"
            className="flex min-w-0 items-center gap-3 text-left"
            onClick={() => goToSection("home", "")}
          >
            {logo ? (
              <img
                src={logo}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg border border-white/20 bg-white object-cover sm:h-11 sm:w-11"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-sm font-bold sm:h-11 sm:w-11">
                {institution.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold sm:text-base">{institution.name}</p>
              {portal?.tagline && (
                <p className="hidden truncate text-[11px] text-white/75 sm:block max-w-[220px]">{portal.tagline}</p>
              )}
            </div>
          </button>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Institution website">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={linkClass(item.id)}
                onClick={() => goToSection(item.id, item.hash)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="rounded-full bg-white/10 text-white hover:bg-white/20 border-0"
            >
              <NavLink to={loginUrl}>
                <LogIn className="mr-1.5 h-4 w-4" />
                Log in
              </NavLink>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-white text-[var(--institution-primary)] hover:bg-white/90">
              <NavLink to={joinUrl}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                Register
              </NavLink>
            </Button>
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-white lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 bg-[var(--institution-hero-bg)] px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-3" aria-label="Institution website mobile">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(linkClass(item.id), "text-left")}
                  onClick={() => goToSection(item.id, item.hash)}
                >
                  {item.label}
                </button>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
                <Button asChild variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/20 border-0">
                  <NavLink to={loginUrl} onClick={() => setMobileOpen(false)}>
                    Log in
                  </NavLink>
                </Button>
                <Button
                  asChild
                  className="w-full bg-[var(--institution-button-bg)] text-[var(--institution-button-text)] hover:opacity-90"
                >
                  <NavLink to={joinUrl} onClick={() => setMobileOpen(false)}>
                    Register
                  </NavLink>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {!compactHero && onPortalHome && portal && (
        <section id="home" className="relative scroll-mt-24 overflow-hidden bg-[var(--institution-hero-bg)] text-white">
          {portal.hero_image_url && (
            <>
              <img src={portal.hero_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--institution-hero-bg)] via-[var(--institution-hero-bg)]/90 to-[var(--institution-hero-bg)]/75" />
            </>
          )}
          <div className="container relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{portal.tagline}</p>
            <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">{portal.hero_title}</h1>
            <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">{portal.hero_subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-[var(--institution-button-bg)] text-[var(--institution-button-text)] hover:opacity-90 shadow-md"
              >
                <NavLink to={joinUrl}>{portal.cta_label}</NavLink>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                <NavLink to={loginUrl}>Sign in to your account</NavLink>
              </Button>
            </div>
          </div>
        </section>
      )}

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="container mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
            <div>
              <h3 className="text-lg font-bold text-[var(--institution-primary)]">{institution.name}</h3>
              {portal?.tagline && <p className="mt-2 text-sm text-slate-600">{portal.tagline}</p>}
              <p className="mt-3 text-sm text-slate-500">
                Programs, enrollment, and support for learners at {institution.name} only.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Explore</p>
              <ul className="mt-3 space-y-2 text-sm">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="text-slate-700 hover:text-[var(--institution-primary)]"
                      onClick={() => goToSection(item.id, item.hash)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</p>
              {institution.contact_email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-[var(--institution-primary)]" />
                  <a href={`mailto:${institution.contact_email}`} className="hover:underline">
                    {institution.contact_email}
                  </a>
                </p>
              )}
              {institution.contact_phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-[var(--institution-primary)]" />
                  <a href={`tel:${institution.contact_phone}`} className="hover:underline">
                    {institution.contact_phone}
                  </a>
                </p>
              )}
              {institution.address && (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--institution-primary)]" />
                  {institution.address}
                </p>
              )}
              {institution.website && (
                <p className="flex items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-[var(--institution-primary)]" />
                  <a
                    href={institution.website.startsWith("http") ? institution.website : `https://${institution.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {institution.website.replace(/^https?:\/\//, "")}
                  </a>
                </p>
              )}
              {!institution.contact_email && !institution.contact_phone && !institution.address && (
                <p className="text-slate-500">Contact details will appear when published by {institution.name}.</p>
              )}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-500">
            <span>
              © {new Date().getFullYear()} {institution.name}. All rights reserved.
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              Institution portal
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InstitutionPortalShell;
