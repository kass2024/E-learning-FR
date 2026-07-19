import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  getInstitutionSignupConfig,
  registerInstitutionSignup,
  validateInstitutionPromoCode,
} from "@/api/axios";
import {
  Building2,
  Loader2,
  Mail,
  Globe,
  MapPin,
  Phone,
  User,
  Upload,
  Sparkles,
  Shield,
  CheckCircle2,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const InstitutionSignup = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [feeCents, setFeeCents] = useState(9900);
  const [currency, setCurrency] = useState("usd");
  const [institutionName, setInstitutionName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [promoValid, setPromoValid] = useState<boolean | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  const verifyPromoCode = async (code: string): Promise<boolean> => {
    const trimmed = code.trim();
    if (!trimmed) {
      setPromoValid(null);
      return false;
    }
    setCheckingPromo(true);
    try {
      const res = await validateInstitutionPromoCode(trimmed);
      setPromoValid(res.valid);
      return res.valid;
    } catch {
      setPromoValid(false);
      return false;
    } finally {
      setCheckingPromo(false);
    }
  };

  useEffect(() => {
    if (!promoCode.trim()) {
      setPromoValid(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void verifyPromoCode(promoCode);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [promoCode]);

  useEffect(() => {
    getInstitutionSignupConfig()
      .then((cfg) => {
        setFeeCents(cfg.signup_fee_cents);
        setCurrency(cfg.currency);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (params.get("cancelled")) {
      toast({ title: "Payment cancelled", description: "You can try again when ready." });
    }
  }, [params, toast]);

  const checkPromo = async () => {
    if (!promoCode.trim()) {
      setPromoValid(null);
      return;
    }
    const valid = await verifyPromoCode(promoCode);
    if (!valid) {
      toast({ variant: "destructive", title: "Invalid promo code", description: "This code is invalid or expired." });
    }
  };

  const handleLogoChange = (file: File | null) => {
    setLogo(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let skipPayment = false;
      if (promoCode.trim()) {
        const valid = promoValid === true || (await verifyPromoCode(promoCode));
        if (!valid) {
          toast({
            variant: "destructive",
            title: "Invalid promo code",
            description: "Enter a valid promo code to skip payment, or remove it to pay by card.",
          });
          return;
        }
        skipPayment = true;
      }

      const form = new FormData();
      form.append("institution_name", institutionName);
      form.append("first_name", firstName);
      form.append("last_name", lastName);
      form.append("contact_email", email);
      form.append("contact_phone", phone);
      form.append("website", website);
      form.append("address", address);
      if (promoCode.trim()) form.append("promo_code", promoCode.trim());
      if (logo) form.append("logo", logo);

      const res = await registerInstitutionSignup(form);
      if (res.requires_payment && res.checkout_url && !skipPayment) {
        window.location.href = res.checkout_url;
        return;
      }
      toast({
        title: "Registration submitted",
        description: res.message ?? "Check your email for login credentials. Your account will activate after admin approval.",
      });
      navigate(skipPayment ? "/institution-signup/success?promo=1" : "/institution-signup/success");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Registration failed", description: msg || "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const feeLabel = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(feeCents / 100);

  const usingPromo = promoValid === true;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <main className="container max-w-4xl public-page-offset pb-10 md:pb-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Badge className="mb-4 bg-[#0070D0]/10 text-[#0070D0] hover:bg-[#0070D0]/10 border-[#0070D0]/20">
            <Sparkles className="h-3 w-3 mr-1" /> Partner program
          </Badge>
          <h1 className="text-3xl md:text-4xl font-black text-[#0058A8] tracking-tight">
            Register your institution
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-base">
            Join the platform as a partner institution. We&apos;ll email your login credentials — no password needed on this form.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/70 bg-white shadow-[0_20px_60px_rgba(37,77,129,0.08)] overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#0070D0] to-[#0058A8] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Institution details</h2>
                  <p className="text-white/75 text-sm">All fields marked with your institution branding</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-1.5 text-[#0058A8] font-medium">
                    <Building2 className="h-3.5 w-3.5" /> Institution name
                  </Label>
                  <Input required className="mt-1.5 rounded-xl h-11" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="Acme Language Academy" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="flex items-center gap-1.5 text-[#0058A8] font-medium">
                      <User className="h-3.5 w-3.5" /> First name
                    </Label>
                    <Input required className="mt-1.5 rounded-xl h-11" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[#0058A8] font-medium">Last name</Label>
                    <Input className="mt-1.5 rounded-xl h-11" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="flex items-center gap-1.5 text-[#0058A8] font-medium">
                      <Mail className="h-3.5 w-3.5" /> Contact email
                    </Label>
                    <Input type="email" required className="mt-1.5 rounded-xl h-11" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@yourinstitution.edu" />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5 text-[#0058A8] font-medium">
                      <Phone className="h-3.5 w-3.5" /> Phone
                    </Label>
                    <Input className="mt-1.5 rounded-xl h-11" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="flex items-center gap-1.5 text-[#0058A8] font-medium">
                      <Globe className="h-3.5 w-3.5" /> Website
                    </Label>
                    <Input type="url" className="mt-1.5 rounded-xl h-11" placeholder="https://yourinstitution.edu" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[#0058A8] font-medium">Institution logo</Label>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)} />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className={cn(
                        "mt-1.5 flex w-full items-center gap-3 rounded-xl border-2 border-dashed px-4 h-11 transition-colors",
                        logoPreview ? "border-[#0070D0]/40 bg-[#0070D0]/5" : "border-muted-foreground/25 hover:border-[#0070D0]/40 hover:bg-muted/30",
                      )}
                    >
                      {logoPreview ? (
                        <img src={logoPreview} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground truncate">{logo?.name ?? "Upload logo (optional)"}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-1.5 text-[#0058A8] font-medium">
                    <MapPin className="h-3.5 w-3.5" /> Address
                  </Label>
                  <Input className="mt-1.5 rounded-xl h-11" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>

                <div className="rounded-xl border bg-slate-50/80 p-4 space-y-3">
                  <Label className="text-[#0058A8] font-medium">Promo code (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      className="rounded-xl h-11 font-mono uppercase"
                      value={promoCode}
                      onChange={(e) => { setPromoCode(e.target.value); setPromoValid(null); }}
                      placeholder="PARTNER-DEMO-2026"
                    />
                    <Button type="button" variant="outline" className="rounded-xl shrink-0 h-11" onClick={() => void checkPromo()} disabled={checkingPromo}>
                      {checkingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                  {promoValid === true && (
                    <p className="text-sm text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Promo accepted — skips Stripe payment
                    </p>
                  )}
                  {promoValid === false && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" /> Invalid promo code
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-[#0070D0]/5 border border-[#0070D0]/15 p-4 flex gap-3">
                <Mail className="h-5 w-5 text-[#0070D0] shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-[#0058A8]">Credentials sent by email</p>
                  <p className="text-muted-foreground mt-0.5">
                    We&apos;ll create your account and email login credentials to <strong>{email || "your contact email"}</strong>. No password required here.
                  </p>
                </div>
              </div>

              {!usingPromo && (
                <div className="flex items-center justify-between rounded-xl border px-4 py-3 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-[#0070D0]" />
                    <span>Platform onboarding fee</span>
                  </div>
                  <span className="font-bold text-[#0058A8]">{feeLabel}</span>
                </div>
              )}

              {usingPromo && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Promo code applied — <strong>no payment required</strong></span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#0070D0] hover:bg-[#0058A8] text-base font-semibold shadow-lg shadow-[#0070D0]/20"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : usingPromo ? "Submit registration" : `Continue to payment · ${feeLabel}`}
              </Button>
            </form>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="font-bold text-[#0058A8] mb-3">What happens next</h3>
              <ol className="space-y-3 text-sm">
                {[
                  "Submit your institution details",
                  "Receive login credentials by email",
                  usingPromo ? "Wait for admin approval" : "Complete Stripe payment",
                  "Admin activates your partner dashboard",
                ].map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0070D0] text-white text-xs font-bold">{i + 1}</span>
                    <span className="text-muted-foreground pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
              <Shield className="h-5 w-5 text-[#0070D0] mb-2" />
              <p>Accounts are reviewed by our team before full access. You can customize branding and SMTP after activation.</p>
            </div>
          </motion.aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default InstitutionSignup;
