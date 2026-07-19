import { FormEvent, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { getMyInstitutionSettings, updateMyInstitutionBranding } from "@/api/axios";
import { saveInstitutionContext } from "@/lib/institutionContext";
import {
  emptyPortalColorDraft,
  type InstitutionPortalFeature,
  type PortalColorDraft,
} from "@/lib/institutionPortal";
import { InstitutionWebsiteColorControls } from "@/components/dashboard/InstitutionWebsiteColorControls";
import { Globe2, Loader2, Plus, Trash2 } from "lucide-react";

const emptyFeature = (): InstitutionPortalFeature => ({ title: "", description: "" });

const InstitutionPortalContentSettings = () => {
  const { toast } = useToast();
  const email = localStorage.getItem("parrot_user_email") ?? "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagline, setTagline] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [about, setAbout] = useState("");
  const [portalColors, setPortalColors] = useState<PortalColorDraft>(emptyPortalColorDraft());
  const [ctaLabel, setCtaLabel] = useState("");
  const [features, setFeatures] = useState<InstitutionPortalFeature[]>([emptyFeature(), emptyFeature(), emptyFeature()]);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [institutionName, setInstitutionName] = useState("Institution");

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }
    getMyInstitutionSettings(email)
      .then((res) => {
        setInstitutionName(res.institution.name ?? "Institution");
        const portal = res.institution.portal;
        if (!portal) return;
        setTagline(portal.tagline ?? "");
        setHeroTitle(portal.hero_title ?? "");
        setHeroSubtitle(portal.hero_subtitle ?? "");
        setAbout(portal.about ?? "");
        setPortalColors(emptyPortalColorDraft(portal));
        setCtaLabel(portal.cta_label ?? "");
        if (portal.features?.length) {
          setFeatures(portal.features.slice(0, 3));
        }
      })
      .finally(() => setLoading(false));
  }, [email]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData();
      form.append("email", email);
      form.append("portal_tagline", tagline);
      form.append("portal_hero_title", heroTitle);
      form.append("portal_hero_subtitle", heroSubtitle);
      form.append("portal_about", about);
      form.append("portal_primary_color", portalColors.primary_color);
      form.append("portal_accent_color", portalColors.accent_color);
      form.append("portal_hero_bg_color", portalColors.hero_bg_color);
      form.append("portal_button_bg_color", portalColors.button_bg_color);
      form.append("portal_button_text_color", portalColors.button_text_color);
      form.append("portal_cta_label", ctaLabel);
      form.append(
        "portal_features",
        JSON.stringify(features.filter((f) => f.title.trim() || f.description.trim())),
      );
      if (heroImageFile) form.append("portal_hero_image", heroImageFile);

      const res = await updateMyInstitutionBranding(form);
      saveInstitutionContext(res.institution, false);
      setHeroImageFile(null);
      toast({ title: "Institution website content saved" });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Save failed", description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading website content...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe2 className="h-5 w-5" />
          Public institution website
        </CardTitle>
        <CardDescription>
          Customize colors and copy for your public site. Leave text fields blank to use smart defaults from your
          institution profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <InstitutionWebsiteColorControls
            value={portalColors}
            onChange={setPortalColors}
            institutionName={institutionName}
          />

          <div className="space-y-4 border-t pt-4">
            <div>
              <Label>Tagline</Label>
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Study. Learn. Succeed." />
            </div>
            <div>
              <Label>Hero headline</Label>
              <Input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="Welcome to your institution" />
            </div>
            <div>
              <Label>Hero subtitle</Label>
              <Textarea value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>About section</Label>
              <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={5} />
            </div>
            <div>
              <Label>Enroll button label</Label>
              <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Start enrollment" />
            </div>
            <div>
              <Label>Hero background image (optional)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setHeroImageFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Highlight features (up to 3)</Label>
            {features.map((feature, index) => (
              <div key={index} className="rounded-lg border p-3 space-y-2">
                <Input
                  value={feature.title}
                  onChange={(e) => {
                    const next = [...features];
                    next[index] = { ...next[index], title: e.target.value };
                    setFeatures(next);
                  }}
                  placeholder="Feature title"
                />
                <Textarea
                  value={feature.description}
                  onChange={(e) => {
                    const next = [...features];
                    next[index] = { ...next[index], description: e.target.value };
                    setFeatures(next);
                  }}
                  placeholder="Short description"
                  rows={2}
                />
              </div>
            ))}
            {features.length < 3 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setFeatures((f) => [...f, emptyFeature()])}>
                <Plus className="mr-2 h-4 w-4" />
                Add feature
              </Button>
            )}
            {features.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={() => setFeatures((f) => f.slice(0, -1))}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove last feature
              </Button>
            )}
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save website content"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default InstitutionPortalContentSettings;
