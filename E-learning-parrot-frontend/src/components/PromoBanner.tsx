import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { usePromoBanner } from "@/context/PromoBannerContext";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const PromoBanner = () => {
  const navigate = useNavigate();
  const { banner, visible, dismiss, countdown } = usePromoBanner();

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

  const showTimer =
    banner.show_countdown && banner.countdown_ends_at && !countdown.expired;
  const showCoupon = banner.show_coupon && banner.coupon_code?.trim();

  return (
    <div
      className="relative text-white text-xs sm:text-sm shrink-0"
      style={{ backgroundColor: banner.background_color || "#1A8AD8" }}
      role="region"
      aria-label="Promotional announcement"
      data-promo-banner
    >
      <div
        className={`container mx-auto px-4 py-2.5 sm:py-3 ${banner.link_url ? "cursor-pointer" : ""}`}
        onClick={banner.link_url ? handleClick : undefined}
        onKeyDown={
          banner.link_url
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") handleClick();
              }
            : undefined
        }
        role={banner.link_url ? "button" : undefined}
        tabIndex={banner.link_url ? 0 : undefined}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 pr-8 sm:pr-10">
          <span className="text-lg leading-none hidden sm:inline" aria-hidden>
            ☀️
          </span>

          {banner.headline?.trim() && (
            <span className="font-extrabold text-[#1F8A4C] uppercase tracking-wide text-sm sm:text-base">
              {banner.headline}
            </span>
          )}

          {banner.offer_text?.trim() && (
            <span className="font-semibold text-white/95">{banner.offer_text}</span>
          )}

          {showTimer && (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-[#1F8A4C] font-semibold italic text-xs">
                Flash Sale Ends In
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  { value: pad(countdown.hours), label: "Hours" },
                  { value: pad(countdown.minutes), label: "Minutes" },
                  { value: pad(countdown.seconds), label: "Seconds" },
                ].map((unit) => (
                  <div
                    key={unit.label}
                    className="bg-white rounded-md px-2 py-1 text-center min-w-[44px] shadow-sm"
                  >
                    <div className="text-[#1F8A4C] font-bold text-sm leading-none">{unit.value}</div>
                    <div className="text-[9px] text-slate-600 mt-0.5">{unit.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showCoupon && (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-[#1F8A4C] font-semibold italic text-xs">
                Use Coupon Code
              </span>
              <button
                type="button"
                className="rounded-md bg-[#F2E6A0] hover:bg-[#F2D96A] text-[#1F8A4C] font-extrabold px-3 py-1.5 text-xs sm:text-sm tracking-wide"
                onClick={(e) => {
                  e.stopPropagation();
                  void navigator.clipboard?.writeText(banner.coupon_code!.trim());
                }}
                title="Click to copy coupon code"
              >
                {banner.coupon_code}
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default PromoBanner;
