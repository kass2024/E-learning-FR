import { invalidateDashboardCache } from "@/lib/dashboardCache";

const STORAGE_KEY = "parrot_app_build_id";
const RELOAD_GUARD_PREFIX = "parrot_build_reloaded_";

/** Read build id injected at compile time (changes every production build). */
export function currentAppBuildId(): string {
  return import.meta.env.VITE_APP_BUILD_ID?.trim() || "dev";
}

async function fetchRemoteBuildId(): Promise<string | null> {
  try {
    const response = await fetch(`/version.json?_=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { buildId?: string };
    const buildId = payload.buildId?.trim();
    return buildId || null;
  } catch {
    return null;
  }
}

function reloadForNewBuild(buildId: string): void {
  const reloadKey = `${RELOAD_GUARD_PREFIX}${buildId}`;
  if (sessionStorage.getItem(reloadKey) === "1") return;

  sessionStorage.setItem(reloadKey, "1");
  localStorage.setItem(STORAGE_KEY, buildId);
  invalidateDashboardCache();
  window.location.reload();
}

function applyBuildIdUpdate(buildId: string): boolean {
  if (!buildId || buildId === "dev") return false;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, buildId);
    return false;
  }

  if (stored === buildId) return false;

  reloadForNewBuild(buildId);
  return true;
}

/**
 * After a new frontend deploy, reload once so users pick up fresh JS/CSS
 * without Ctrl+F5. Fetches version.json from the server so this works even
 * when the browser is still running an older cached JS bundle.
 */
export function ensureFreshAppShell(): void {
  if (import.meta.env.DEV) return;
  if (typeof window === "undefined") return;

  const embedded = currentAppBuildId();
  if (embedded && embedded !== "dev") {
    applyBuildIdUpdate(embedded);
  }

  void fetchRemoteBuildId().then((remote) => {
    if (remote) applyBuildIdUpdate(remote);
  });
}

/** Detect new deploys on tab focus / long-lived sessions. */
export function startAppBuildWatcher(): void {
  if (import.meta.env.DEV) return;
  if (typeof window === "undefined") return;

  const check = () => {
    void fetchRemoteBuildId().then((remote) => {
      if (remote) applyBuildIdUpdate(remote);
    });
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });

  window.addEventListener("focus", check);
  window.setInterval(check, 3 * 60 * 1000);
}
