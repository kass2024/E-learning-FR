import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPromoBanner, type PromoBannerConfig } from "@/api/axios";

const DISMISS_KEY = "xander_promo_banner_dismissed_revision";

type Countdown = {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

function computeCountdown(endsAt: string | null): Countdown {
  if (!endsAt) {
    return { hours: 0, minutes: 0, seconds: 0, expired: false };
  }
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false,
  };
}

type PromoBannerContextValue = {
  banner: PromoBannerConfig | null;
  loading: boolean;
  dismissed: boolean;
  dismiss: () => void;
  countdown: Countdown;
  visible: boolean;
};

const PromoBannerContext = createContext<PromoBannerContextValue | null>(null);

export function PromoBannerProvider({ children }: { children: ReactNode }) {
  const { data: banner = null, isLoading } = useQuery({
    queryKey: ["promo-banner"],
    queryFn: getPromoBanner,
    staleTime: 30 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState<Countdown>(() =>
    computeCountdown(banner?.countdown_ends_at ?? null),
  );

  useEffect(() => {
    if (!banner) return;
    const stored = localStorage.getItem(DISMISS_KEY);
    setDismissed(Boolean(stored && String(banner.revision) === stored));
    setCountdown(computeCountdown(banner.countdown_ends_at));
  }, [banner]);

  useEffect(() => {
    if (!banner?.show_countdown || !banner.countdown_ends_at) return;
    const tick = () => setCountdown(computeCountdown(banner.countdown_ends_at));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [banner?.show_countdown, banner?.countdown_ends_at]);

  const visible = useMemo(() => {
    if (!banner?.published || dismissed) return false;
    if (banner.show_countdown && banner.countdown_ends_at && countdown.expired) return false;
    return Boolean(banner.headline?.trim() || banner.offer_text?.trim());
  }, [banner, dismissed, countdown.expired]);

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
      countdown,
      visible,
    }),
    [banner, isLoading, dismissed, countdown, visible],
  );

  return <PromoBannerContext.Provider value={value}>{children}</PromoBannerContext.Provider>;
}

export function usePromoBanner() {
  const ctx = useContext(PromoBannerContext);
  if (!ctx) {
    throw new Error("usePromoBanner must be used within PromoBannerProvider");
  }
  return ctx;
}
