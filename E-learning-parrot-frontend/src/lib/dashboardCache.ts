const TTL_MS = 10 * 60 * 1000;
const PREFIX = "xander_dash_";
const INSTITUTION_KEY = "parrot_institution";

type CacheEntry<T> = { ts: number; data: T };

const inflightRequests = new Map<string, Promise<unknown>>();

function readStoredInstitutionId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INSTITUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: number };
    return typeof parsed?.id === "number" ? parsed.id : null;
  } catch {
    return null;
  }
}

/** Namespace cache keys per institution / role so partners never reuse platform admin data. */
export function scopedDashboardCacheKey(base: string): string {
  if (typeof window === "undefined") return base;

  const role = (localStorage.getItem("parrot_user_role") ?? "").toLowerCase();
  const email = localStorage.getItem("parrot_user_email")?.trim() ?? "";
  const institutionId = readStoredInstitutionId();

  if (role === "partner_company" && institutionId) {
    return `${base}@inst${institutionId}`;
  }
  if (role === "admin" || role === "staff") {
    return `${base}@platform`;
  }
  if (email) {
    return `${base}@${email}`;
  }

  return base;
}

function storageKey(key: string): string {
  return PREFIX + scopedDashboardCacheKey(key);
}

export function readDashboardCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - parsed.ts > TTL_MS) {
      sessionStorage.removeItem(storageKey(key));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeDashboardCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { ts: Date.now(), data };
    sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // sessionStorage full or unavailable
  }
}

export function invalidateDashboardCache(key?: string): void {
  if (key) {
    sessionStorage.removeItem(storageKey(key));
    inflightRequests.delete(scopedDashboardCacheKey(key));
    return;
  }
  Object.keys(sessionStorage).forEach((k) => {
    if (k.startsWith(PREFIX)) sessionStorage.removeItem(k);
  });
  inflightRequests.clear();
  // Allow warmup to run again after a full cache wipe.
  void import("@/lib/dashboardPrefetchData")
    .then((mod) => mod.resetDashboardPrefetchFlags?.())
    .catch(() => undefined);
}

/** Return cached data immediately when available; dedupe in-flight requests; refresh in background when cached. */
export async function fetchDashboardCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { force?: boolean }
): Promise<{ data: T; fromCache: boolean }> {
  const cached = !options?.force ? readDashboardCache<T>(key) : null;

  if (cached !== null) {
    const scoped = scopedDashboardCacheKey(key);
    if (!inflightRequests.has(scoped)) {
      const refresh = fetcher()
        .then((fresh) => {
          writeDashboardCache(key, fresh);
          notifyDashboardDataUpdated(key, scoped);
          return fresh;
        })
        .finally(() => {
          inflightRequests.delete(scoped);
        });
      inflightRequests.set(scoped, refresh);
    }
    return { data: cached, fromCache: true };
  }

  const scoped = scopedDashboardCacheKey(key);

  // force=true must always hit the network — never reuse a pre-schedule in-flight request.
  if (options?.force) {
    inflightRequests.delete(scoped);
  } else {
    const existing = inflightRequests.get(scoped) as Promise<T> | undefined;
    if (existing) {
      const data = await existing;
      return { data, fromCache: false };
    }
  }

  const request = fetcher()
    .then((data) => {
      writeDashboardCache(key, data);
      return data;
    })
    .finally(() => {
      inflightRequests.delete(scoped);
    });

  inflightRequests.set(scoped, request);
  const data = await request;
  return { data, fromCache: false };
}

export const DASHBOARD_CACHE_REFRESH_EVENT = "parrot-dashboard-cache-refresh";
export const DASHBOARD_DATA_UPDATED_EVENT = "parrot-dashboard-data-updated";

export function notifyDashboardDataUpdated(key: string, scopeRevision?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DASHBOARD_DATA_UPDATED_EVENT, {
      detail: { key, scope: scopeRevision ?? scopedDashboardCacheKey(key) },
    }),
  );
}

export function notifyDashboardCacheRefresh(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DASHBOARD_CACHE_REFRESH_EVENT));
  }
}
