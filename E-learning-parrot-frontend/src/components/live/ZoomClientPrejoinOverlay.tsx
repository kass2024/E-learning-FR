import { createPortal } from "react-dom";
import { resolveZoomBrandingLogoUrl } from "@/lib/zoomAvatars";
import { platformZoomLogoFallback } from "@/lib/zoomBrandAssets";
import type { ZoomClientBranding } from "@/lib/zoomClientBranding";

type Props = {
  branding: ZoomClientBranding;
  active?: boolean;
};

/** Zoom profile / institution logo on Zoom's native pre-join preview panel. */
export function ZoomClientPrejoinOverlay({ branding, active = false }: Props) {
  const resolvedLogo = branding.institutionMode
    ? resolveZoomBrandingLogoUrl(branding.logoUrl)
    : platformZoomLogoFallback(resolveZoomBrandingLogoUrl(branding.logoUrl));

  if (!active || !resolvedLogo) return null;

  const modeClass = branding.institutionMode
    ? "parrot-zoom-native-prejoin-brand--institution"
    : "parrot-zoom-native-prejoin-brand--profile";

  return createPortal(
    <div className={`parrot-zoom-native-prejoin-brand ${modeClass}`.trim()} aria-hidden="true">
      <img className="parrot-zoom-native-prejoin-brand__logo" src={resolvedLogo} alt="" referrerPolicy="no-referrer" />
      {branding.institutionMode ? (
        <span className="parrot-zoom-native-prejoin-brand__name">{branding.companyName}</span>
      ) : null}
    </div>,
    document.body,
  );
}
