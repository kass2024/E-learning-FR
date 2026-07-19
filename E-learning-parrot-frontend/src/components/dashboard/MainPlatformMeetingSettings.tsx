import { useEffect, useState } from "react";
import { Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { getPlatformMeetingSettings, updatePlatformMeetingSettings } from "@/api/axios";
import { fetchDashboardCached, invalidateDashboardCache } from "@/lib/dashboardCache";
import { isStoredMainAdmin } from "@/lib/institutionContext";
import { cn } from "@/lib/utils";

/**
 * System-wide live meeting provider for the main platform.
 * Daily is the default priority; Zoom remains available when configured.
 */
export default function MainPlatformMeetingSettings() {
  const { toast } = useToast();
  const [platformProvider, setPlatformProvider] = useState<"zoom" | "daily">("daily");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dailyConfigured, setDailyConfigured] = useState(false);
  const [dailyDomain, setDailyDomain] = useState<string | null>(null);
  const [availableMeetingProviders, setAvailableMeetingProviders] = useState<string[]>(["daily", "zoom"]);
  const [canManage, setCanManage] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await fetchDashboardCached(
          "platform-meeting-settings",
          getPlatformMeetingSettings,
          { force: true },
        );
        if (cancelled) return;
        setPlatformProvider(data.main_platform_meeting_provider === "zoom" ? "zoom" : "daily");
        setCanManage(data.can_manage_main_platform_settings !== false || isStoredMainAdmin());
        const status = data.meeting_provider_status;
        setDailyConfigured(Boolean(status?.providers?.daily?.configured));
        setDailyDomain(status?.providers?.daily?.domain ?? null);
        setAvailableMeetingProviders(status?.available_meeting_providers ?? ["daily", "zoom"]);
      } catch {
        if (!cancelled) {
          setPlatformProvider("daily");
          setCanManage(isStoredMainAdmin());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await updatePlatformMeetingSettings({
        main_platform_meeting_provider: platformProvider,
      });
      setPlatformProvider(data.main_platform_meeting_provider === "zoom" ? "zoom" : "daily");
      invalidateDashboardCache("platform-meeting-settings");
      toast({
        variant: "success",
        title: "Live meetings updated",
        description:
          platformProvider === "daily"
            ? "Daily is the system default for new live sessions across the main platform."
            : "Zoom will be used for new main-platform live sessions until you switch back to Daily.",
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        variant: "destructive",
        title: "Could not save",
        description: err?.response?.data?.message ?? "Failed to update meeting provider.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-[#0070D0]/10 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-[#0070D0]">
          <Video className="h-5 w-5" />
          Live meeting platform
        </CardTitle>
        <CardDescription>
          System-wide default for the main platform and all partner institutions. Daily is the
        priority provider. Only full admins can change this.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading platform settings…
          </div>
        ) : (
          <>
            <div className="max-w-lg space-y-3">
              <Label>Meeting platform</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!availableMeetingProviders.includes("daily") || !canManage}
                  onClick={() => setPlatformProvider("daily")}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left transition-colors",
                    platformProvider === "daily"
                      ? "border-[#0070D0] bg-[#0070D0] text-white"
                      : "border-[#0070D0]/20 bg-white hover:border-[#0070D0]/40",
                    (!availableMeetingProviders.includes("daily") || !canManage) &&
                      "cursor-not-allowed opacity-50",
                  )}
                >
                  <p className="text-sm font-semibold">Daily</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      platformProvider === "daily" ? "text-white/80" : "text-muted-foreground",
                    )}
                  >
                    Priority · private rooms
                  </p>
                </button>
                <button
                  type="button"
                  disabled={!availableMeetingProviders.includes("zoom") || !canManage}
                  onClick={() => setPlatformProvider("zoom")}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left transition-colors",
                    platformProvider === "zoom"
                      ? "border-[#0070D0] bg-[#0070D0] text-white"
                      : "border-[#0070D0]/20 bg-white hover:border-[#0070D0]/40",
                    (!availableMeetingProviders.includes("zoom") || !canManage) &&
                      "cursor-not-allowed opacity-50",
                  )}
                >
                  <p className="text-sm font-semibold">Zoom</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      platformProvider === "zoom" ? "text-white/80" : "text-muted-foreground",
                    )}
                  >
                    Licensed Zoom hosts
                  </p>
                </button>
              </div>
              {platformProvider === "daily" && dailyConfigured && dailyDomain ? (
                <p className="text-xs text-emerald-700">Daily configured ({dailyDomain})</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Applies everywhere for newly scheduled live classes, meetings, webinars, and cohorts —
                including partner institutions. Existing sessions keep their original provider.
              </p>
              {!canManage ? (
                <p className="text-xs text-amber-700">
                  Your account cannot change this system setting. Ask a main platform admin.
                </p>
              ) : null}
            </div>

            <Button
              type="button"
              disabled={saving || !canManage}
              onClick={() => void handleSave()}
              className="bg-[#0070D0] hover:bg-[#0058A8]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                `Save as ${platformProvider === "daily" ? "Daily" : "Zoom"}`
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
