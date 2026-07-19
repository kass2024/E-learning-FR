import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { resolveZoomBrandingLogoUrl } from "@/lib/zoomAvatars";
import {
  pickZoomLoadingMessage,
  zoomLoadingHeadline,
  type ZoomSdkLoadingPhase,
} from "@/lib/zoomSdkLoadingMessages";
import "@/components/live/zoomSdkStartingSpinner.css";

export type ZoomSdkStartingSpinnerProps = {
  active?: boolean;
  phase?: ZoomSdkLoadingPhase;
  isHost?: boolean;
  meetingTitle?: string | null;
  institutionName?: string | null;
  logoUrl?: string | null;
  /** Full-screen portal overlay (meeting join). Inline for shells and embedded views. */
  fullscreen?: boolean;
  /** Fill parent container (embedded meeting overlay). */
  overlay?: boolean;
  className?: string;
};

export function ZoomSdkStartingSpinner({
  active = true,
  phase = "joining",
  isHost = false,
  meetingTitle,
  institutionName,
  logoUrl,
  fullscreen = false,
  overlay = false,
  className = "",
}: ZoomSdkStartingSpinnerProps) {
  const [tick, setTick] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (!active) return;
    setTick(0);
  }, [active, phase]);

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => {
      setFade(true);
      window.setTimeout(() => {
        setTick((t) => t + 1);
        setFade(false);
      }, 180);
    }, 2400);
    return () => window.clearInterval(interval);
  }, [active, phase]);

  if (!active) return null;

  const resolvedLogo = resolveZoomBrandingLogoUrl(logoUrl);
  const headline = zoomLoadingHeadline(phase, isHost);
  const message = pickZoomLoadingMessage(phase, tick);
  const stepCount = 3;
  const activeStep = tick % stepCount;

  const modeClass = fullscreen
    ? "zoom-sdk-starting-spinner--fullscreen"
    : overlay
      ? "zoom-sdk-starting-spinner--overlay"
      : "zoom-sdk-starting-spinner--inline";

  const content = (
    <div
      className={`zoom-sdk-starting-spinner ${modeClass} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="zoom-sdk-starting-spinner__card">
        {(institutionName || resolvedLogo) && (
          <div className="zoom-sdk-starting-spinner__brand">
            {resolvedLogo ? (
              <img
                className="zoom-sdk-starting-spinner__logo"
                src={resolvedLogo}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : null}
            {institutionName ? (
              <span className="zoom-sdk-starting-spinner__institution">{institutionName}</span>
            ) : null}
          </div>
        )}

        <div className="zoom-sdk-starting-spinner__rings" aria-hidden="true">
          <div className="zoom-sdk-starting-spinner__ring zoom-sdk-starting-spinner__ring--outer" />
          <div className="zoom-sdk-starting-spinner__ring zoom-sdk-starting-spinner__ring--inner" />
          <div className="zoom-sdk-starting-spinner__dot" />
        </div>

        <div>
          <p className="zoom-sdk-starting-spinner__headline">{headline}</p>
          <p
            className={`zoom-sdk-starting-spinner__message${fade ? " zoom-sdk-starting-spinner__message--fade" : ""}`}
          >
            {message}
          </p>
          {meetingTitle ? (
            <p className="zoom-sdk-starting-spinner__subtitle">{meetingTitle}</p>
          ) : null}
        </div>

        <div className="zoom-sdk-starting-spinner__steps" aria-hidden="true">
          {Array.from({ length: stepCount }, (_, i) => (
            <span
              key={i}
              className={`zoom-sdk-starting-spinner__step${i === activeStep ? " zoom-sdk-starting-spinner__step--active" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (fullscreen && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}
