import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ParrotLogo from "@/components/ParrotLogo";
import { InstitutionBrandLogo, dashboardBrandTitle } from "@/components/InstitutionBrandLogo";
import { HUB } from "@/lib/hubConfig";
import { showsPlatformHubBranding } from "@/lib/institutionContext";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export function AdminPageHeader({ eyebrow = "Administration", title, description, children }: Props) {
  const brandName = dashboardBrandTitle();
  const useHub = showsPlatformHubBranding();

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-r from-[#1A8AD8] to-[#0058A8] p-6 sm:p-8 shadow-[0_18px_45px_rgba(37,77,129,0.25)] mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {useHub ? (
            <ParrotLogo size="md" showRing={false} className="ring-2 ring-white/25 hidden sm:flex shrink-0" />
          ) : (
            <InstitutionBrandLogo size="md" showRing={false} className="ring-2 ring-white/25 hidden sm:flex shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-white/80">
              {eyebrow} · {useHub ? HUB.company : brandName}
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{title}</h1>
            {description && <p className="text-white/90 mt-1 text-sm sm:text-base">{description}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="rounded-2xl border border-border/70">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      )}
    </Card>
  );
}
