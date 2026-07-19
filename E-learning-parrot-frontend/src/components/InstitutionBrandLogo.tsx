import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { institutionLogoUrl, institutionBrandingName, showsPlatformHubBranding, useInstitutionBrandingRevision, getStoredInstitution } from "@/lib/institutionContext";
import ParrotLogo from "@/components/ParrotLogo";
import { HUB } from "@/lib/hubConfig";

type Props = {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  showRing?: boolean;
};

const sizeMap = {
  xs: "h-8 w-8 text-sm",
  sm: "h-10 w-10 text-base",
  md: "h-12 w-12 text-lg",
  lg: "h-16 w-16 text-xl",
};

function InstitutionInitialBadge({
  name,
  size,
  className,
}: {
  name: string;
  size: keyof typeof sizeMap;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0070D0] to-[#0058A8] text-white font-bold shrink-0",
        sizeMap[size],
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function InstitutionBrandLogo({ size = "sm", className, showRing = true }: Props) {
  const revision = useInstitutionBrandingRevision();
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = institutionLogoUrl();

  useEffect(() => {
    setLogoFailed(false);
  }, [revision, logo]);

  if (showsPlatformHubBranding()) {
    return <ParrotLogo size={size} showRing={showRing} className={className} />;
  }

  const name = institutionBrandingName() || "Institution";

  if (logo && !logoFailed) {
    return (
      <img
        src={logo}
        alt={`${name} logo`}
        className={cn(
          "rounded-xl object-cover border border-border bg-white shadow-sm shrink-0",
          sizeMap[size],
          className,
        )}
        onError={() => setLogoFailed(true)}
      />
    );
  }

  return <InstitutionInitialBadge name={name} size={size} className={className} />;
}

export function dashboardBrandTitle(): string {
  if (showsPlatformHubBranding()) return HUB.name;
  return institutionBrandingName() || "Institution";
}

export function dashboardBrandSubtitle(): string {
  if (showsPlatformHubBranding()) return HUB.slogan;
  const inst = getStoredInstitution();
  if (!inst) return "";
  return inst.contact_email || inst.website || "";
}
