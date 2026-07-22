import { NavLink } from "@/components/NavLink";
import { Phone, Mail, MapPin } from "lucide-react";
import { HUB } from "@/lib/hubConfig";
import FooterMap from "@/components/FooterMap";

const Footer = () => {
  const exploreLinks = [
    { to: "/courses", label: "All Programs" },
    { to: "/pay-now", label: "Pay Now" },
    { to: "/meeting-registration", label: "Book meeting with us" },
    { to: "/about", label: "About Us" },
    { to: "/signup", label: "Create Account" },
  ];

  const importantLinks = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/courses", label: "Programs" },
    { to: "/pay-now", label: "Pay Now" },
    { to: "/institution-signup", label: "Partner Institution Sign Up" },
    { to: "/login", label: "Login" },
    { to: "/signup", label: "Sign Up" },
  ];

  return (
    <footer className="bg-[#0070D0] text-white">
      <div className="container mx-auto px-4 py-12 md:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <NavLink to="/" className="flex items-center gap-3 text-white mb-4">
              <img
                src="/logo.png"
                alt="F&R Rwanda Ltd"
                className="w-12 h-12 rounded-full border border-white/20 bg-white p-1 object-contain"
              />
              <div className="leading-tight">
                <div className="text-base font-bold tracking-tight">{HUB.name}</div>
                <div className="text-xs text-[#FCC400]">{HUB.company}</div>
              </div>
            </NavLink>
            <p className="text-sm text-white/80 leading-relaxed mb-4">
              School of Fluency and Proficiency. Invest in your language skills today and open the
              door to a better tomorrow.
            </p>
            <a
              href="https://www.tiktok.com/@frrwandaltd"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-white/85 hover:text-[#FCC400] transition-colors"
            >
              TikTok {HUB.tiktok}
            </a>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#FCC400] mb-4">Explore</h3>
            <ul className="space-y-2.5">
              {exploreLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className="text-sm text-white/80 hover:text-[#FCC400] transition-colors"
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#FCC400] mb-4">Important Links</h3>
            <ul className="space-y-2.5">
              {importantLinks.map((link) => (
                <li key={link.to + link.label}>
                  <NavLink
                    to={link.to}
                    className="text-sm text-white/80 hover:text-[#FCC400] transition-colors"
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#FCC400] mb-4">Contact</h3>
            <ul className="space-y-3 text-sm text-white/80">
              <li>
                <a
                  href={`mailto:${HUB.supportEmail}`}
                  className="flex items-center gap-2 hover:text-[#FCC400] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#1F8A4C] shrink-0" />
                  {HUB.supportEmail}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${HUB.supportPhone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 hover:text-[#FCC400] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#1F8A4C] shrink-0" />
                  {HUB.supportPhone}
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${HUB.supportPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[#FCC400] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#1F8A4C] shrink-0" />
                  WhatsApp
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#1F8A4C] shrink-0 mt-0.5" />
                <span>Kigali, Rwanda</span>
              </li>
            </ul>
          </div>
        </div>

        <FooterMap />

        <div className="mt-8 pt-6 border-t border-white/15 text-xs text-white/70 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} F&R Rwanda Ltd — Your partner in language excellence.</div>
          <div className="flex items-center gap-5">
            <NavLink to="/terms" className="hover:text-[#FCC400] transition-colors">
              Terms &amp; Conditions
            </NavLink>
            <NavLink to="/privacy" className="hover:text-[#FCC400] transition-colors">
              Privacy Policy
            </NavLink>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
