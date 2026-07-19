import { useEffect, useRef, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, X, Search } from "lucide-react";
import PromoBanner from "@/components/PromoBanner";
import { HUB } from "@/lib/hubConfig";

const Navbar = () => {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const navLinks = [
    { to: "/", labelEn: "Home", labelFr: "Accueil" },
    { to: "/courses", labelEn: "Programs", labelFr: "Programmes" },
    { to: "/about", labelEn: "About", labelFr: "À propos" },
  ];
  const meetingRegistrationLabel = "Book meeting with us";
  const navLinkClass =
    "text-sm font-medium transition-colors text-slate-600 hover:text-[#0070D0]";
  const mobileNavLinkClass =
    "text-slate-700 hover:text-[#0070D0] hover:bg-slate-50 transition-colors font-medium py-2.5 px-2 rounded-md";

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--public-header-height",
        `${header.offsetHeight}px`,
      );
    };

    syncHeaderHeight();
    const observer = new ResizeObserver(syncHeaderHeight);
    observer.observe(header);
    window.addEventListener("resize", syncHeaderHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeaderHeight);
    };
  }, [isMenuOpen]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/courses?search=${encodeURIComponent(q)}` : "/courses");
    setIsMenuOpen(false);
  };

  return (
    <header
      ref={headerRef}
      id="public-site-header"
      className="fixed top-0 left-0 right-0 z-[100] bg-white shadow-md"
    >
      <PromoBanner />

      <nav className="border-b border-slate-200 bg-white">
        <div
          className="absolute top-0 left-0 h-0.5 bg-[#FCC400] transition-[width] duration-150 z-10"
          style={{ width: `${scrollProgress}%` }}
        />

        <div className="container mx-auto px-4 relative bg-white">
          <div className="flex items-center justify-between gap-3 h-16 md:h-[72px]">
            <NavLink
              to="/"
              className="flex items-center gap-2.5 shrink-0 text-[#0070D0] hover:opacity-90 transition-opacity"
            >
              <img
                src="/logo.png"
                alt="F&R Rwanda logo"
                className="w-10 h-10 md:w-11 md:h-11 object-contain rounded-full border border-slate-200 shadow-sm"
              />
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-sm md:text-base font-bold text-[#0070D0]">
                  {HUB.name}
                </span>
                <span className="text-[10px] md:text-xs text-[#FCC400] font-medium">
                  {HUB.company}
                </span>
              </div>
            </NavLink>

            <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-md mx-4">
              <div className="relative flex-1">
                <Input
                  type="search"
                  placeholder="Search courses, exams, languages…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-md border-slate-200 pr-10 focus-visible:ring-[#0070D0]/20 focus-visible:border-[#0070D0] bg-white"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#0070D0] hover:text-[#FCC400] transition-colors"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>

            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={navLinkClass}
                  activeClassName="text-[#0070D0] font-semibold"
                >
                  {link.labelEn}
                </NavLink>
              ))}

              <NavLink
                to="/meeting-registration"
                className={navLinkClass}
                activeClassName="text-[#0070D0] font-semibold"
              >
                {meetingRegistrationLabel}
              </NavLink>
            </div>

            <div className="hidden md:flex items-center gap-2 shrink-0">
              <NavLink to="/login">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-md border-[#0070D0] text-[#0070D0] hover:bg-[#0070D0]/5 px-5 font-semibold h-10 bg-white"
                >
                  Log In
                </Button>
              </NavLink>
              <NavLink to="/signup">
                <Button
                  size="sm"
                  className="rounded-md bg-[#0070D0] hover:bg-[#0058A8] text-white px-5 font-semibold h-10"
                >
                  Get Started
                </Button>
              </NavLink>
            </div>

            <button
              className="lg:hidden text-[#0070D0] p-1"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="lg:hidden py-4 border-t border-slate-100 bg-white">
              <form onSubmit={handleSearch} className="mb-4 px-1">
                <div className="relative">
                  <Input
                    type="search"
                    placeholder="Search courses…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pr-10 border-slate-200 bg-white"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0070D0]"
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </form>

              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/"}
                    className={mobileNavLinkClass}
                    activeClassName="text-[#0070D0] bg-[#0070D0]/5"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.labelEn}
                  </NavLink>
                ))}

                <NavLink
                  to="/meeting-registration"
                  className={mobileNavLinkClass}
                  activeClassName="text-[#0070D0] bg-[#0070D0]/5"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {meetingRegistrationLabel}
                </NavLink>

                <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-slate-100">
                  <NavLink to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full rounded-md border-[#0070D0] text-[#0070D0] font-semibold h-11 bg-white"
                    >
                      Log In
                    </Button>
                  </NavLink>
                  <NavLink to="/signup" onClick={() => setIsMenuOpen(false)}>
                    <Button
                      size="sm"
                      className="w-full rounded-md bg-[#0070D0] hover:bg-[#0058A8] text-white font-semibold h-11"
                    >
                      Get Started
                    </Button>
                  </NavLink>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
