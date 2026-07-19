import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import InstitutionPortalShell from "@/components/institution-portal/InstitutionPortalShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInstitutionPortal } from "@/hooks/useInstitutionPortal";
import { HUB } from "@/lib/hubConfig";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Clock3,
  Globe,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";

const InstitutionPortalHome = () => {
  const { slug: routeSlug = "" } = useParams<{ slug: string }>();
  const location = useLocation();
  const { data, loading, error, institution } = useInstitutionPortal(routeSlug);
  const portal = institution?.portal;

  useEffect(() => {
    if (!institution) return;
    document.title = institution.name;
    return () => {
      document.title = HUB.name;
    };
  }, [institution]);

  // Ensure deep links like /i/slug#contact scroll after content paints.
  useEffect(() => {
    if (loading || !data) return;
    const hash = (location.hash || "").replace(/^#/, "").trim().toLowerCase();
    if (!hash) return;
    const t = window.setTimeout(() => {
      if (hash === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [loading, data, location.hash]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-9 w-9 animate-spin text-[var(--institution-primary,#0070D0)]" />
      </div>
    );
  }

  if (error || !institution || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h1 className="text-xl font-bold text-slate-800">Website unavailable</h1>
        <p className="mt-2 max-w-md text-slate-600">{error ?? "This institution link is not valid."}</p>
      </div>
    );
  }

  const slug = institution.slug;
  const joinUrl = `/join/${slug}`;
  const loginUrl = `/login/${slug}`;
  const features = (portal?.features ?? []).filter((f) => f.title.trim() || f.description.trim());
  const websiteHref = institution.website
    ? institution.website.startsWith("http")
      ? institution.website
      : `https://${institution.website}`
    : null;

  return (
    <InstitutionPortalShell institution={institution} activeSection="home">
      {/* Stats — this institution only */}
      <section className="border-b border-slate-200 bg-white py-8" aria-label="Institution overview">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
              <p className="text-3xl font-bold text-[var(--institution-primary)]">{data.stats.programs_count}</p>
              <p className="mt-1 text-sm text-slate-600">Programs</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
              <p className="text-3xl font-bold text-[var(--institution-primary)]">{data.stats.courses_count}</p>
              <p className="mt-1 text-sm text-slate-600">Courses</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center sm:col-span-1">
              <p className="text-3xl font-bold text-[var(--institution-primary)]">24/7</p>
              <p className="mt-1 text-sm text-slate-600">Online access</p>
            </div>
          </div>
        </div>
      </section>

      {/* Programs — filtered by platform_institution_id on API */}
      <section id="programs" className="scroll-mt-24 py-14 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--institution-primary)]">Our programs</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Learning paths at {institution.name}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Only programs and courses published by {institution.name} appear here.
            </p>
          </div>

          {data.programs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-slate-500">
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                Programs will appear here once published by {institution.name}.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {data.programs.map((program, index) => {
                const courseCount = program.courses?.length ?? 0;
                return (
                  <motion.div
                    key={program.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="h-full border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-start justify-between gap-3 text-lg text-[var(--institution-primary)]">
                          <span className="inline-flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 shrink-0" />
                            {program.name}
                          </span>
                          <span className="shrink-0 rounded-full bg-[var(--institution-primary)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--institution-primary)]">
                            {courseCount} {courseCount === 1 ? "course" : "courses"}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {program.description && (
                          <p className="text-sm text-slate-600 line-clamp-3">{program.description}</p>
                        )}
                        {courseCount > 0 ? (
                          <ul className="space-y-1.5 text-sm text-slate-700">
                            {program.courses!.slice(0, 6).map((course) => (
                              <li key={course.id} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--institution-primary)]" />
                                <span>
                                  {course.title}
                                  {course.duration ? (
                                    <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-slate-500">
                                      <Clock3 className="h-3 w-3" />
                                      {course.duration}
                                    </span>
                                  ) : null}
                                </span>
                              </li>
                            ))}
                            {courseCount > 6 && (
                              <li className="text-xs text-slate-500">+{courseCount - 6} more courses</li>
                            )}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-500">Courses coming soon.</p>
                        )}
                        <Button
                          asChild
                          size="sm"
                          className="rounded-full bg-[var(--institution-button-bg)] text-[var(--institution-button-text)] hover:opacity-90"
                        >
                          <NavLink to={joinUrl}>
                            Enroll
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </NavLink>
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="mt-10 text-center">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[var(--institution-button-bg)] text-[var(--institution-button-text)] hover:opacity-90"
            >
              <NavLink to={joinUrl}>
                {portal?.cta_label ?? "Start enrollment"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </NavLink>
            </Button>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      {features.length > 0 && (
        <section id="why-us" className="border-y border-slate-200 bg-white py-14 sm:py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-10 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-[var(--institution-primary)]">Why choose us</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">What {institution.name} offers</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {features.map((feature, index) => (
                <div key={`${feature.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
                  <Sparkles className="mb-3 h-6 w-6 text-[var(--institution-accent,var(--institution-primary))]" />
                  <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About — this institution */}
      <section id="about" className="scroll-mt-24 py-14 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[var(--institution-primary)]">About us</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{institution.name}</h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600 whitespace-pre-line">{portal?.about}</p>
            </div>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-[var(--institution-primary)]">At a glance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-900">Institution:</span> {institution.name}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Published programs:</span> {data.stats.programs_count}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Active courses:</span> {data.stats.courses_count}
                </p>
                {institution.address && (
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--institution-primary)]" />
                    {institution.address}
                  </p>
                )}
                {websiteHref && (
                  <p className="flex items-center gap-2">
                    <Globe className="h-4 w-4 shrink-0 text-[var(--institution-primary)]" />
                    <a href={websiteHref} target="_blank" rel="noreferrer" className="hover:underline">
                      {institution.website?.replace(/^https?:\/\//, "")}
                    </a>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact — this institution only */}
      <section id="contact" className="scroll-mt-24 bg-[var(--institution-hero-bg)] py-14 text-white sm:py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-white/70">Contact</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Get in touch with {institution.name}</h2>
              <p className="mt-3 max-w-xl text-white/85">
                Reach the {institution.name} team for enrollment questions, or create your learner account to get
                started.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-[var(--institution-button-bg)] text-[var(--institution-button-text)] hover:opacity-90"
                >
                  <NavLink to={joinUrl}>{portal?.cta_label ?? "Register now"}</NavLink>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                >
                  <NavLink to={loginUrl}>Sign in</NavLink>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <p className="text-sm font-semibold text-white">Contact details</p>
              <ul className="mt-4 space-y-3 text-sm text-white/90">
                {institution.contact_email && (
                  <li className="flex items-center gap-3">
                    <Mail className="h-4 w-4 shrink-0 text-white/80" />
                    <a href={`mailto:${institution.contact_email}`} className="underline-offset-2 hover:underline">
                      {institution.contact_email}
                    </a>
                  </li>
                )}
                {institution.contact_phone && (
                  <li className="flex items-center gap-3">
                    <Phone className="h-4 w-4 shrink-0 text-white/80" />
                    <a href={`tel:${institution.contact_phone}`} className="underline-offset-2 hover:underline">
                      {institution.contact_phone}
                    </a>
                  </li>
                )}
                {institution.address && (
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
                    <span>{institution.address}</span>
                  </li>
                )}
                {websiteHref && (
                  <li className="flex items-center gap-3">
                    <Globe className="h-4 w-4 shrink-0 text-white/80" />
                    <a href={websiteHref} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                      {institution.website?.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                )}
                {!institution.contact_email && !institution.contact_phone && !institution.address && !websiteHref && (
                  <li className="text-white/75">
                    Contact information will appear here once {institution.name} publishes it.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </InstitutionPortalShell>
  );
};

export default InstitutionPortalHome;
