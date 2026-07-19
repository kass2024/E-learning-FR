import { useState, FormEvent, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import InstitutionPortalShell from "@/components/institution-portal/InstitutionPortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { getInstitutionBySignupSlug, loginUnified, type PlatformInstitutionInfo } from "@/api/axios";
import { useToast } from "@/components/ui/use-toast";
import { HUB, dashboardPathForRole } from "@/lib/hubConfig";
import { saveInstitutionContext, refreshInstitutionBrandingFromApi, getStoredInstitution, rememberInstitutionLoginPath } from "@/lib/institutionContext";
import { warmupDashboardAfterLogin } from "@/lib/loginDashboardWarmup";
import { invalidateDashboardCache } from "@/lib/dashboardCache";
import { clearAdminImpersonation } from "@/lib/adminImpersonation";
import { cn } from "@/lib/utils";

const PERKS = [
  "Access courses, live classes, and materials",
  "Track progress from your personal dashboard",
  "Secure sign-in for learners, instructors, and staff",
];

const Login = () => {
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const institutionSlugParam = (routeSlug || "").trim().toLowerCase();
  const isInstitutionLocked = Boolean(institutionSlugParam);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [lockedInstitution, setLockedInstitution] = useState<PlatformInstitutionInfo | null>(null);
  const [lockedInstitutionLoading, setLockedInstitutionLoading] = useState(isInstitutionLocked);
  const [lockedInstitutionError, setLockedInstitutionError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem("parrot_remember_email");
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    if (!isInstitutionLocked) return;
    let mounted = true;
    setLockedInstitutionLoading(true);
    setLockedInstitutionError(null);
    getInstitutionBySignupSlug(institutionSlugParam)
      .then((res) => {
        if (!mounted) return;
        setLockedInstitution(res.institution);
      })
      .catch(() => {
        if (!mounted) return;
        setLockedInstitutionError("This login link is invalid or the institution is not available.");
      })
      .finally(() => {
        if (mounted) setLockedInstitutionLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isInstitutionLocked, institutionSlugParam]);

  useEffect(() => {
    if (!isInstitutionLocked || !lockedInstitution) return;
    document.title = `Sign in – ${lockedInstitution.name}`;
    return () => {
      document.title = HUB.name;
    };
  }, [isInstitutionLocked, lockedInstitution]);

  const inputClass = (opts?: { error?: boolean; success?: boolean }) =>
    cn(
      "h-12 rounded-lg pl-11 pr-4 border bg-white text-slate-900 placeholder:text-slate-400",
      "transition-all duration-200 focus-visible:ring-2",
      isInstitutionLocked
        ? "focus-visible:ring-[var(--institution-primary)]/20 focus-visible:border-[var(--institution-primary)]"
        : "focus-visible:ring-[#1F8A4C]/20 focus-visible:border-[#1F8A4C]",
      opts?.error && "border-red-300 focus-visible:ring-red-200",
      opts?.success && "border-emerald-300 focus-visible:ring-emerald-200",
      !opts?.error && !opts?.success && "border-slate-200 hover:border-slate-300",
    );

  const completeLogin = async (data: Awaited<ReturnType<typeof loginUnified>>) => {
    const role = data?.role as string | undefined;
    const user = data?.user as Record<string, unknown> | undefined;
    const institution = (data as { institution?: unknown })?.institution;
    const roleLower = String(role ?? "").toLowerCase();
    const isMainAdmin =
      roleLower === "partner_company" ? false : Boolean((data as { is_main_admin?: boolean })?.is_main_admin);

    clearAdminImpersonation();
    invalidateDashboardCache();
    saveInstitutionContext(
      isMainAdmin ? null : (institution as Parameters<typeof saveInstitutionContext>[0]),
      isMainAdmin,
    );

    if (role) {
      localStorage.setItem("parrot_user_role", String(role).toLowerCase().trim());
      localStorage.setItem("parrot_login_success", "1");
    }

    if (user) {
      let displayName = "";
      if (role === "learner") {
        const first = (user.first_name as string) ?? "";
        const last = (user.last_name as string) ?? "";
        displayName = `${first} ${last}`.trim();
        if (user.id) {
          localStorage.setItem("parrot_student_id", String(user.id));
        }
      } else {
        displayName = (user.name as string) ?? "";
      }

      if (displayName) {
        localStorage.setItem("parrot_user_name", displayName);
      }
      if (user.email) {
        localStorage.setItem("parrot_user_email", String(user.email));
      }
      const avatar = (user.avatar as string | undefined)?.trim();
      if (avatar) {
        localStorage.setItem("parrot_user_avatar", avatar);
      } else {
        localStorage.removeItem("parrot_user_avatar");
      }
    }

    if (remember) {
      localStorage.setItem("parrot_remember_email", email);
    } else {
      localStorage.removeItem("parrot_remember_email");
    }

    if (roleLower === "partner_company") {
      const slug =
        (isInstitutionLocked ? institutionSlugParam : null) ||
        getStoredInstitution()?.slug?.trim().toLowerCase() ||
        (institution as { slug?: string } | undefined)?.slug?.trim().toLowerCase();
      if (slug) {
        rememberInstitutionLoginPath(slug);
      }
    }

    warmupDashboardAfterLogin(roleLower || "learner");

    navigate(dashboardPathForRole(role || "learner"));

    void refreshInstitutionBrandingFromApi(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await loginUnified(email, password, {
        platformInstitutionId: lockedInstitution?.id ?? null,
        institutionSlug: isInstitutionLocked ? institutionSlugParam : null,
      });
      await completeLogin(data);
    } catch (err: unknown) {
      const axiosErr = err as {
        code?: string;
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const status = axiosErr.response?.status;
      const apiMessage = axiosErr.response?.data?.message;
      let message = apiMessage;

      const isNetworkError =
        !axiosErr.response &&
        (axiosErr.code === "ERR_NETWORK" ||
          /ECONNREFUSED|Network Error|proxy error/i.test(axiosErr.message ?? ""));

      if (!message && isNetworkError) {
        message = import.meta.env.DEV
          ? "Cannot reach the API server. Start the backend with: npm run dev:api (or npm run dev:full from parrot-frontend)."
          : "Cannot reach the login server. The API may be misconfigured on hosting — contact support.";
      } else if (!message && !axiosErr.response) {
        message = "Cannot reach the login server. The API may be misconfigured on hosting — contact support.";
      } else if (!message && status === 404) {
        message =
          "Login server not found (404). Ensure the API subdomain is deployed and the URL includes /public/index.php.";
      } else if (!message) {
        message = "Login failed. Please check your credentials.";
      }

      setError(message);
      toast({ variant: "destructive", title: "Login error", description: message });
    } finally {
      setLoading(false);
    }
  };

  const loginForm = (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-slate-700 font-medium">
          Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass({
              success: email.includes("@") && email.includes("."),
              error: !!error && !email,
            })}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-slate-700 font-medium">
            Password
          </Label>
          {!isInstitutionLocked && (
            <NavLink
              to="/forgot-password"
              className="text-xs font-semibold text-[#1F8A4C] hover:text-[#1F8A4C] transition-colors"
            >
              Forgot password?
            </NavLink>
          )}
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            className={inputClass({ error: !!error })}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1F8A4C] transition-colors"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Checkbox
          id="remember"
          checked={remember}
          onCheckedChange={(checked) => setRemember(Boolean(checked))}
          className={
            isInstitutionLocked
              ? "data-[state=checked]:bg-[var(--institution-button-bg)] data-[state=checked]:border-[var(--institution-button-bg)]"
              : "data-[state=checked]:bg-[#1F8A4C] data-[state=checked]:border-[#1F8A4C]"
          }
        />
        <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer select-none">
          Keep me logged in
        </label>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className={
          isInstitutionLocked
            ? "w-full rounded-md bg-[var(--institution-button-bg)] text-[var(--institution-button-text)] hover:opacity-90 font-bold h-12 text-base"
            : "w-full rounded-md bg-[#1F8A4C] hover:bg-[#166B3A] text-white font-bold h-12 text-base"
        }
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </span>
        ) : (
          "Log In"
        )}
      </Button>
    </form>
  );

  const showInstitutionShell = isInstitutionLocked && Boolean(lockedInstitution) && !lockedInstitutionError;

  if (isInstitutionLocked) {
    return (
      <div className="min-h-screen bg-slate-50">
        {lockedInstitutionLoading ? (
          <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#1F8A4C]" />
          </div>
        ) : lockedInstitutionError ? (
          <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
            <h1 className="text-xl font-bold text-slate-800">Login link unavailable</h1>
            <p className="mt-2 max-w-md text-slate-600">{lockedInstitutionError}</p>
          </div>
        ) : showInstitutionShell && lockedInstitution ? (
          <InstitutionPortalShell institution={lockedInstitution} activeSection="login" compactHero>
            <div className="container mx-auto max-w-lg px-4 py-8 sm:py-10">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
              >
                <div className="h-1 bg-[var(--institution-primary)]" />
                <div className="p-6 md:p-8">
                  <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-[var(--institution-primary)]">Welcome Back!</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Sign in to your account at {lockedInstitution.name}.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                      <p className="text-sm font-medium text-red-700">{error}</p>
                    </div>
                  )}

                  {loginForm}

                  <div className="mt-8 border-t border-slate-100 pt-6 text-center">
                    <p className="mb-1 text-sm text-slate-500">Don&apos;t have an account yet?</p>
                    <NavLink
                      to={`/join/${institutionSlugParam}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--institution-primary)] hover:opacity-80 transition-colors group"
                    >
                      Sign Up
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </NavLink>
                  </div>
                </div>
              </motion.div>
            </div>
          </InstitutionPortalShell>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="public-page-offset pb-16 px-4 min-h-screen flex items-start justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl mt-6 md:mt-10"
        >
          {/* Apex-style login card */}
          <div className="rounded-2xl overflow-hidden shadow-2xl bg-white border border-slate-200">
            <div className="grid md:grid-cols-2">
              {/* Left panel — welcome message */}
              <div className="bg-gradient-to-br from-[#1F8A4C] to-[#166B3A] p-8 md:p-10 text-white flex flex-col justify-center">
                <h1 className="text-2xl md:text-3xl font-bold mb-3">Welcome Back!</h1>
                <p className="text-white/85 leading-relaxed mb-8">
                  It&apos;s great to see you again! Log in to continue your learning journey and pick up right where
                  you left off.
                </p>
                <ul className="space-y-3">
                  {PERKS.map((text) => (
                    <li key={text} className="flex items-start gap-3 text-sm text-white/90">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#1F8A4C]" />
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right panel — form */}
              <div className="p-8 md:p-10">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#1F8A4C]">Log In</h2>
                  <p className="text-sm text-slate-500 mt-1">Enter your credentials to access {HUB.name}.</p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
                  >
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-700">{error}</p>
                  </motion.div>
                )}

                {loginForm}

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <p className="text-sm text-slate-500 mb-1">Don&apos;t have an account yet?</p>
                  <NavLink
                    to="/signup"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1F8A4C] hover:text-[#1F8A4C] transition-colors group"
                  >
                    Sign Up
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </NavLink>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
