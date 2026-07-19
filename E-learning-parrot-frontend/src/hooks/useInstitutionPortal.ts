import { useEffect, useState } from "react";
import { getInstitutionPortalBySlug } from "@/api/axios";
import type { InstitutionPortalPayload } from "@/lib/institutionPortal";

export function useInstitutionPortal(slug: string) {
  const normalized = slug.trim().toLowerCase();
  const [data, setData] = useState<InstitutionPortalPayload | null>(null);
  const [loading, setLoading] = useState(Boolean(normalized));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!normalized) {
      setLoading(false);
      setError("Institution link is invalid.");
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    getInstitutionPortalBySlug(normalized)
      .then((res) => {
        if (!mounted) return;
        setData(res);
      })
      .catch(() => {
        if (!mounted) return;
        setError("This institution website is unavailable or the link is invalid.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [normalized]);

  return { data, loading, error, slug: normalized, institution: data?.institution ?? null };
}
