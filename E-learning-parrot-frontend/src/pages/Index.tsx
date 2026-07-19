import { useEffect, useMemo, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import StarPromoBanner from "@/components/StarPromoBanner";
import { SectionHeader } from "@/components/home/SectionHeader";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/home/FadeIn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getCourses } from "@/api/axios";
import { formatCoursePrice } from "@/lib/apiConfig";
import { DEFAULT_IMAGE } from "@/lib/defaultImages";
import { getFeaturedCourseImage } from "@/lib/homeImages";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  EXAM_PROGRAMS,
  FEATURED_PROGRAM_FALLBACK,
  HOME_IMAGES,
  HOME_MISSION,
  HUB,
  LANGUAGE_PROGRAMS,
  LIVE_FEATURES,
  STATS,
  STUDENT_FEATURES,
  TESTIMONIALS,
} from "@/lib/homeContent";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Globe2,
  Headphones,
  Search,
  ShieldCheck,
  Star,
  Users,
  Video,
} from "lucide-react";

type CourseRow = {
  id: number;
  title: string;
  description?: string;
  price?: number | string | null;
  duration?: string | null;
  status?: string;
  image?: string | null;
};

const TRUST_ITEMS = [
  { icon: Headphones, label: "24/7 Online Support" },
  { icon: ShieldCheck, label: "Secure Stripe Payments" },
  { icon: Award, label: "Fully Accredited Programs" },
] as const;

const HERO_QUICK_LINKS: Array<{ label: string; to?: string; href?: string }> = [
  { label: "All Programs", to: "/courses" },
  { label: "Book meeting with us", to: "/meeting-registration" },
  { label: "About Us", to: "/about" },
  { label: "Get Started", to: "/signup" },
  { label: "Partner Institution Sign Up", to: "/institution-signup" },
];

