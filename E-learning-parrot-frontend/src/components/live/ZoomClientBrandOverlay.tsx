import { createPortal } from "react-dom";
import { resolveZoomBrandingLogoUrl } from "@/lib/zoomAvatars";
import { platformZoomLogoFallback } from "@/lib/zoomBrandAssets";
import type { ZoomClientBranding } from "@/lib/zoomClientBranding";

type Props = {
  branding: ZoomClientBranding;
  active?: boolean;
};

/** Visual header cover only — DOM patcher runs from ZoomClientMeeting. */
export function ZoomClientBrandOverlay({ branding, active = false }: Props) {
  const resolvedLogo = branding.institutionMode
    ? resolveZoomBrandingLogoUrl(branding.logoUrl)
    : platformZoomLogoFallback(resolveZoomBrandingLogoUrl(branding.logoUrl));

  if (!active || typeof document === "undefined") return null;

  return createPortal(
    <div className="parrot-zoom-brand-header" role="banner">
      <div className="parrot-zoom-brand-shield" aria-hidden="true" />
      <div
        className={`parrot-zoom-brand-bar${branding.institutionMode ? " parrot-zoom-brand-bar--institution" : ""}`}
      >
        {resolvedLogo ? (
          <img
            className="parrot-zoom-brand-bar__logo"
            src={resolvedLogo}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.remove();
            }}
          />
        ) : null}
        <span className="parrot-zoom-brand-bar__name">{branding.companyName}</span>
      </div>
    </div>,
    document.body,
  );
}
