import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPageHeader";
import { getStoredInstitution } from "@/lib/institutionContext";
import { InstitutionBrandLogo } from "@/components/InstitutionBrandLogo";
import { getPublicStorageUrl } from "@/lib/apiConfig";
import { Building2, Mail, Globe, MapPin, Settings, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PartnerInstitutionDashboard = () => {
  const navigate = useNavigate();
  const institution = getStoredInstitution();

  if (!institution) {
    return (
      <div className="rounded-xl border p-8 text-center text-muted-foreground">
        Institution profile not loaded. Please sign out and sign in again.
      </div>
    );
  }

  const logoSrc = getPublicStorageUrl(institution.logo_url);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Partner portal"
        title={institution.name}
        description="Manage your institution profile, branding, and settings."
      >
        <Button
          className="bg-[#FCC400] hover:bg-[#E79A4D] text-slate-900 font-semibold"
          onClick={() => navigate("/dashboard/settings")}
        >
          <Settings className="mr-2 h-4 w-4" />
          Institution settings
        </Button>
      </AdminPageHeader>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={institution.name}
                className="h-28 w-28 rounded-2xl object-cover border shadow-md"
              />
            ) : (
              <InstitutionBrandLogo size="lg" />
            )}
            <div>
              <h2 className="font-bold text-lg">{institution.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{institution.contact_email}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge>{institution.status}</Badge>
              <Badge variant="outline">{institution.payment_status}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminStatCard label="Account status" value={institution.status.replace("_", " ")} />
            <AdminStatCard label="Payment" value={institution.payment_status} />
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#0070D0]" />
                Institution details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                {institution.contact_email}
              </p>
              {institution.website && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4 shrink-0" />
                  <a href={institution.website} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                    {institution.website}
                  </a>
                </p>
              )}
              {institution.address && (
                <p className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  {institution.address}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-dashed bg-muted/20">
            <CardContent className="p-5 flex gap-3 text-sm text-muted-foreground">
              <Shield className="h-5 w-5 text-[#0070D0] shrink-0" />
              <p>
                Update your logo, contact details, and optional SMTP in Platform settings. Learners who select your institution on signup will see your branding.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PartnerInstitutionDashboard;
