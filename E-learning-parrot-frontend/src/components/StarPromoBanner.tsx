import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { StarburstAutoFitText } from "@/components/star/StarburstAutoFitText";
import { useStarPromoBanner } from "@/context/StarPromoBannerContext";
import { starburstPoints } from "@/lib/starburst";

const StarPromoBanner = () => {
  const navigate = useNavigate();
  const { banner, visible, dismiss } = useStarPromoBanner();

  if (!visible || !banner) return null;

  const handleClick = () => {
    if (!banner.link_url?.trim()) return;
    const url = banner.link_url.trim();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(url.startsWith("/") ? url : `/${url}`);
  };

  const bg = banner.background_color || "#D4AF37";
  const textColor = banner.text_color || "#FFFFFF";
  const clickable = Boolean(banner.link_url?.trim());
  const textLines = [banner.line1, banner.line2].filter((line): line is string => Boolean(line?.trim()));

  return (
    <div
      className="fixed right-4 lg:right-8 top-1/2 -translate-y-1/2 z-30 hidden md:block pointer-events-none"
      role="region"
      aria-label="Promotional star banner"
      data-star-promo-banner
    >
      <div className="relative pointer-events-auto animate-star-blink">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className="absolute -top-1 -right-1 z-10 w-7 h-7 rounded-full bg-[#0070D0]/90 hover:bg-[#0070D0] text-white flex items-center justify-center shadow-md transition-colors"
          aria-label="Dismiss star banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div
          className={`relative w-[7.5rem] h-[7.5rem] lg:w-[8.5rem] lg:h-[8.5rem] drop-shadow-2xl ${clickable ? "cursor-pointer" : ""}`}
          onClick={clickable ? handleClick : undefined}
          onKeyDown={
            clickable
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") handleClick();
                }
              : undefined
          }
          role={clickable ? "button" : undefined}
          tabIndex={clickable ? 0 : undefined}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden>
            <defs>
              <linearGradient id="star-banner-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={bg} />
                <stop offset="45%" stopColor="#F5E6A8" />
                <stop offset="100%" stopColor={bg} />
              </linearGradient>
            </defs>
            <polygon
              points={starburstPoints(92, 58, 16, 100, 100)}
              fill="url(#star-banner-fill)"
              stroke="#FFFFFF"
              strokeWidth="6"
              strokeLinejoin="round"
            />
          </svg>

          <StarburstAutoFitText lines={textLines} textColor={textColor} maxFontSize={22} />
        </div>
      </div>
    </div>
  );
};

export default StarPromoBanner;
