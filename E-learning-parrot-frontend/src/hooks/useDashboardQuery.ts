import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DASHBOARD_CACHE_REFRESH_EVENT,
  DASHBOARD_DATA_UPDATED_EVENT,
  fetchDashboardCached,
  readDashboardCache,
  scopedDashboardCacheKey,
} from "@/lib/dashboardCache";
import { INSTITUTION_CONTEXT_EVENT } from "@/lib/institutionContext";

type Options = {
  enabled?: boolean;
  immediate?: boolean;
};

function useCacheScopeRevision(): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(INSTITUTION_CONTEXT_EVENT, bump);
    window.addEventListener("parrot-session-refresh", bump);
    window.addEventListener(DASHBOARD_CACHE_REFRESH_EVENT, bump);
    return () => {
      window.removeEventListener(INSTITUTION_CONTEXT_EVENT, bump);
      window.removeEventListener("parrot-session-refresh", bump);
      window.removeEventListener(DASHBOARD_CACHE_REFRESH_EVENT, bump);
    };
  }, []);

  return revision;
}

export function useDashboardQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: Options
) {
  const enabled = options?.enabled !== false;
  const scopeRevision = useCacheScopeRevision();
  const cacheKey = useMemo(
    () => scopedDashboardCacheKey(key),
    [key, scopeRevision],
  );

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const cached = enabled ? readDashboardCache<T>(key) : null;
  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState(enabled && cached === null);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(cached !== null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(
    async (force = false) => {
      if (!enabled) return;
      const snapshot = readDashboardCache<T>(key);
      if (force) {
        setRefreshing(true);
      } else if (snapshot === null) {
        setLoading(true);
      } else {
        setData(snapshot);
        setFromCache(true);
        setLoading(false);
        setRefreshing(true);
      }

      try {
        const result = await fetchDashboardCached(key, () => fetcherRef.current(), {
          force,
        });
        setData(result.data);
        setFromCache(result.fromCache && !force);
        setError(null);
        if (!result.fromCache || force) {
          setRefreshing(false);
        }
      } catch (err) {
        setError(err);
        setRefreshing(false);
      } finally {
        setLoading(false);
      }
    },
    [enabled, key],
  );

  useEffect(() => {
    const fresh = enabled ? readDashboardCache<T>(key) : null;
    if (fresh !== null) {
      setData(fresh);
      setFromCache(true);
      setLoading(false);
    } else {
      setLoading(enabled);
      setFromCache(false);
    }
    setError(null);
  }, [cacheKey, enabled, key]);

  useEffect(() => {
    if (enabled) void load(false);
  }, [enabled, cacheKey, load]);

  useEffect(() => {
    if (!enabled) return;

    const onDataUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; scope?: string }>).detail;
      if (detail?.key !== key && detail?.scope !== cacheKey) return;
      const fresh = readDashboardCache<T>(key);
      if (fresh === null) return;
      setData(fresh);
      setFromCache(false);
      setLoading(false);
      setRefreshing(false);
      setError(null);
    };

    window.addEventListener(DASHBOARD_DATA_UPDATED_EVENT, onDataUpdated);
    return () => window.removeEventListener(DASHBOARD_DATA_UPDATED_EVENT, onDataUpdated);
  }, [cacheKey, enabled, key]);

  return {
    data,
    loading,
    refreshing,
    fromCache,
    error,
    reload: () => load(true),
    setData,
  };
}
