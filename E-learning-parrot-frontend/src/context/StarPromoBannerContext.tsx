import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStarPromoBanner, type StarPromoBannerConfig } from "@/api/axios";
import { isStarBannerExpired } from "@/lib/starburst";

const DISMISS_KEY = "xander_star_promo_banner_dismissed_revision";

type StarPromoBannerContextValue = {
  banner: StarPromoBannerConfig | null;
  loading: boolean;
  dismissed: boolean;
  dismiss: () => void;
  expired: boolean;
  visible: boolean;
};

const StarPromoBannerContext = createContext<StarPromoBannerContextValue | null>(null);

export function StarPromoBannerProvider({ children }: { children: ReactNode }) {
  const { data: banner = null, isLoading } = useQuery({
    queryKey: ["star-promo-banner"],
    queryFn: getStarPromoBanner,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const [dismissed, setDismissed] = useState(false);
  const [expired, setExpired] = useState(() => isStarBannerExpired(banner?.expires_at ?? null));

  useEffect(() => {
    if (!banner) return;
    const stored = localStorage.getItem(DISMISS_KEY);
    setDismissed(Boolean(stored && String(banner.revision) === stored));
    setExpired(isStarBannerExpired(banner.expires_at));
  }, [banner]);

  useEffect(() => {
    if (!banner?.expires_at) return;
    const tick = () => setExpired(isStarBannerExpired(banner.expires_at));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [banner?.expires_at]);

  const visible = useMemo(() => {
    if (!banner?.published || dismissed || expired) return false;
    return Boolean(banner.line1?.trim() || banner.line2?.trim());
  }, [banner, dismissed, expired]);

  const dismiss = () => {
    if (!banner) return;
    localStorage.setItem(DISMISS_KEY, String(banner.revision));
    setDismissed(true);
  };

  const value = useMemo(
    () => ({
      banner,
      loading: isLoading && !banner,
      dismissed,
      dismiss,
      expired,
      visible,
    }),
    [banner, isLoading, dismissed, expired, visible],
  );

  return <StarPromoBannerContext.Provider value={value}>{children}</StarPromoBannerContext.Provider>;
}

export function useStarPromoBanner() {
  const ctx = useContext(StarPromoBannerContext);
  if (!ctx) {
    throw new Error("useStarPromoBanner must be used within StarPromoBannerProvider");
  }
  return ctx;
}
