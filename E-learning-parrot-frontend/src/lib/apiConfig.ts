import { DEFAULT_IMAGES, resolveImage } from "./defaultImages";

const LOCAL_API = "http://localhost:8000/api/admin";
const FRWANDA_PRODUCTION_API = "https://api.frwanda.com/api/admin";

/** Frontend host → API base (when VITE_API_URL is not set in the build). */
const FRONTEND_API_MAP: Record<string, string> = {
  "frwanda.com": FRWANDA_PRODUCTION_API,
  "www.frwanda.com": FRWANDA_PRODUCTION_API,
};

/**
 * Resolves the Laravel API base URL for local dev and production builds.
 * Set VITE_API_URL in .env.production for each deployment.
 */
export function getApiBaseUrl(): string {
  // Dev: same-origin proxy in vite.config.ts → backend on :8000
  if (import.meta.env.DEV) {
    return "/api/admin";
  }

  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return LOCAL_API;
    }
    if (hostname.startsWith("api.")) {
      return `${protocol}//${hostname}/api/admin`;
    }
    const mapped = FRONTEND_API_MAP[hostname.toLowerCase()];
    if (mapped) {
      return mapped;
    }
    return `${protocol}//api.${hostname.replace(/^www\./, "")}/api/admin`;
  }

  return FRWANDA_PRODUCTION_API;
}

export function getPublicStorageUrl(pathOrUrl?: string | null): string | null {
  if (!pathOrUrl?.trim()) return null;
  let path = pathOrUrl.trim();

  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const url = new URL(path);
      if (url.pathname.includes("/public-storage/")) {
        const apiBase = getApiBaseUrl().replace(/\/$/, "");
        const marker = "/public-storage/";
        const idx = url.pathname.indexOf(marker);
        if (idx >= 0) {
          return `${apiBase}${url.pathname.slice(idx)}`;
        }
      }
      path = url.pathname;
    } catch {
      return pathOrUrl;
    }
  }

  if (path.startsWith("storage/")) path = `/${path}`;

  let relative: string | null = null;
  if (path.startsWith("/storage/")) {
    relative = path.slice("/storage/".length);
  } else if (path.startsWith("/api/admin/public-storage/")) {
    return path;
  } else if (path.includes("/public-storage/")) {
    const marker = "/public-storage/";
    const idx = path.indexOf(marker);
    const apiBase = getApiBaseUrl().replace(/\/$/, "");
    return `${apiBase}${path.slice(idx)}`;
  } else if (path.startsWith("uploads/")) {
    relative = path;
  }

  if (!relative) return pathOrUrl;

  const apiBase = getApiBaseUrl().replace(/\/$/, "");
  return `${apiBase}/public-storage/${relative}`;
}

export function formatCoursePrice(price: number | string | null | undefined): string {
  const value = Number(price);
  if (!value || Number.isNaN(value)) return "Free";
  return `$${value.toFixed(2)}`;
}

export function getCourseImage(title: string, image?: string | null): string {
  if (image?.trim()) return image.trim();

  const t = (title || "").toLowerCase();
  if (t.includes("ielts") || t.includes("toefl") || t.includes("english")) {
    return `https://picsum.photos/seed/frwanda-${t.replace(/[^a-z0-9]+/g, "-")}/800/500`;
  }
  if (t.includes("french") || t.includes("tcf") || t.includes("tef") || t.includes("delf")) {
    return "https://picsum.photos/seed/frwanda-french/800/500";
  }
  if (t.includes("kinyarwanda")) {
    return "https://picsum.photos/seed/frwanda-kinyarwanda/800/500";
  }

  return resolveImage(null, DEFAULT_IMAGES.course);
}
