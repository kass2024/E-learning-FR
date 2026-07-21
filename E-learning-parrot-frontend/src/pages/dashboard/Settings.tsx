import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InstitutionBrandingSettings from "@/components/dashboard/InstitutionBrandingSettings";
import MainPlatformMeetingSettings from "@/components/dashboard/MainPlatformMeetingSettings";
import PaymentReceiverSettings from "@/components/dashboard/PaymentReceiverSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Smartphone, Video } from "lucide-react";
import { isStoredMainAdmin } from "@/lib/institutionContext";
import { Navigate } from "react-router-dom";

/**
 * Platform / institution settings — admin, staff, and partner only.
 * Personal profile & password live under /dashboard/profile (top-right menu).
 */
const Settings = () => {
  const role = (localStorage.getItem("parrot_user_role") ?? "").toLowerCase();
  const isLearnerOrInstructor = role === "learner" || role === "instructor" || role === "student";

  if (isLearnerOrInstructor) {
    return <Navigate to="/dashboard/profile" replace />;
  }

  const showInstitution = role === "partner_company";
  const showLiveMeetings =
    isStoredMainAdmin() || role === "admin" || role === "staff" || role === "meeting_user";
  const showPayments = isStoredMainAdmin() || role === "admin" || role === "staff";

  if (!showInstitution && !showLiveMeetings && !showPayments) {
    return <Navigate to="/dashboard/profile" replace />;
  }

  const tabCount = (showInstitution ? 1 : 0) + (showLiveMeetings ? 1 : 0) + (showPayments ? 1 : 0);
  const defaultTab = showPayments ? "payments" : showLiveMeetings ? "live-meetings" : "institution";

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Platform settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage payments, live-meeting defaults, and institution branding. For your photo and password, use My
              profile in the top-right menu.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showPayments && <Badge variant="secondary">Payments</Badge>}
          {showLiveMeetings && <Badge variant="secondary">Live meetings</Badge>}
          {showInstitution && <Badge variant="secondary">Institution</Badge>}
        </div>
      </div>

      <Card className="border-0 bg-white shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-xl">Settings</CardTitle>
          <CardDescription>Organization and payment configuration for your role.</CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList
              className="grid w-full max-w-2xl bg-muted/40"
              style={{ gridTemplateColumns: `repeat(${Math.max(tabCount, 1)}, minmax(0, 1fr))` }}
            >
              {showPayments && (
                <TabsTrigger value="payments" className="gap-2">
                  <Smartphone className="h-4 w-4" />
                  Payments
                </TabsTrigger>
              )}
              {showLiveMeetings && (
                <TabsTrigger value="live-meetings" className="gap-2">
                  <Video className="h-4 w-4" />
                  Live meetings
                </TabsTrigger>
              )}
              {showInstitution && (
                <TabsTrigger value="institution" className="gap-2">
                  <SettingsIcon className="h-4 w-4" />
                  Institution
                </TabsTrigger>
              )}
            </TabsList>

            {showPayments && (
              <TabsContent value="payments" className="mt-0">
                <PaymentReceiverSettings />
              </TabsContent>
            )}

            {showLiveMeetings && (
              <TabsContent value="live-meetings" className="mt-0">
                <MainPlatformMeetingSettings />
              </TabsContent>
            )}

            {showInstitution && (
              <TabsContent value="institution" className="mt-0">
                <InstitutionBrandingSettings />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
