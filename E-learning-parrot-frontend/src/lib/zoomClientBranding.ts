import { getAppDisplayName } from "@/lib/brandSanitize";
import { getStoredInstitution, resolveInstitutionLogoUrl } from "@/lib/institutionContext";
import { isHttpAvatarUrl, resolveZoomBrandingLogoUrl } from "@/lib/zoomAvatars";

export type ZoomClientBranding = {
  companyName: string;
  logoUrl?: string | null;
  institutionMode: boolean;
};

const HEADER_TOP_MAX = 110;
const HEADER_LEFT_MAX = 280;

function isInZoomHeaderArea(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  return rect.top < HEADER_TOP_MAX && rect.left < HEADER_LEFT_MAX;
}

function isZoomBrandText(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower) return false;
  if (lower.includes("zoom marketplace") || lower.includes("zoom workplace")) return true;
  if (lower.includes("powered by zoom")) return true;
  if (lower === "zoom" || lower === "workplace") return true;
  return false;
}

function directTextContent(el: HTMLElement): string {
  let out = "";
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
    }
  }
  return out.trim();
}

function hideBrandElement(el: HTMLElement): void {
  if (el.closest(".parrot-zoom-brand-header")) return;
  el.style.setProperty("display", "none", "important");
  el.style.setProperty("visibility", "hidden", "important");
  el.style.setProperty("opacity", "0", "important");
  el.style.setProperty("pointer-events", "none", "important");
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("data-parrot-zoom-brand-hidden", "1");
}

function shouldHideBrandElement(el: HTMLElement): boolean {
  if (!isInZoomHeaderArea(el)) return false;
  if (el.closest(".parrot-zoom-brand-header")) return false;

  const direct = directTextContent(el);
  const full = (el.textContent ?? "").trim();

  if (isZoomBrandText(direct)) return true;
  if (isZoomBrandText(full) && full.length < 48) return true;

  const rect = el.getBoundingClientRect();
  if (rect.height <= 48 && isZoomBrandText(full)) return true;

  return false;
}

function patchZoomBrandText(root: ParentNode): void {
  const candidates = root.querySelectorAll<HTMLElement>("*:not([data-parrot-zoom-brand-hidden='1'])");
  for (const el of candidates) {
    if (shouldHideBrandElement(el)) {
      hideBrandElement(el);
    }
  }

  const brandSelectors = [
    'a[href*="zoom.us"]',
    'a[href*="marketplace.zoom"]',
    '[class*="zm-brand"]',
    '[class*="zm-logo"]',
    '[class*="webclient-brand"]',
    '[class*="workplace"]',
    '[aria-label*="Zoom Workplace"]',
    '[title*="Zoom Workplace"]',
  ].join(", ");

  for (const el of root.querySelectorAll<HTMLElement>(brandSelectors)) {
    if (!isInZoomHeaderArea(el)) continue;
    hideBrandElement(el);
  }
}

function patchHostAvatars(root: ParentNode, logoUrl: string | null): void {
  const resolved = resolveZoomBrandingLogoUrl(logoUrl);
  if (!resolved) return;

  const images = root.querySelectorAll<HTMLImageElement>(
    'img[src*="zoom.us"], img[src*="zoomcdn"], [class*="avatar"] img, [class*="Avatar"] img, [class*="preview"] img, [class*="Preview"] img',
  );
  for (const img of images) {
    if (img.dataset.parrotHostAvatarPatched === "1") continue;
    if (img.closest(".parrot-zoom-brand-header")) continue;
    if (img.closest(".parrot-zoom-native-prejoin-brand")) continue;
    img.referrerPolicy = "no-referrer";
    if (isHttpAvatarUrl(resolved) && new URL(resolved).origin === window.location.origin) {
      img.removeAttribute("crossorigin");
    }
    img.src = resolved;
    img.dataset.parrotHostAvatarPatched = "1";
  }
}

