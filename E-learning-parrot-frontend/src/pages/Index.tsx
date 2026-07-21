import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import StarPromoBanner from "@/components/StarPromoBanner";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/home/FadeIn";
import { Button } from "@/components/ui/button";
import { getCourses } from "@/api/axios";
import { formatCoursePrice } from "@/lib/apiConfig";
import { DEFAULT_IMAGE } from "@/lib/defaultImages";
import { getFeaturedCourseImage } from "@/lib/homeImages";
import { SafeImage } from "@/components/ui/SafeImage";
import { FEATURE_POSTS, FEATURED_PROGRAM_FALLBACK, HOME_IMAGES, HUB, LANGUAGE_PROGRAMS, TESTIMONIALS, WHY_LEARN } from "@/lib/homeContent";
import { PaymentPacksBanner } from "@/components/payments/PaymentPacksBanner";
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Mic2,
  Sparkles,
  Trophy,
  Users,
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

const badgeClass = (accent: "green" | "yellow" | "sky") =>
  ({
    green: "bg-[#1F8A4C] text-white",
    yellow: "bg-[#FCC400] text-[#0B0B0B]",
    sky: "bg-[#0070D0] text-white",
  })[accent];

const Index = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getCourses()
      .then((data) => {
        if (cancelled) return;
        const active = (Array.isArray(data) ? data : []).filter(
          (c) => (c.status ?? "Active").toLowerCase() !== "inactive"
        );
        setCourses(active);
      })
      .catch(() => {
        if (cancelled) return;
        setCourses([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const featured = useMemo(() => {
    if (courses.length > 0) return courses.slice(0, 3);
    return [...FEATURED_PROGRAM_FALLBACK];
  }, [courses]);

  return (
    <div className="min-h-screen bg-white text-[#0B0B0B]">
      <StarPromoBanner />
      <PaymentPacksBanner />

      {/* Hero — Busuu-like: brand, headline, one line, CTAs, visual */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0070D0] via-[#FCC400] to-[#1F8A4C]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,112,208,0.12),transparent_55%)]" />

        <div className="container relative mx-auto px-4 pt-8 pb-10 sm:pt-12 sm:pb-14 md:pt-20 md:pb-20">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 sm:gap-10 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="text-center lg:text-left"
            >
              <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#0070D0] mb-3 sm:mb-4">
                {HUB.company}
              </p>
              <h1 className="text-[2rem] leading-[1.12] sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-[#0B0B0B] mb-4 sm:mb-5">
                New language,
                <br />
                new opportunities,
                <br />
                <span className="text-[#0070D0]">new you</span>
              </h1>
              <p className="text-base sm:text-lg text-[#0B0B0B]/65 max-w-lg mx-auto lg:mx-0 mb-6 sm:mb-8 leading-relaxed">
                Compact expert-led lessons in English, French, and Kinyarwanda — plus live practice that builds real confidence.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="h-12 w-full sm:w-auto px-8 rounded-full bg-[#0070D0] hover:bg-[#0058A8] text-white font-semibold"
                  onClick={() => navigate("/signup")}
                >
                  Learn for free
                </Button>
                <Button
                  size="lg"
                  className="h-12 w-full sm:w-auto px-8 rounded-full bg-[#FCC400] hover:bg-[#E6B000] text-[#0B0B0B] font-semibold"
                  onClick={() => navigate("/courses")}
                >
                  Browse languages
                </Button>
              </div>
              <p className="mt-5 sm:mt-6 text-sm text-[#0B0B0B]/45">
                Speak a language in minutes a day · 100% online
              </p>
            </motion.div>

            <motion.div
              className="relative mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.08 }}
            >
              <div className="relative rounded-2xl sm:rounded-[2rem] overflow-hidden aspect-[4/5] max-h-[380px] sm:max-h-[520px] shadow-[0_24px_60px_rgba(0,112,208,0.18)]">
                <SafeImage
                  src={HOME_IMAGES.heroMain}
                  fallback={DEFAULT_IMAGE}
                  alt="Learner practicing a new language online"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B]/55 via-transparent to-transparent" />
                <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 text-white">
                  <p className="text-xs sm:text-sm font-medium text-[#FCC400] mb-1">School of Fluency and Proficiency</p>
                  <p className="text-base sm:text-xl font-bold">English · French · Kinyarwanda</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* I want to learn — circular flag images (not emoji — Windows shows letter codes) */}
      <section className="py-10 sm:py-14 md:py-16 bg-white border-t border-[#0B0B0B]/05">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#0B0B0B]">
              I want to learn
            </h2>
          </FadeIn>

          <div className="mx-auto max-w-3xl">
            <StaggerChildren className="grid grid-cols-3 gap-3 sm:gap-8 md:gap-14 place-items-center">
              {LANGUAGE_PROGRAMS.map((lang) => (
                <StaggerItem key={lang.title} className="w-full">
                  <button
                    type="button"
                    onClick={() => navigate(`/courses?search=${encodeURIComponent(lang.search)}`)}
                    className="group w-full flex flex-col items-center gap-2 sm:gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0070D0] focus-visible:ring-offset-2 rounded-2xl p-1"
                    aria-label={`Learn ${lang.title}`}
                  >
                    <span className="relative block h-16 w-16 sm:h-28 sm:w-28 md:h-32 md:w-32 overflow-hidden rounded-full bg-[#E8F4FC] ring-[3px] sm:ring-4 ring-white shadow-lg shadow-[#0070D0]/15 transition-transform duration-300 group-hover:scale-105 group-hover:ring-[#FCC400] group-active:scale-95">
                      <img
                        src={lang.flagSrc}
                        alt=""
                        width={128}
                        height={128}
                        decoding="async"
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    </span>
                    <span className="text-xs sm:text-base md:text-lg font-semibold text-[#0B0B0B] group-hover:text-[#0070D0] transition-colors text-center leading-tight px-0.5">
                      {lang.title}
                    </span>
                  </button>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </div>
        </div>
      </section>

      {/* Why learn — heading + short cards */}
      <section className="py-10 md:py-12 bg-white">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0B0B0B]">
              Why learn a language with {HUB.name}?
            </h2>
          </FadeIn>
          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {WHY_LEARN.map((item, i) => {
              const icons = [Sparkles, MessageCircle, Users, Mic2];
              const Icon = icons[i % icons.length];
              return (
                <StaggerItem key={item.title}>
                  <div className="h-full rounded-2xl border border-[#0B0B0B]/06 bg-white p-5 text-left shadow-sm">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F4FC] text-[#0070D0]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-[#0B0B0B] mb-1.5">{item.title}</h3>
                    <p className="text-sm text-[#0B0B0B]/55 leading-relaxed">{item.desc}</p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerChildren>
        </div>
      </section>

      {/* Zig-zag feature posts (Busuu style) */}
      {FEATURE_POSTS.map((post, index) => {
        const reverse = index % 2 === 1;
        return (
          <section key={post.title} className="py-10 sm:py-14 md:py-20 bg-white overflow-hidden">
            <div className="container mx-auto px-4">
              <FadeIn>
                <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-16 items-center">
                  <div className={reverse ? "order-1 lg:order-2" : "order-1"}>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#0B0B0B]/40 mb-2 sm:mb-3">
                      {post.overline}
                    </p>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#0B0B0B] mb-3 sm:mb-4">
                      {post.title}
                    </h2>
                    <p className="text-sm sm:text-base md:text-lg text-[#0B0B0B]/60 leading-relaxed mb-5 sm:mb-6 max-w-md">
                      {post.body}
                    </p>
                    <Button
                      className="w-full sm:w-auto rounded-full bg-[#0070D0] hover:bg-[#0058A8] text-white px-6 h-11 font-semibold"
                      onClick={() => navigate("/signup")}
                    >
                      Get started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  <div className={`relative pb-8 sm:pb-6 ${reverse ? "order-2 lg:order-1" : "order-2"}`}>
                    <div className="relative mx-auto max-w-md px-1">
                      <div className="rounded-2xl sm:rounded-[1.75rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] aspect-[4/3] bg-[#E8F4FC]">
                        <SafeImage
                          src={post.image}
                          fallback={DEFAULT_IMAGE}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute -bottom-2 left-2 right-2 sm:left-4 sm:right-auto sm:w-[85%] rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-[#0B0B0B]/05">
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full ${badgeClass(post.accent)}`}
                          >
                            {post.accent === "yellow" ? (
                              <Trophy className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#0B0B0B]">{post.mock.title}</p>
                            <p className="text-xs sm:text-sm text-[#0B0B0B]/55 mt-0.5">{post.mock.line}</p>
                            <span
                              className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeClass(post.accent)}`}
                            >
                              {post.mock.badge}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </section>
        );
      })}

      {/* Courses from flyer */}
      <section className="py-16 md:py-20 bg-[#E8F4FC]/60">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0070D0] mb-3">Our courses</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0B0B0B] mb-3">
              Start learning today
            </h2>
            <p className="text-[#0B0B0B]/60">
              Quality language education at affordable prices — from 100,000 RWF / month.
            </p>
          </FadeIn>

          {catalogLoading && (
            <p className="text-center text-sm text-[#0070D0] mb-6">Loading live catalog…</p>
          )}

          <StaggerChildren className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {featured.map((course, index) => (
              <StaggerItem key={course.id < 0 ? `fallback-${index}` : course.id}>
                <article className="group h-full flex flex-col overflow-hidden rounded-3xl bg-white border border-[#0070D0]/10 shadow-sm hover:shadow-xl hover:shadow-[#0070D0]/10 transition-all">
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
                    <span className="absolute top-3 left-3 rounded-full bg-[#FCC400] px-3 py-1 text-xs font-semibold text-[#0B0B0B]">
                      Languages
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-lg text-[#0B0B0B] mb-2">{course.title}</h3>
                    <p className="text-sm text-[#0B0B0B]/55 line-clamp-2 mb-4">
                      {course.description || "Interactive online classes with expert instructors."}
                    </p>
                    <p className="text-lg font-extrabold text-[#0070D0] mb-4 mt-auto">
                      {formatCoursePrice(course.price)}
                    </p>
                    <Button
                      className="w-full rounded-full bg-[#0070D0] hover:bg-[#0058A8] text-white"
                      onClick={() => navigate("/signup")}
                    >
                      Enroll
                    </Button>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerChildren>

          <div className="text-center mt-8">
            <Button
              variant="outline"
              className="rounded-full border-[#0070D0] text-[#0070D0] hover:bg-white px-6"
              onClick={() => navigate("/courses")}
            >
              View all programs
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0B0B0B] mb-3">
              Trusted by language learners
            </h2>
            <p className="text-[#0B0B0B]/55">Real students building fluency with {HUB.name}.</p>
          </FadeIn>
          <StaggerChildren className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <StaggerItem key={t.name}>
                <blockquote className="h-full rounded-3xl bg-[#F7F9FC] border border-[#0B0B0B]/05 p-6">
                  <p className="text-[#0B0B0B]/70 leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <SafeImage
                      src={t.image}
                      fallback={DEFAULT_IMAGE}
                      alt={t.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-[#FCC400]"
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

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-[#0070D0]">
        <FadeIn className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Join learners succeeding with {HUB.name}
          </h2>
          <p className="text-lg text-white/90 mb-3 max-w-2xl mx-auto">
            An award-ready language learning platform for new and advancing learners.
          </p>
          <p className="text-sm font-semibold text-[#FCC400] mb-8">English · French · Kinyarwanda</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="h-12 px-10 rounded-full bg-[#FCC400] text-[#0B0B0B] hover:bg-[#E6B000] font-bold"
              onClick={() => navigate("/signup")}
            >
              Get started
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-10 rounded-full border-white text-white hover:bg-white/10 bg-transparent font-semibold"
              onClick={() => navigate("/login")}
            >
              Log in
            </Button>
          </div>
        </FadeIn>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
