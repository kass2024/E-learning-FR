import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Megaphone, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { getPromoBanner, updatePromoBanner, type PromoBannerConfig } from "@/api/axios";

const PROMO_DISMISS_KEY = "xander_promo_banner_dismissed_revision";

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminPromoBannerSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    published: false,
    headline: "",
    offer_text: "",
    coupon_code: "",
    link_url: "",
    background_color: "#1A8AD8",
    countdown_ends_at: "",
    show_countdown: true,
    show_coupon: true,
  });

  useEffect(() => {
    let mounted = true;
    getPromoBanner()
      .then((banner: PromoBannerConfig) => {
        if (!mounted) return;
        setForm({
          published: banner.published,
          headline: banner.headline ?? "",
          offer_text: banner.offer_text ?? "",
          coupon_code: banner.coupon_code ?? "",
          link_url: banner.link_url ?? "",
          background_color: banner.background_color || "#1A8AD8",
          countdown_ends_at: toDatetimeLocalValue(banner.countdown_ends_at),
          show_countdown: banner.show_countdown,
          show_coupon: banner.show_coupon,
        });
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Could not load banner",
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

  const handleSave = async (publish?: boolean) => {
    const willPublish = publish === true;
    const willUnpublish = publish === false;

    if (willPublish) {
      setForm((prev) => ({ ...prev, published: true }));
    } else if (willUnpublish) {
      setForm((prev) => ({ ...prev, published: false }));
    }

    setSaving(true);
    try {
      const payload = {
        published: publish !== undefined ? publish : form.published,
        headline: form.headline.trim() || null,
        offer_text: form.offer_text.trim() || null,
        coupon_code: form.coupon_code.trim() || null,
        link_url: form.link_url.trim() || null,
        background_color: form.background_color.trim() || "#1A8AD8",
        countdown_ends_at: form.countdown_ends_at
          ? new Date(form.countdown_ends_at).toISOString()
          : null,
        show_countdown: form.show_countdown,
        show_coupon: form.show_coupon,
      };
      const res = await updatePromoBanner(payload);

      queryClient.setQueryData(["promo-banner"], res.banner);
      await queryClient.refetchQueries({ queryKey: ["promo-banner"] });

      if (res.banner.published) {
        localStorage.removeItem(PROMO_DISMISS_KEY);
      }

      setForm((prev) => ({
        ...prev,
        published: res.banner.published,
        headline: res.banner.headline ?? prev.headline,
        offer_text: res.banner.offer_text ?? prev.offer_text,
        coupon_code: res.banner.coupon_code ?? prev.coupon_code,
        link_url: res.banner.link_url ?? prev.link_url,
        background_color: res.banner.background_color || prev.background_color,
        countdown_ends_at: toDatetimeLocalValue(res.banner.countdown_ends_at),
        show_countdown: res.banner.show_countdown,
        show_coupon: res.banner.show_coupon,
      }));

      toast({
        title: res.banner.published ? "Banner published" : "Banner saved",
        description: res.banner.published
          ? "The promo banner is now live on the public site."
          : "Changes saved as draft. Publish when ready.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Could not update the promo banner.",
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
          <Megaphone className="h-5 w-5" />
          Advert Banner
        </CardTitle>
        <CardDescription>
          Customize the top promo strip on the public site. Publish when ready — unpublish anytime to hide it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Live preview */}
        <div className="rounded-xl overflow-hidden border shadow-sm">
          <div
            className="relative text-white text-sm py-3 px-4"
            style={{ backgroundColor: form.background_color || "#1A8AD8" }}
          >
            <div className="flex flex-wrap items-center justify-center gap-3 pr-8">
              <span className="text-lg">☀️</span>
              {form.headline && (
                <span className="font-extrabold text-[#FCC400] uppercase">{form.headline}</span>
              )}
              {form.offer_text && <span className="font-semibold">{form.offer_text}</span>}
              {form.show_countdown && form.countdown_ends_at && (
                <span className="text-[#FCC400] italic text-xs">+ countdown timer</span>
              )}
              {form.show_coupon && form.coupon_code && (
                <span className="rounded-md bg-[#F2E6A0] text-[#0070D0] font-bold px-3 py-1 text-xs">
                  {form.coupon_code}
                </span>
              )}
            </div>
          </div>
          <div className="bg-slate-50 px-3 py-2 text-xs text-slate-500 text-center">Preview</div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="promo-headline">Headline</Label>
            <Input
              id="promo-headline"
              placeholder="e.g. SUMMER SALE!"
              value={form.headline}
              onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-offer">Offer text</Label>
            <Input
              id="promo-offer"
              placeholder="e.g. Get any course for $12.99 only!"
              value={form.offer_text}
              onChange={(e) => setForm((p) => ({ ...p, offer_text: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-coupon">Coupon code</Label>
            <Input
              id="promo-coupon"
              placeholder="e.g. SUMMERSALE"
              value={form.coupon_code}
              onChange={(e) => setForm((p) => ({ ...p, coupon_code: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-link">Link URL (optional)</Label>
            <Input
              id="promo-link"
              placeholder="/courses or https://…"
              value={form.link_url}
              onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-bg">Background color</Label>
            <div className="flex gap-2">
              <Input
                id="promo-bg"
                value={form.background_color}
                onChange={(e) => setForm((p) => ({ ...p, background_color: e.target.value }))}
              />
              <input
                type="color"
                value={form.background_color}
                onChange={(e) => setForm((p) => ({ ...p, background_color: e.target.value }))}
                className="h-10 w-12 rounded border cursor-pointer shrink-0"
                aria-label="Pick background color"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo-countdown">Countdown ends at</Label>
            <Input
              id="promo-countdown"
              type="datetime-local"
              value={form.countdown_ends_at}
              onChange={(e) => setForm((p) => ({ ...p, countdown_ends_at: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <Switch
              id="promo-show-countdown"
              checked={form.show_countdown}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, show_countdown: checked }))}
            />
            <Label htmlFor="promo-show-countdown">Show countdown timer</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="promo-show-coupon"
              checked={form.show_coupon}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, show_coupon: checked }))}
            />
            <Label htmlFor="promo-show-coupon">Show coupon code</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="promo-published"
              checked={form.published}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, published: checked }))}
            />
            <Label htmlFor="promo-published" className="font-semibold">
              Published {form.published ? "(live)" : "(hidden)"}
            </Label>
          </div>
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
            Publish banner
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
