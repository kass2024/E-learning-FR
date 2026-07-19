/** Zoom Meeting SDK can leave body/html with overflow:hidden after prepareWebSDK(). */
export function unlockDashboardPageScroll(): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (html.classList.contains("zoom-client-meeting-active")) return;

  html.style.removeProperty("overflow");
  html.style.setProperty("overflow-y", "auto", "important");
  html.style.removeProperty("height");

  const { body } = document;
  body.style.removeProperty("overflow");
  body.style.setProperty("overflow-y", "auto", "important");
  body.style.removeProperty("height");
  body.style.removeProperty("overscroll-behavior");

  const root = document.getElementById("root");
  if (root) {
    root.style.removeProperty("overflow");
    root.style.removeProperty("height");
    root.style.removeProperty("max-height");
    root.style.removeProperty("position");
  }
}
