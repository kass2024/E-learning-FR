import { FormEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  getPlatformInstitution,
  getMeetingProviderStatus,
  resetInstitutionOwnerPassword,
  resendInstitutionCredentials,
  sendInstitutionTestMail,
  updatePlatformInstitution,
  uploadPlatformInstitutionLogo,
} from "@/api/axios";
import { getPublicStorageUrl } from "@/lib/apiConfig";
import { buildInstitutionLearnerLoginUrl } from "@/lib/institutionSignupLink";
import { Loader2, Mail, KeyRound } from "lucide-react";
import InstitutionRegistrationLinkCard from "@/components/dashboard/InstitutionRegistrationLinkCard";
import { InstitutionWebsiteColorControls } from "@/components/dashboard/InstitutionWebsiteColorControls";
import { emptyPortalColorDraft, type PortalColorDraft } from "@/lib/institutionPortal";

type Props = {
  institutionId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

const InstitutionAdminEditDialog = ({ institutionId, open, onOpenChange, onSaved }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [mailUseCustom, setMailUseCustom] = useState(false);
  const [mailHost, setMailHost] = useState("");
  const [mailPort, setMailPort] = useState("587");
  const [mailUsername, setMailUsername] = useState("");
  const [mailPassword, setMailPassword] = useState("");
  const [mailEncryption, setMailEncryption] = useState("tls");
  const [mailFromAddress, setMailFromAddress] = useState("");
  const [mailFromName, setMailFromName] = useState("");
  const [mailEhloDomain, setMailEhloDomain] = useState("");
  const [mailPasswordSet, setMailPasswordSet] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [ownerStatus, setOwnerStatus] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [meetingProvider, setMeetingProvider] = useState<"zoom" | "daily">("daily");
  const [dailyConfigured, setDailyConfigured] = useState(false);
  const [dailyDomain, setDailyDomain] = useState<string | null>(null);
  const [portalColors, setPortalColors] = useState<PortalColorDraft>(emptyPortalColorDraft());
  const [portalTagline, setPortalTagline] = useState("");
  const [portalHeroTitle, setPortalHeroTitle] = useState("");
  const [portalHeroSubtitle, setPortalHeroSubtitle] = useState("");
  const [portalCtaLabel, setPortalCtaLabel] = useState("");

  useEffect(() => {
    if (!open) return;
    getMeetingProviderStatus()
      .then((res) => {
        setDailyConfigured(Boolean(res.providers?.daily?.configured));
        setDailyDomain(res.providers?.daily?.domain ?? null);
        const current = String(res.main_platform_meeting_provider || "daily").toLowerCase();
        setMeetingProvider(current === "zoom" ? "zoom" : "daily");
      })
      .catch(() => {
        setDailyConfigured(false);
        setDailyDomain(null);
      });
  }, [open]);

  useEffect(() => {
    if (!open || !institutionId) return;
    setLoading(true);
    getPlatformInstitution(institutionId)
      .then((inst) => {
        setName(inst.name ?? "");
        setSlug(inst.slug ?? "");
        setWebsite(inst.website ?? "");
        setAddress(inst.address ?? "");
        setAdminNotes(inst.admin_notes ?? "");
        setLogoUrl(getPublicStorageUrl(inst.logo_url ?? null));
        setMailUseCustom(Boolean(inst.mail_use_custom));
        setMailHost(inst.mail_host ?? "");
        setMailPort(String(inst.mail_port ?? 587));
        setMailUsername(inst.mail_username ?? "");
        setMailPassword("");
        setMailEncryption(inst.mail_encryption ?? "tls");
        setMailFromAddress(inst.mail_from_address ?? "");
        setMailFromName(inst.mail_from_name ?? "");
        setMailEhloDomain(inst.mail_ehlo_domain ?? "");
        setMailPasswordSet(Boolean(inst.mail_password_set));
        setTestTo(inst.contact_email ?? "");
        setOwnerEmail((inst as { owner?: { email?: string; status?: string } }).owner?.email ?? inst.contact_email ?? "");
        setContactPhone(inst.contact_phone ?? "");
        setOwnerStatus((inst as { owner?: { status?: string } }).owner?.status ?? "none");
        setOwnerPassword("");
        setGeneratedPassword(null);
        setMeetingProvider(((inst as { meeting_provider?: string }).meeting_provider ?? "daily") as "zoom" | "daily");
        const portal = inst.portal;
        setPortalColors(emptyPortalColorDraft(portal ?? null));
        setPortalTagline(portal?.tagline ?? "");
        setPortalHeroTitle(portal?.hero_title ?? "");
        setPortalHeroSubtitle(portal?.hero_subtitle ?? "");
        setPortalCtaLabel(portal?.cta_label ?? "");
      })
      .catch(() => toast({ variant: "destructive", title: "Failed to load institution" }))
      .finally(() => setLoading(false));
  }, [open, institutionId, toast]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!institutionId) return;
    if (!ownerEmail.trim()) {
      toast({ variant: "destructive", title: "Login email is required" });
      return;
    }
    setSaving(true);
    try {
      if (logoFile) {
        const logoRes = await uploadPlatformInstitutionLogo(institutionId, logoFile);
        setLogoUrl(getPublicStorageUrl(logoRes.logo_url));
        setLogoFile(null);
      }

      const payload: Record<string, unknown> = {
        name,
        contact_email: ownerEmail.trim(),
        contact_phone: contactPhone.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
        admin_notes: adminNotes,
        mail_use_custom: mailUseCustom,
        mail_host: mailHost,
        mail_port: Number(mailPort) || 587,
        mail_username: mailUsername,
        mail_encryption: mailEncryption,
        mail_from_address: mailFromAddress,
        mail_from_name: mailFromName,
        mail_ehlo_domain: mailEhloDomain,
        portal_primary_color: portalColors.primary_color,
        portal_accent_color: portalColors.accent_color,
        portal_hero_bg_color: portalColors.hero_bg_color,
        portal_button_bg_color: portalColors.button_bg_color,
        portal_button_text_color: portalColors.button_text_color,
        portal_tagline: portalTagline.trim() || null,
        portal_hero_title: portalHeroTitle.trim() || null,
        portal_hero_subtitle: portalHeroSubtitle.trim() || null,
        portal_cta_label: portalCtaLabel.trim() || null,
      };
      if (mailPassword.trim()) payload.mail_password = mailPassword;

      await updatePlatformInstitution(institutionId, payload);
      toast({ title: "Institution settings saved" });
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Save failed", description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleTestMail = async () => {
    if (!institutionId) return;
    setTesting(true);
    try {
      const res = await sendInstitutionTestMail(institutionId, testTo || undefined);
      toast({ title: res.message ?? "Test email sent" });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Test failed", description: msg });
    } finally {
      setTesting(false);
    }
  };

  const handleResetOwnerPassword = async (sendEmail: boolean) => {
    if (!institutionId) return;
    setResettingPassword(true);
    setGeneratedPassword(null);
    try {
      const res = await resetInstitutionOwnerPassword(institutionId, {
        password: ownerPassword.trim() || undefined,
        sendEmail,
      });
      if (res.password) {
        setGeneratedPassword(res.password);
        setOwnerPassword(res.password);
      }
      toast({
        title: sendEmail ? "Password reset & emailed" : "Password reset",
        description: res.message,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Password reset failed", description: msg });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleResendCredentials = async () => {
    if (!institutionId) return;
    setResettingPassword(true);
    setGeneratedPassword(null);
    try {
      const res = await resendInstitutionCredentials(institutionId);
      if (res.password) setGeneratedPassword(res.password);
      toast({ title: "Credentials sent", description: res.message });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Resend failed", description: msg });
    } finally {
      setResettingPassword(false);
    }
  };

  const loginUrl = slug ? buildInstitutionLearnerLoginUrl(slug) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Manage institution</DialogTitle>
          <DialogDescription>
            Update branding, website colors, logo, admin notes, and optional per-institution SMTP settings.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
        ) : (
          <form onSubmit={handleSave}>
            <Tabs defaultValue="branding" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="smtp">SMTP</TabsTrigger>
              </TabsList>

              <TabsContent value="branding" className="space-y-4">
                <InstitutionRegistrationLinkCard slug={slug} institutionName={name} compact className="rounded-xl border bg-[#0070D0]/[0.03] p-4" />
                <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-16 w-16 rounded-xl object-cover border shadow-sm" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#0070D0] text-white font-bold text-xl">
                      {name.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1">
                    <Label>Institution logo</Label>
                    <Input type="file" accept="image/*" className="mt-1.5" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG or WebP · max 5 MB</p>
                  </div>
                </div>
                <div>
                  <Label>Institution name</Label>
                  <Input className="rounded-xl" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Website</Label>
                    <Input className="rounded-xl" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input className="rounded-xl" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Admin notes (internal)</Label>
                  <Input className="rounded-xl" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Visible only to platform admins" />
                </div>
                <div className="rounded-xl border border-[#0070D0]/15 bg-[#0070D0]/[0.03] p-4 space-y-2">
                  <p className="text-sm font-medium text-[#0070D0]">Meeting platform</p>
                  <p className="text-xs text-muted-foreground">
                    Partners use the shared main-admin setting from Settings → Live meetings
                    {dailyConfigured && meetingProvider === "daily" && dailyDomain
                      ? ` (Daily · ${dailyDomain})`
                      : ""}
                    . Current: <span className="font-semibold capitalize">{meetingProvider}</span>
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="website" className="space-y-4">
                <InstitutionWebsiteColorControls
                  value={portalColors}
                  onChange={setPortalColors}
                  institutionName={name || "Institution"}
                />
                <div className="space-y-3 rounded-xl border p-4">
                  <p className="text-sm font-semibold">Homepage copy (optional)</p>
                  <div>
                    <Label>Tagline</Label>
                    <Input
                      className="rounded-xl"
                      value={portalTagline}
                      onChange={(e) => setPortalTagline(e.target.value)}
                      placeholder="Study. Learn. Succeed."
                    />
                  </div>
                  <div>
                    <Label>Hero title</Label>
                    <Input
                      className="rounded-xl"
                      value={portalHeroTitle}
                      onChange={(e) => setPortalHeroTitle(e.target.value)}
                      placeholder={`Welcome to ${name || "your institution"}`}
                    />
                  </div>
                  <div>
                    <Label>Hero subtitle</Label>
                    <Input
                      className="rounded-xl"
                      value={portalHeroSubtitle}
                      onChange={(e) => setPortalHeroSubtitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Enroll button label</Label>
                    <Input
                      className="rounded-xl"
                      value={portalCtaLabel}
                      onChange={(e) => setPortalCtaLabel(e.target.value)}
                      placeholder="Start enrollment"
                    />
                  </div>
                </div>
                {slug ? (
                  <p className="text-xs text-muted-foreground">
                    Preview:{" "}
                    <a
                      href={`/i/${slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-[#0070D0] underline-offset-2 hover:underline"
                    >
                      /i/{slug}
                    </a>
                  </p>
                ) : null}
              </TabsContent>

              <TabsContent value="login" className="space-y-4">
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <p className="text-sm font-medium">Partner owner account</p>
                  <p className="text-sm text-muted-foreground">
                    Institution partners sign in at their branded login page. Updating the login email also updates the owner account email.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Login email</Label>
                      <Input
                        type="email"
                        className="rounded-xl mt-1"
                        value={ownerEmail}
                        onChange={(e) => {
                          setOwnerEmail(e.target.value);
                          setTestTo(e.target.value);
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        className="rounded-xl mt-1"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+1 …"
                      />
                    </div>
                    <div>
                      <Label>Account status</Label>
                      <Input className="rounded-xl mt-1 capitalize" value={ownerStatus || "Not created yet"} readOnly />
                    </div>
                  </div>
                  {loginUrl ? (
                    <div>
                      <Label>Institution login URL</Label>
                      <Input className="rounded-xl mt-1 font-mono text-xs" value={loginUrl} readOnly />
                    </div>
                  ) : null}
                  <div>
                    <Label>New password</Label>
                    <Input
                      type="text"
                      className="rounded-xl mt-1 font-mono"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="Leave blank to generate a random password"
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters. Blank = auto-generate.</p>
                  </div>
                  {generatedPassword ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      Password set: <span className="font-mono font-semibold">{generatedPassword}</span>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      variant="default"
                      disabled={resettingPassword}
                      onClick={() => void handleResetOwnerPassword(false)}
                    >
                      {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                      Set password
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={resettingPassword}
                      onClick={() => void handleResetOwnerPassword(true)}
                    >
                      Set &amp; email owner
                    </Button>
                    <Button type="button" variant="outline" disabled={resettingPassword} onClick={() => void handleResendCredentials()}>
                      <Mail className="h-4 w-4 mr-2" />
                      Random &amp; email
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="smtp" className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">Use custom SMTP</p>
                    <p className="text-xs text-muted-foreground">Off = platform .env mail settings</p>
                  </div>
                  <Switch checked={mailUseCustom} onCheckedChange={setMailUseCustom} />
                </div>

                {mailUseCustom && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Host</Label>
                        <Input value={mailHost} onChange={(e) => setMailHost(e.target.value)} placeholder="smtp.example.com" />
                      </div>
                      <div>
                        <Label>Port</Label>
                        <Input value={mailPort} onChange={(e) => setMailPort(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label>Username</Label>
                      <Input value={mailUsername} onChange={(e) => setMailUsername(e.target.value)} />
                    </div>
                    <div>
                      <Label>Password {mailPasswordSet ? "(leave blank to keep)" : ""}</Label>
                      <Input type="password" value={mailPassword} onChange={(e) => setMailPassword(e.target.value)} autoComplete="new-password" />
                    </div>
                    <div>
                      <Label>Encryption</Label>
                      <Input value={mailEncryption} onChange={(e) => setMailEncryption(e.target.value)} placeholder="tls" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>From address</Label>
                        <Input value={mailFromAddress} onChange={(e) => setMailFromAddress(e.target.value)} />
                      </div>
                      <div>
                        <Label>From name</Label>
                        <Input value={mailFromName} onChange={(e) => setMailFromName(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label>EHLO domain (optional)</Label>
                      <Input value={mailEhloDomain} onChange={(e) => setMailEhloDomain(e.target.value)} />
                    </div>
                  </>
                )}

                <div className="flex gap-2 items-end pt-2">
                  <div className="flex-1">
                    <Label>Test recipient</Label>
                    <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="owner@institution.com" />
                  </div>
                  <Button type="button" variant="outline" onClick={handleTestMail} disabled={testing}>
                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InstitutionAdminEditDialog;
