import { readDashboardCache } from "@/lib/dashboardCache";

/** Whether cached dashboard data exists — use to skip initial loading spinners. */
export function hasDashboardCache(key: string): boolean {
  return readDashboardCache(key) !== null;
}

/** Initial `loading` flag: false when session cache already has data. */
export function initialDashboardLoading(key: string): boolean {
  return !hasDashboardCache(key);
}

/** Read cached data synchronously for instant first paint. */
export function readCachedDashboardData<T>(key: string): T | null {
  return readDashboardCache<T>(key);
}
