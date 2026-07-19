import { useEffect, useMemo, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import StarPromoBanner from "@/components/StarPromoBanner";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/home/FadeIn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCourses } from "@/api/axios";
import { formatCoursePrice } from "@/lib/apiConfig";
import { DEFAULT_IMAGE } from "@/lib/defaultImages";
import { getFeaturedCourseImage } from "@/lib/homeImages";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  FEATURED_PROGRAM_FALLBACK,
  HOME_IMAGES,
  HOME_MISSION,
  HUB,
  LANGUAGE_PROGRAMS,
  LIVE_FEATURES,
  STUDENT_FEATURES,
  TESTIMONIALS,
  WHY_LEARN,
} from "@/lib/homeContent";
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Mic2,
  Search,
  Sparkles,
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
    <div className="min-h-screen bg-white text-[#0B0B0B]">
      <StarPromoBanner />

      {/* ─── HERO (Busuu-style: brand, one headline, one line, CTAs, dominant visual) ─── */}
      <section className="relative public-page-offset overflow-hidden bg-[#EAF7F0]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(31,138,76,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,#fff_100%)]" />

        <div className="container relative mx-auto px-4 pt-10 pb-16 md:pt-16 md:pb-24">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <p className="text-sm font-semibold tracking-wide text-[#1F8A4C] mb-4">
                {HUB.company} · School of Fluency and Proficiency
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.08] tracking-tight text-[#0B0B0B] mb-5">
                New language,
                <br />
                new opportunities,
                <br />
                <span className="text-[#1F8A4C]">new you</span>
              </h1>
              <p className="text-lg text-[#0B0B0B]/70 max-w-xl mb-8 leading-relaxed">
                Compact expert-led lessons in English, French, and Kinyarwanda — plus live practice that builds real confidence.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <Button
                  size="lg"
                  className="h-12 px-8 rounded-full bg-[#1F8A4C] hover:bg-[#166B3A] text-white font-semibold shadow-lg shadow-[#1F8A4C]/25"
                  onClick={() => navigate("/signup")}
                >
                  Learn for free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 rounded-full border-[#0B0B0B]/15 bg-white text-[#0B0B0B] hover:bg-[#0B0B0B]/5 font-semibold"
                  onClick={() => navigate("/courses")}
                >
                  Browse languages
                </Button>
              </div>

              <form onSubmit={handleHeroSearch} className="flex flex-col sm:flex-row gap-2 max-w-xl mb-4">
                <Input
                  type="search"
                  placeholder="Search English, French, Kinyarwanda…"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  className="h-12 flex-1 rounded-full border-[#0B0B0B]/10 bg-white text-[#0B0B0B] placeholder:text-[#0B0B0B]/40"
                />
                <Button
                  type="submit"
                  className="h-12 px-6 rounded-full bg-[#0B0B0B] hover:bg-[#1a1a1a] text-white font-semibold"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </form>

              <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-[#0B0B0B]/55">
                {HERO_QUICK_LINKS.map((link, i) => (
                  <span key={link.href ?? link.to ?? link.label} className="flex items-center">
                    {i > 0 && <span className="mx-2 text-[#0B0B0B]/20">·</span>}
                    {link.href ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-[#1F8A4C]">
                        {link.label}
                      </a>
                    ) : (
                      <button type="button" onClick={() => navigate(link.to!)} className="hover:text-[#1F8A4C]">
                        {link.label}
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.08 }}
            >
              <div className="relative rounded-[2rem] overflow-hidden bg-[#0B0B0B] aspect-[4/5] max-h-[540px] shadow-2xl">
                <SafeImage
                  src={HOME_IMAGES.heroMain}
                  fallback={DEFAULT_IMAGE}
                  alt="Learner practicing a new language online"
                  className="w-full h-full object-cover opacity-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B]/70 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="text-sm font-medium text-[#8FDBB0] mb-1">Speak a language in minutes a day</p>
                  <p className="text-xl font-bold">English · French · Kinyarwanda</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── I WANT TO LEARN ─── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0B0B0B] mb-3">
              I want to learn
            </h2>
            <p className="text-[#0B0B0B]/65">
              Choose your language and start with interactive online classes designed for real life.
            </p>
          </FadeIn>

          <StaggerChildren className="grid sm:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {LANGUAGE_PROGRAMS.map((lang) => (
              <StaggerItem key={lang.title}>
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="group w-full text-left rounded-3xl border border-[#0B0B0B]/08 bg-[#EAF7F0]/40 hover:bg-[#EAF7F0] hover:border-[#1F8A4C]/35 transition-all p-5 md:p-6"
                >
                  <div className="relative h-36 rounded-2xl overflow-hidden mb-4">
                    <SafeImage
                      src={lang.image}
                      fallback={DEFAULT_IMAGE}
                      alt={lang.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xl font-bold text-[#0B0B0B]">{lang.title}</h3>
                      <p className="text-sm text-[#0B0B0B]/55 mt-1">{lang.subtitle}</p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1F8A4C] text-white group-hover:bg-[#166B3A] transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ─── WHY LEARN WITH US ─── */}
      <section className="py-16 md:py-20 bg-[#0B0B0B] text-white">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#8FDBB0] mb-3">Why learn with us?</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              Why learn a language with {HUB.name}?
            </h2>
            <p className="text-white/65">{HOME_MISSION.mission}</p>
          </FadeIn>

          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY_LEARN.map((item, i) => {
              const icons = [Sparkles, MessageCircle, Users, Mic2];
              const Icon = icons[i % icons.length];
              return (
                <StaggerItem key={item.title}>
                  <div className="h-full rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F8A4C] text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-white/65 leading-relaxed">{item.desc}</p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerChildren>
        </div>
      </section>

      {/* ─── FEATURED LANGUAGE COURSES ─── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <FadeIn className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-[#1F8A4C] mb-2">Our courses</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0B0B0B] mb-2">
                Start learning today
              </h2>
              <p className="text-[#0B0B0B]/65">
                Quality language education at affordable prices — monthly, termly, or VIP one-on-one.
              </p>
            </div>
            <Button
              className="rounded-full bg-[#1F8A4C] hover:bg-[#166B3A] text-white px-6 h-11 font-semibold self-start md:self-auto"
              onClick={() => navigate("/courses")}
            >
              View all programs
            </Button>
          </FadeIn>

          {usingFallback && (
            <p className="text-center text-sm text-[#166B3A] bg-[#EAF7F0] border border-[#1F8A4C]/20 rounded-2xl px-4 py-2 mb-6 max-w-2xl mx-auto">
              {catalogLoading
                ? "Loading live catalog…"
                : "Showing featured language programs. Connect to the live catalog for latest pricing."}
            </p>
          )}

          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((course, index) => (
              <StaggerItem key={course.id < 0 ? `fallback-${index}` : course.id}>
                <article className="group h-full flex flex-col overflow-hidden rounded-3xl border border-[#0B0B0B]/08 bg-white hover:shadow-xl hover:shadow-[#1F8A4C]/10 transition-all">
                  <div className="aspect-[16/10] overflow-hidden relative">
                    <SafeImage
                      src={
                        course.image?.trim()
                          ? course.image
                          : getFeaturedCourseImage(index, course.title, course.image)
                      }
                      fallback={DEFAULT_IMAGE}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#1F8A4C]">
                      Language
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-lg text-[#0B0B0B] mb-2 line-clamp-2">{course.title}</h3>
                    <p className="text-sm text-[#0B0B0B]/55 line-clamp-2 mb-4">
                      {course.description || "Interactive online language classes with expert instructors."}
                    </p>
                    <p className="text-sm text-[#0B0B0B]/45 mb-1">
                      {course.duration ? `${course.duration}` : "Flexible schedule"}
                    </p>
                    <p className="text-lg font-extrabold text-[#1F8A4C] mb-4 mt-auto">
                      {formatCoursePrice(course.price)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-full border-[#0B0B0B]/15 text-[#0B0B0B] hover:bg-[#0B0B0B]/5"
                        onClick={() => navigate("/courses")}
                      >
                        Details
                      </Button>
                      <Button
                        className="flex-1 rounded-full bg-[#1F8A4C] hover:bg-[#166B3A] text-white"
                        onClick={() => navigate("/signup")}
                      >
                        Enroll
                      </Button>
                    </div>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ─── LIVE PRACTICE ─── */}
      <section className="py-16 md:py-20 bg-[#EAF7F0]">
        <div className="container mx-auto px-4">
          <FadeIn>
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <div className="relative rounded-[2rem] overflow-hidden aspect-[4/3] shadow-xl order-2 lg:order-1">
                <SafeImage
                  src={HOME_IMAGES.liveClass}
                  fallback={DEFAULT_IMAGE}
                  alt="Live language class"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="order-1 lg:order-2">
                <p className="text-sm font-semibold uppercase tracking-wider text-[#1F8A4C] mb-3">
                  Immersive speaking practice
                </p>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0B0B0B] mb-4">
                  Learn for real life
                </h2>
                <p className="text-[#0B0B0B]/65 leading-relaxed mb-6">
                  Get instant feedback and lasting confidence through live classes, pronunciation practice, and conversations that feel natural.
                </p>
                <ul className="space-y-3 mb-8">
                  {LIVE_FEATURES.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-[#0B0B0B]/80">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1F8A4C] text-white shrink-0">
                        <Video className="h-4 w-4" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  className="rounded-full bg-[#0B0B0B] hover:bg-[#1a1a1a] text-white px-8 h-11 font-semibold"
                  onClick={() => navigate("/meeting-registration")}
                >
                  Book meeting with us
                </Button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── STUDENT TOOLS ─── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0B0B0B] mb-3">
              Learn your way
            </h2>
            <p className="text-[#0B0B0B]/65">
              Everything you need to enroll, practice, and progress — in one language-learning portal.
            </p>
          </FadeIn>
          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {STUDENT_FEATURES.map((feature) => (
              <StaggerItem key={feature.title}>
                <div className="h-full rounded-3xl border border-[#0B0B0B]/08 overflow-hidden bg-white hover:border-[#1F8A4C]/30 transition-colors">
                  <div className="h-32 overflow-hidden">
                    <SafeImage
                      src={feature.image}
                      fallback={DEFAULT_IMAGE}
                      alt={feature.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-[#0B0B0B] mb-1.5">{feature.title}</h3>
                    <p className="text-sm text-[#0B0B0B]/60 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-16 md:py-20 bg-[#F7F7F5]">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0B0B0B] mb-3">
              Trusted by language learners
            </h2>
            <p className="text-[#0B0B0B]/65">Real students building fluency with {HUB.name}.</p>
          </FadeIn>
          <StaggerChildren className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <StaggerItem key={t.name}>
                <blockquote className="h-full rounded-3xl bg-white border border-[#0B0B0B]/08 p-6">
                  <p className="text-[#0B0B0B]/75 leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <SafeImage
                      src={t.image}
                      fallback={DEFAULT_IMAGE}
                      alt={t.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-[#1F8A4C]/25"
                    />
                    <div>
                      <p className="font-semibold text-[#0B0B0B] text-sm">{t.name}</p>
                      <p className="text-xs text-[#1F8A4C] font-medium">{t.role}</p>
                    </div>
                  </div>
                </blockquote>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ─── MISSION STRIP ─── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <FadeIn>
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="relative rounded-[2rem] overflow-hidden aspect-[4/3]">
                <SafeImage
                  src={HOME_IMAGES.marketplace}
                  fallback={DEFAULT_IMAGE}
                  alt="Language learning community"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-[#1F8A4C] mb-3">Our mission</p>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0B0B0B] mb-4">
                  A dedicated language school
                </h2>
                <p className="text-[#0B0B0B]/65 leading-relaxed mb-6">{HOME_MISSION.vision}</p>
                <ul className="space-y-3 mb-8">
                  {[
                    "English, French, and Kinyarwanda only",
                    "Experienced & qualified instructors",
                    "Flexible schedule to fit your lifestyle",
                    "Personalized learning & feedback",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[#0B0B0B]/75">
                      <CheckCircle2 className="h-5 w-5 text-[#1F8A4C] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="rounded-full bg-[#1F8A4C] hover:bg-[#166B3A] text-white px-6 h-11"
                    onClick={() => navigate("/about")}
                  >
                    About us
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-[#0B0B0B]/15 text-[#0B0B0B] hover:bg-[#0B0B0B]/5 px-6 h-11"
                    onClick={() => navigate("/institution-signup")}
                  >
                    Partner institution sign up
                  </Button>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-16 md:py-24 bg-[#1F8A4C]">
        <FadeIn className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Join learners succeeding with {HUB.name}
          </h2>
          <p className="text-lg text-white/85 mb-8 max-w-2xl mx-auto">
            Invest in your language skills today and open the door to a better tomorrow.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="h-12 px-10 rounded-full bg-white text-[#1F8A4C] hover:bg-white/90 font-bold"
              onClick={() => navigate("/signup")}
            >
              Learn for free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-10 rounded-full border-white text-white hover:bg-white/10 bg-transparent font-semibold"
              onClick={() => navigate("/login")}
            >
              Log in
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-10 rounded-full border-white/50 text-white hover:bg-white/10 bg-transparent font-semibold"
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
