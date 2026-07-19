import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Sparkles, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { StarburstAutoFitText } from "@/components/star/StarburstAutoFitText";
import { getStarPromoBanner, updateStarPromoBanner, type StarPromoBannerConfig } from "@/api/axios";
import { starburstPoints } from "@/lib/starburst";

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminStarPromoBannerSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    published: false,
    line1: "",
    line2: "",
    link_url: "",
    background_color: "#D4AF37",
    text_color: "#FFFFFF",
    expires_at: "",
  });

  useEffect(() => {
    let mounted = true;
    getStarPromoBanner()
      .then((banner: StarPromoBannerConfig) => {
        if (!mounted) return;
        setForm({
          published: banner.published,
          line1: banner.line1 ?? "",
          line2: banner.line2 ?? "",
          link_url: banner.link_url ?? "",
          background_color: banner.background_color || "#D4AF37",
          text_color: banner.text_color || "#FFFFFF",
          expires_at: toDatetimeLocalValue(banner.expires_at),
        });
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Could not load star banner",
          description: "Run database migrations on the API server, then try again.",
        });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [toast]);

  const previewLines = [form.line1, form.line2].filter((line): line is string => Boolean(line?.trim()));

  const handleSave = async (publish?: boolean) => {
    setSaving(true);
    try {
      const payload = {
        published: publish !== undefined ? publish : form.published,
        line1: form.line1.trim() || null,
        line2: form.line2.trim() || null,
        link_url: form.link_url.trim() || null,
        background_color: form.background_color.trim() || "#D4AF37",
        text_color: form.text_color.trim() || "#FFFFFF",
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };
      const res = await updateStarPromoBanner(payload);
      void queryClient.invalidateQueries({ queryKey: ["star-promo-banner"] });
      setForm((prev) => ({
        ...prev,
        published: res.banner.published,
        expires_at: toDatetimeLocalValue(res.banner.expires_at),
      }));
      toast({
        title: res.banner.published ? "Star banner published" : "Star banner saved",
        description: res.banner.published
          ? "The star promo is now live on the homepage (middle right)."
          : "Changes saved as draft. Publish when ready.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Could not update the star promo banner.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#0070D0]/15">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#0070D0]">
          <Sparkles className="h-5 w-5" />
          Star Advert Banner
        </CardTitle>
        <CardDescription>
          Blinking starburst promo fixed on the middle-right of the homepage. Text auto-fits inside the star. Banner
          hides automatically after the expiry date and time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl overflow-hidden border shadow-sm bg-slate-50 p-8 flex justify-center">
          <div className="relative animate-star-blink">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg" aria-hidden>
                <defs>
                  <linearGradient id="admin-star-banner-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={form.background_color} />
                    <stop offset="45%" stopColor="#F5E6A8" />
                    <stop offset="100%" stopColor={form.background_color} />
                  </linearGradient>
                </defs>
                <polygon
                  points={starburstPoints(92, 58, 16, 100, 100)}
                  fill="url(#admin-star-banner-fill)"
                  stroke="#FFFFFF"
                  strokeWidth="6"
                  strokeLinejoin="round"
                />
              </svg>
              <StarburstAutoFitText
                lines={previewLines}
                textColor={form.text_color}
                maxFontSize={24}
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 text-center -mt-2">Preview — text scales to fit inside the star</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="star-line1">Top line</Label>
            <Input
              id="star-line1"
              placeholder="e.g. DISCOUNT"
              value={form.line1}
              onChange={(e) => setForm((p) => ({ ...p, line1: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="star-line2">Bottom line</Label>
            <Input
              id="star-line2"
              placeholder="e.g. 10%"
              value={form.line2}
              onChange={(e) => setForm((p) => ({ ...p, line2: e.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="star-expires">Expires at (date &amp; time)</Label>
            <Input
              id="star-expires"
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Not shown on the star — used only to auto-hide the banner on the homepage when the time passes. Leave
              empty for no expiry.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="star-link">Link URL (optional)</Label>
            <Input
              id="star-link"
              placeholder="/courses or https://…"
              value={form.link_url}
              onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="star-bg">Star color</Label>
            <div className="flex gap-2">
              <Input
                id="star-bg"
                value={form.background_color}
                onChange={(e) => setForm((p) => ({ ...p, background_color: e.target.value }))}
              />
              <input
                type="color"
                value={form.background_color}
                onChange={(e) => setForm((p) => ({ ...p, background_color: e.target.value }))}
                className="h-10 w-12 rounded border cursor-pointer shrink-0"
                aria-label="Pick star color"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="star-text">Text color</Label>
            <div className="flex gap-2">
              <Input
                id="star-text"
                value={form.text_color}
                onChange={(e) => setForm((p) => ({ ...p, text_color: e.target.value }))}
              />
              <input
                type="color"
                value={form.text_color}
                onChange={(e) => setForm((p) => ({ ...p, text_color: e.target.value }))}
                className="h-10 w-12 rounded border cursor-pointer shrink-0"
                aria-label="Pick text color"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="star-published"
            checked={form.published}
            onCheckedChange={(checked) => setForm((p) => ({ ...p, published: checked }))}
          />
          <Label htmlFor="star-published" className="font-semibold">
            Published {form.published ? "(live on homepage)" : "(hidden)"}
          </Label>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={() => void handleSave()}
            disabled={saving}
            variant="outline"
            className="border-[#0070D0] text-[#0070D0]"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save draft
          </Button>
          <Button
            onClick={() => void handleSave(true)}
            disabled={saving}
            className="bg-[#0070D0] hover:bg-[#0058A8]"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Publish star banner
          </Button>
          <Button
            onClick={() => void handleSave(false)}
            disabled={saving || !form.published}
            variant="secondary"
          >
            <EyeOff className="mr-2 h-4 w-4" />
            Unpublish
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