/** Zoom Client View native pre-join (preview + Join button). */
export function isZoomNativePrejoinVisible(): boolean {
  const root = document.getElementById("zmmtg-root");
  if (!root || root.style.display === "none") return false;

  for (const btn of root.querySelectorAll("button")) {
    const label = (btn.textContent ?? btn.getAttribute("aria-label") ?? "").trim();
    if (/^join$/i.test(label)) return true;
  }
  return false;
}

function isPrejoinNameElement(el: HTMLElement, companyName: string, institutionMode: boolean): boolean {
  if (el.closest(".parrot-zoom-brand-header, .parrot-zoom-native-prejoin-brand")) return false;
  if (el.closest("button, a, input, select, textarea, label")) return false;
  if (el.querySelector("button, input, select, textarea")) return false;

  const text = (el.textContent ?? "").trim();
  if (text.length < 2 || text.length > 80) return false;
  if (!institutionMode && text.toUpperCase() === companyName.toUpperCase()) return false;
  if (/terms of service|privacy statement|by clicking/i.test(text)) return false;

  const rect = el.getBoundingClientRect();
  if (rect.width < 80 || rect.height < 18) return false;

  const centerY = rect.top + rect.height / 2;
  if (centerY > window.innerHeight * 0.62) return false;

  const fontSize = Number.parseFloat(window.getComputedStyle(el).fontSize);
  if (fontSize < 15) return false;

  const direct = directTextContent(el);
  return direct.length >= 2 || (text.length >= 2 && el.children.length <= 2);
}

function patchPrejoinDisplayNames(_root: HTMLElement, _branding: ZoomClientBranding): void {
  // SDK user_name controls the pre-join label (Zoom host name or institution name).
}

function applyBrandingPatch(root: HTMLElement | null, branding: ZoomClientBranding): void {
  if (!root) return;
  patchZoomBrandText(root);
  if (branding.logoUrl) {
    patchHostAvatars(root, branding.logoUrl);
  }
  patchPrejoinDisplayNames(root, branding);
}

let activeBrandingCleanup: (() => void) | null = null;

function stopActiveBranding(): void {
  activeBrandingCleanup?.();
  activeBrandingCleanup = null;
}
export function startZoomClientBranding(branding: ZoomClientBranding): () => void {
  stopActiveBranding();

  const root = document.getElementById("zmmtg-root");
  document.documentElement.classList.add("parrot-zoom-branded");
  if (branding.institutionMode) {
    document.documentElement.classList.add("parrot-zoom-institution");
  }

  const run = () => applyBrandingPatch(document.getElementById("zmmtg-root"), branding);
  run();

  const observer = new MutationObserver(run);
  if (root) {
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });
  }

  const interval = window.setInterval(run, 500);

  const cleanup = () => {
    observer.disconnect();
    window.clearInterval(interval);
    document.documentElement.classList.remove("parrot-zoom-branded", "parrot-zoom-institution");
    if (activeBrandingCleanup === cleanup) {
      activeBrandingCleanup = null;
    }
  };

  activeBrandingCleanup = cleanup;
  return cleanup;
}

export function stopZoomClientBranding(): void {
  stopActiveBranding();
}

export function resolveZoomClientBrandingFromStage(
  branding:
    | { companyName: string; avatarUrl?: string | null; hostAvatarUrl?: string | null; institutionMode?: boolean }
    | null
    | undefined,
  isHost: boolean,
): ZoomClientBranding | null {
  if (!branding?.companyName?.trim()) return null;

  const rawLogo = isHost ? branding.avatarUrl : branding.hostAvatarUrl ?? branding.avatarUrl;
  let logoUrl = resolveZoomBrandingLogoUrl(rawLogo);

  if (!logoUrl && branding.institutionMode) {
    const stored = getStoredInstitution();
    if (stored) {
      logoUrl = resolveZoomBrandingLogoUrl(resolveInstitutionLogoUrl(stored));
    }
  }

  return {
    companyName: branding.companyName.trim(),
    logoUrl,
    institutionMode: branding.institutionMode === true,
  };
}

export function defaultMainPlatformClientBranding(): ZoomClientBranding {
  return {
    companyName: getAppDisplayName(),
    logoUrl: null,
    institutionMode: false,
  };
}
