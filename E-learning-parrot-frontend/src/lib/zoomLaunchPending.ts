import { useEffect, useState } from "react";
import { institutionBrandingName, institutionLogoUrl, isStoredMainAdmin } from "@/lib/institutionContext";
import { getAppDisplayName } from "@/lib/brandSanitize";
import { HUB } from "@/lib/hubConfig";

export type ZoomLaunchPending = {
  title?: string | null;
  isHost?: boolean;
  institutionName?: string | null;
  logoUrl?: string | null;
};

const STORAGE_KEY = "parrot_zoom_launch_pending";
export const ZOOM_LAUNCH_PENDING_EVENT = "parrot-zoom-launch-pending";

function notifyZoomLaunchPendingChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ZOOM_LAUNCH_PENDING_EVENT));
  }
}

export function setZoomLaunchPending(pending: ZoomLaunchPending | null): void {
  if (typeof window === "undefined") return;
  if (pending) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  notifyZoomLaunchPendingChanged();
}

export function getZoomLaunchPending(): ZoomLaunchPending | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ZoomLaunchPending;
  } catch {
    return null;
  }
}

export function clearZoomLaunchPending(): void {
  setZoomLaunchPending(null);
}

import { loadZoomClientSdk } from "@/lib/zoomClientLoader";

export function beginZoomLaunch(opts: {
  title?: string | null;
  isHost?: boolean;
  institutionName?: string | null;
  logoUrl?: string | null;
} = {}): void {
  const mainAdmin = isStoredMainAdmin();
  const useInstitutionLogo = !mainAdmin && Boolean(institutionLogoUrl());
  const defaultInstitutionName = mainAdmin
    ? getAppDisplayName()
    : (institutionBrandingName() ?? HUB.company);
  setZoomLaunchPending({
    title: opts.title ?? undefined,
    isHost: opts.isHost ?? true,
    institutionName: opts.institutionName ?? defaultInstitutionName,
    logoUrl: opts.logoUrl ?? (useInstitutionLogo ? institutionLogoUrl() : null),
  });
  void loadZoomClientSdk().catch(() => undefined);
}

export function useZoomLaunchPending(): ZoomLaunchPending | null {
  const [pending, setPending] = useState<ZoomLaunchPending | null>(() => getZoomLaunchPending());

  useEffect(() => {
    const sync = () => setPending(getZoomLaunchPending());
    window.addEventListener(ZOOM_LAUNCH_PENDING_EVENT, sync);
    return () => window.removeEventListener(ZOOM_LAUNCH_PENDING_EVENT, sync);
  }, []);

  return pending;
}