const Index = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(true);
  const [heroSearch, setHeroSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    getCourses()
      .then((data) => {
        if (cancelled) return;
        const active = (Array.isArray(data) ? data : []).filter(
          (c) => (c.status ?? "Active").toLowerCase() !== "inactive"
        );
        setCourses(active);
        setUsingFallback(active.length === 0);
      })
      .catch(() => {
        if (cancelled) return;
        setCourses([]);
        setUsingFallback(true);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const featured = useMemo(() => {
    if (courses.length > 0) return courses.slice(0, 6);
    return [...FEATURED_PROGRAM_FALLBACK];
  }, [courses]);

  const handleHeroSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = heroSearch.trim();
    navigate(q ? `/courses?search=${encodeURIComponent(q)}` : "/courses");
  };

  return (
    <div className="min-h-screen bg-white">
      <StarPromoBanner />
      {/* ─── HERO (Apex-style navy banner) ─── */}
      <section className="relative public-page-offset pb-0 overflow-hidden bg-gradient-to-br from-[#0070D0] via-[#0058A8] to-[#0070D0]">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_50%,#FCC400_0%,transparent_50%)]" />

        <div className="container relative mx-auto px-4 pb-16 md:pb-20">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.25rem] font-bold leading-[1.12] text-white mb-4">
                Get Trained &amp; Certified
                <br />
                <span className="text-[#FCC400]">With {HUB.name}</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/90 font-medium mb-8 max-w-lg">
                {HUB.tagline}
              </p>

              {/* Hero search box — Apex pattern */}
              <div className="rounded-xl bg-black/25 backdrop-blur-sm p-3 sm:p-4 max-w-xl">
                <form onSubmit={handleHeroSearch} className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="search"
                    placeholder="Subject, exam, or language…"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    className="h-12 sm:h-14 flex-1 rounded-lg border-0 bg-white text-slate-900 text-base placeholder:text-slate-400 shadow-inner"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 sm:h-14 px-8 rounded-lg bg-[#FCC400] hover:bg-[#E69545] text-[#0070D0] font-bold text-base shadow-lg shrink-0"
                  >
                    <Search className="h-4 w-4 mr-2 sm:hidden" />
                    Search Courses
                  </Button>
                </form>
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mt-3 text-sm text-white/80">
                  {HERO_QUICK_LINKS.map((link, i) => (
                    <span key={link.href ?? link.to ?? link.label} className="flex items-center">
                      {i > 0 && <span className="mx-2 text-white/40">|</span>}
                      {link.href ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#FCC400] transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(link.to!)}
                          className="hover:text-[#FCC400] transition-colors"
                        >
                          {link.label}
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-5 max-w-xl">
                <Button
                  size="lg"
                  className="h-11 px-6 rounded-lg bg-white text-[#0070D0] hover:bg-white/90 font-semibold"
                  onClick={() => navigate("/signup")}
                >
                  Start learning today
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 px-6 rounded-lg border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={() => navigate("/institution-signup")}
                >
                  Partner institution sign up
                </Button>
              </div>
            </motion.div>

            <motion.div
              className="relative hidden lg:flex justify-end items-end h-[420px]"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <SafeImage
                src={HOME_IMAGES.heroMain}
                fallback={DEFAULT_IMAGE}
                alt="Student learning online"
                className="max-h-[400px] w-auto object-contain drop-shadow-2xl"
              />
            </motion.div>
          </div>
        </div>

        {/* Trust bar — Apex-style feature strip */}
        <div className="border-t border-white/10 bg-[#0070D0]/80 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
              {TRUST_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-center gap-3 py-4 sm:py-5 text-white"
                >
                  <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center shrink-0">
                    <item.icon className="h-5 w-5 text-[#FCC400]" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ─── */}
      <section className="py-8 bg-slate-50 border-b border-slate-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-[#0070D0]">{s.value}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MISSION ─── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <FadeIn>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[4/3] lg:aspect-auto lg:h-[400px] group">
                <SafeImage
                  src={HOME_IMAGES.marketplace}
                  fallback={DEFAULT_IMAGE}
                  alt="Global learning community"
                  className="w-full h-full group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0070D0]/80 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <Globe2 className="h-8 w-8 text-[#FCC400] mb-2" />
                  <p className="text-lg font-semibold">Learn anytime, anywhere</p>
                </div>
              </div>
              <div>
                <SectionHeader
                  align="left"
                  eyebrow="Our mission"
                  title="Africa's leading e-learning marketplace"
                  description={HOME_MISSION.mission}
                  className="mb-6"
                />
                <ul className="space-y-3 mb-8">
                  {[
                    "Language training for study, work, and travel abroad",
                    "International exam preparation (IELTS, TOEFL, DELF, TOPIK & more)",
                    "Live Zoom classes with approved instructors",
                    "Secure online enrollment and Stripe payments",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-slate-600">
                      <CheckCircle2 className="h-5 w-5 text-[#FCC400] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="rounded-md bg-[#0070D0] hover:bg-[#0058A8] px-8 h-11"
                  onClick={() => navigate("/about")}
                >
                  Learn about us
                </Button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── FEATURED COURSES (Apex card grid) ─── */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <FadeIn>
            <SectionHeader
              eyebrow="Our Courses"
              title="Find The Best Programs For You"
              description="Start with our most popular courses — enroll online and join your first class."
            />
          </FadeIn>

          {usingFallback && (
            <p className="text-center text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-6 max-w-2xl mx-auto">
              {catalogLoading
                ? "Loading live catalog… showing featured programs in the meantime."
                : "Live catalog unavailable — showing our featured programs. Start the backend API for up-to-date pricing."}
            </p>
          )}

          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((course, index) => (
              <StaggerItem key={course.id < 0 ? `fallback-${index}` : course.id}>
                <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 group h-full flex flex-col">
                  <div className="aspect-[16/10] overflow-hidden relative">
                    <SafeImage
                      src={
                        course.image?.trim()
                          ? course.image
                          : getFeaturedCourseImage(index, course.title, course.image)
                      }
                      fallback={DEFAULT_IMAGE}
                      alt={course.title}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-4 flex flex-col flex-1">
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-[#FCC400] text-[#FCC400]" />
                      ))}
                      <span className="text-xs font-semibold text-[#0070D0] ml-1">5.0</span>
                    </div>
                    <h3 className="font-bold text-[#0070D0] text-base mb-2 line-clamp-2 leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                      <Users className="h-3.5 w-3.5" />
                      {course.duration ? `${course.duration} program` : "Open enrollment"}
                    </p>
                    <p className="text-sm font-bold text-[#0070D0] mb-4 mt-auto">
                      {formatCoursePrice(course.price)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-md border-[#0070D0] text-[#0070D0] hover:bg-[#0070D0]/5 h-9 text-xs font-semibold"
                        onClick={() => navigate("/courses")}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 rounded-md bg-[#FCC400] hover:bg-[#E69545] text-[#0070D0] h-9 text-xs font-semibold"
                        onClick={() => navigate("/signup")}
                      >
                        Enroll Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerChildren>

          <FadeIn className="text-center mt-10">
            <Button
              size="lg"
              className="rounded-md bg-[#0070D0] hover:bg-[#0058A8] px-10 h-12 font-semibold"
              onClick={() => navigate("/courses")}
            >
              View All Programs
            </Button>
          </FadeIn>
        </div>
      </section>

      {/* ─── EXAM PREP ─── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <FadeIn>
            <SectionHeader
              eyebrow="International exams"
              title="Prepare for global admissions"
              description="Structured programs for the world's most recognized English and academic proficiency tests."
            />
          </FadeIn>
          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {EXAM_PROGRAMS.map((program) => (
              <StaggerItem key={program.title}>
                <Card
                  className="group overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer bg-white h-full"
                  onClick={() => navigate("/courses")}
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <SafeImage
                      src={program.image}
                      fallback={DEFAULT_IMAGE}
                      alt={program.title}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-[#0070D0] text-base mb-1.5">{program.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{program.desc}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ─── LANGUAGES ─── */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <FadeIn>
            <SectionHeader
              eyebrow="Language courses"
              title="Master a new language"
              description="From English and French to Korean, Chinese, German, and beyond — build fluency with expert tutors."
            />
          </FadeIn>
          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LANGUAGE_PROGRAMS.map((lang) => (
              <StaggerItem key={lang.title}>
                <div
                  className="group relative rounded-xl overflow-hidden h-56 cursor-pointer shadow-md hover:shadow-xl transition-all duration-300"
                  onClick={() => navigate("/signup")}
                >
                  <SafeImage
                    src={lang.image}
                    fallback={DEFAULT_IMAGE}
                    alt={lang.title}
                    className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0070D0]/90 via-[#0070D0]/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                    <h3 className="text-lg font-bold">{lang.title}</h3>
                    <p className="text-sm text-white/80 mt-0.5">{lang.subtitle}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ─── STUDENT FEATURES ─── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <FadeIn>
            <SectionHeader
              eyebrow="Student portal"
              title="Everything you need to succeed"
              description="Register, enroll, pay, learn live, and track your journey — all in one platform."
            />
          </FadeIn>
          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {STUDENT_FEATURES.map((feature) => (
              <StaggerItem key={feature.title}>
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 h-full">
                  <div className="h-32 overflow-hidden">
                    <SafeImage
                      src={feature.image}
                      fallback={DEFAULT_IMAGE}
                      alt={feature.title}
                      className="w-full h-full hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-base text-[#0070D0] mb-1.5">{feature.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ─── LIVE LEARNING ─── */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-[#0070D0] to-[#0058A8] text-white">
        <div className="container mx-auto px-4">
          <FadeIn>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl order-2 lg:order-1 group">
                <SafeImage
                  src={HOME_IMAGES.liveClass}
                  fallback={DEFAULT_IMAGE}
                  alt="Live online class"
                  className="w-full aspect-[4/3] group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-red-500 hover:bg-red-500 text-white border-0 gap-1">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Live
                  </Badge>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <p className="text-sm font-semibold uppercase tracking-wider text-[#FCC400] mb-3">
                  Live learning
                </p>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Interactive Zoom classes</h2>
                <p className="text-white/80 leading-relaxed mb-6">
                  Join real-time sessions with instructors, ask questions, and access recorded lessons afterward.
                </p>
                <ul className="space-y-3 mb-8">
                  {LIVE_FEATURES.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <Video className="h-4 w-4 text-[#FCC400]" />
                      </div>
                      <span className="text-white/90">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="rounded-md bg-[#FCC400] text-[#0070D0] hover:bg-[#e69545] font-semibold px-8 h-11"
                  onClick={() => navigate("/meeting-registration")}
                >
                  Register for a webinar
                </Button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── TESTIMONIALS (Apex review + course card style) ─── */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <FadeIn>
            <SectionHeader
              eyebrow="Student's Review"
              title="See What Our Learners Have to Say"
              description={`Real students preparing for exams, languages, and study abroad with ${HUB.name}.`}
            />
          </FadeIn>
          <StaggerChildren className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <StaggerItem key={t.name}>
                <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <p className="text-slate-600 leading-relaxed text-sm mb-4">&ldquo;{t.text}&rdquo;</p>
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                      <SafeImage
                        src={t.image}
                        fallback={DEFAULT_IMAGE}
                        alt={t.name}
                        className="w-10 h-10 rounded-full ring-2 ring-[#FCC400]/40"
                      />
                      <div>
                        <p className="font-semibold text-[#0070D0] text-sm">{t.name}</p>
                        <p className="text-xs text-slate-500">{t.role}</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                      <p className="text-xs font-semibold text-[#0070D0] mb-1">{t.role} Program</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Enrolled student</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs rounded-md border-[#0070D0] text-[#0070D0]"
                          onClick={() => navigate("/courses")}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ─── INSTRUCTOR CTA ─── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <FadeIn>
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg grid lg:grid-cols-2 bg-white">
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <Badge className="w-fit mb-4 bg-[#FCC400]/15 text-[#0070D0] border-[#FCC400]/30">
                  For instructors
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold text-[#0070D0] mb-4">
                  Teach on our marketplace
                </h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Approved instructors create courses, host live classes, manage students, and earn from every
                  enrollment — while {HUB.company} handles platform support and payments.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="rounded-md bg-[#0070D0] hover:bg-[#0058A8] text-white px-6"
                    onClick={() => navigate("/signup?role=instructor")}
                  >
                    Apply as instructor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-md border-[#0070D0] text-[#0070D0] hover:bg-[#0070D0]/5"
                    onClick={() => navigate("/login")}
                  >
                    Instructor login
                  </Button>
                </div>
              </div>
              <div className="relative min-h-[260px] lg:min-h-[300px]">
                <SafeImage
                  src={HOME_IMAGES.certificate}
                  fallback={DEFAULT_IMAGE}
                  alt="Teaching and certification"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-16 md:py-20 bg-[#0070D0]">
        <FadeIn className="container mx-auto px-4 text-center">
          <BookOpen className="h-12 w-12 text-[#FCC400] mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to study, learn, and succeed globally?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join {HUB.name} today. Create your free account, pick a program, and start your journey with{" "}
            {HUB.company}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="h-12 px-10 rounded-md bg-[#FCC400] hover:bg-[#E69545] text-[#0070D0] font-bold"
              onClick={() => navigate("/signup")}
            >
              Create free account
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-10 rounded-md border-white text-white hover:bg-white/10 bg-transparent"
              onClick={() => navigate("/login")}
            >
              Sign in
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-10 rounded-md border-[#FCC400] text-[#FCC400] hover:bg-[#FCC400]/10 bg-transparent"
              onClick={() => navigate("/institution-signup")}
            >
              Partner institution sign up
            </Button>
          </div>
        </FadeIn>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
