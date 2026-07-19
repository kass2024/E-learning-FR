import { useState, useEffect, FormEvent, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import InstitutionPortalShell from "@/components/institution-portal/InstitutionPortalShell";
import { portalThemeStyle, resolvePortalTheme } from "@/lib/institutionPortal";
import { CountrySelect } from "@/components/CountrySelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/SafeImage";
import { useToast } from "@/components/ui/use-toast";
import { registerStudent, registerInstructor, getLearningPrograms, getPublicInstitutionChoices, getInstitutionBySignupSlug, type LearningProgramPayload, type PlatformInstitutionInfo } from "@/api/axios";
import { StudyShiftPicker } from "@/components/StudyShiftPicker";
import { saveInstitutionContext } from "@/lib/institutionContext";
import { clearStudyShiftCache } from "@/lib/studyShiftCache";
import { HUB } from "@/lib/hubConfig";
import { hubBrand } from "@/lib/hubBrand";
import { resolveInstitutionLogoUrl } from "@/lib/institutionContext";
import { HOME_UNIQUE_IMAGES } from "@/lib/homeImages";
import { cn } from "@/lib/utils";
import ParrotLogo from "@/components/ParrotLogo";
import {
  Eye,
  EyeOff,
  Loader2,
  X,
  User,
  Mail,
  Phone,
  Target,
  Lock,
  Globe,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Shield,
  Building2,
} from "lucide-react";

type SelectedCourse = {
  id?: number;
  title?: string;
  programId?: number;
  programName?: string;
  price?: number | null;
  duration?: string | null;
  level?: string;
  studyShiftIds?: number[];
  requiresStudyShift?: boolean;
};

type Step = 1 | 2 | 3 | 4;
type InstitutionChoice = "main" | number;

type FormMessage = {
  type: "error" | "success";
  title: string;
  description: string;
};

const STEPS = [
  { id: 1 as Step, label: "Institution", icon: Building2 },
  { id: 2 as Step, label: "Courses", icon: BookOpen },
  { id: 3 as Step, label: "Profile", icon: User },
  { id: 4 as Step, label: "Confirm", icon: Shield },
];

const LEVELS = [
  { id: "beginner", label: "Beginner", description: "Just starting out" },
  { id: "elementary", label: "Elementary", description: "Basic phrases" },
  { id: "intermediate", label: "Intermediate", description: "Daily conversations" },
  { id: "upper_intermediate", label: "Upper Int.", description: "Good fluency" },
  { id: "advanced", label: "Advanced", description: "Strong command" },
  { id: "upper_advanced", label: "Proficient", description: "Near-native" },
];

const evaluatePasswordStrength = (value: string): "empty" | "weak" | "medium" | "strong" => {
  if (!value) return "empty";
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Za-z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  if (score <= 1) return "weak";
  if (score <= 3) return "medium";
  return "strong";
};

const isAIMasteryCourse = (title?: string) => {
  const t = (title || "").toLowerCase();
  return t.includes("ai mastery") || t.includes("parrot ai mastery");
};

const Signup = () => {
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const isInstructorSignup = searchParams.get("role") === "instructor";
  const institutionSlugParam = (routeSlug || searchParams.get("institution") || searchParams.get("inst") || "").trim().toLowerCase();
  const isInstitutionLocked = Boolean(institutionSlugParam && !isInstructorSignup);
  const { toast } = useToast();
  const brand = hubBrand();

  const [step, setStep] = useState<Step>(isInstructorSignup ? 3 : isInstitutionLocked ? 2 : 1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [goal, setGoal] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<"empty" | "weak" | "medium" | "strong">("empty");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);

  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [programs, setPrograms] = useState<LearningProgramPayload[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [institutionChoices, setInstitutionChoices] = useState<PlatformInstitutionInfo[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<InstitutionChoice | null>(null);
  const [lockedInstitution, setLockedInstitution] = useState<PlatformInstitutionInfo | null>(null);
  const [lockedInstitutionLoading, setLockedInstitutionLoading] = useState(isInstitutionLocked);
  const [lockedInstitutionError, setLockedInstitutionError] = useState<string | null>(null);

  const selectedInstitutionParam = useMemo((): number | null => {
    if (selectedInstitutionId === null || selectedInstitutionId === "main") return null;
    return Number(selectedInstitutionId);
  }, [selectedInstitutionId]);

  const activeProgram = programs.find((p) => p.id === selectedProgramId) ?? programs[0] ?? null;
  const availableCourses = useMemo(() => {
    const list = activeProgram?.courses ?? [];
    return list
      .filter((c) => (c.status ?? "Active").toLowerCase() === "active")
      .map((c) => ({
        id: c.id,
        title: c.title,
        programId: activeProgram?.id,
        programName: activeProgram?.name,
        price: c.price ?? null,
        duration: c.duration ?? null,
      }));
  }, [activeProgram]);

  const progress = useMemo(() => {
    if (isInstructorSignup) {
      return ((step - 3) / 1) * 100;
    }
    if (isInstitutionLocked) {
      return step <= 2 ? 0 : ((step - 2) / 2) * 100;
    }
    return ((step - 1) / (STEPS.length - 1)) * 100;
  }, [step, isInstructorSignup, isInstitutionLocked]);

  const visibleSteps = useMemo(() => {
    if (isInstructorSignup) return STEPS.filter((s) => s.id >= 3);
    if (isInstitutionLocked) return STEPS.filter((s) => s.id >= 2);
    return STEPS;
  }, [isInstructorSignup, isInstitutionLocked]);

  const minStep = isInstructorSignup ? 3 : isInstitutionLocked ? 2 : 1;

  const selectedInstitutionLabel = useMemo(() => {
    if (selectedInstitutionId === null) return null;
    if (selectedInstitutionId === "main") return HUB.company;
    return institutionChoices.find((i) => i.id === selectedInstitutionId)?.name ?? "Partner institution";
  }, [selectedInstitutionId, institutionChoices]);

  useEffect(() => {
    try {
      const multi =
        localStorage.getItem("xander_selected_courses") ||
        localStorage.getItem("parrot_selected_courses");
      if (multi) {
        const parsed = JSON.parse(multi);
        if (Array.isArray(parsed)) {
          setSelectedCourses(parsed.filter((c) => c && typeof c === "object"));
          return;
        }
      }
      const single =
        localStorage.getItem("xander_selected_course") ||
        localStorage.getItem("parrot_selected_course");
      if (single) {
        const one = JSON.parse(single);
        if (one && typeof one === "object") setSelectedCourses([one]);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (isInstructorSignup || selectedInstitutionId === null) return;
    let mounted = true;
    const loadPrograms = async () => {
      try {
        setCoursesLoading(true);
        const institutionParam =
          selectedInstitutionId === "main" ? null : Number(selectedInstitutionId);
        const data = await getLearningPrograms({
          activeOnly: true,
          withCourses: true,
          platformInstitutionId: institutionParam,
        });
        if (!mounted) return;
        const list = Array.isArray(data) ? data : [];
        setPrograms(list);
        if (list[0]?.id) setSelectedProgramId(list[0].id);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Unable to load programs. Please try again.";
        setCourseError(message);
      } finally {
        setCoursesLoading(false);
      }
    };
    loadPrograms();
    return () => {
      mounted = false;
    };
  }, [isInstructorSignup, selectedInstitutionId]);

  useEffect(() => {
    if (!isInstitutionLocked || !lockedInstitution) return;
    document.title = `Join ${lockedInstitution.name}`;
    return () => {
      document.title = "F&R Rwanda – Learn Today. Master Tomorrow. Succeed Globally.";
    };
  }, [isInstitutionLocked, lockedInstitution]);

  useEffect(() => {
    if (isInstructorSignup || !isInstitutionLocked) return;
    let mounted = true;
    setLockedInstitutionLoading(true);
    setLockedInstitutionError(null);
    getInstitutionBySignupSlug(institutionSlugParam)
      .then((res) => {
        if (!mounted) return;
        const inst = res.institution;
        setLockedInstitution(inst);
        setSelectedInstitutionId(inst.id);
        saveInstitutionContext(inst, false);
        setStep(2);
      })
      .catch(() => {
        if (!mounted) return;
        setLockedInstitutionError("This signup link is invalid or the institution is not accepting registrations.");
      })
      .finally(() => {
        if (mounted) setLockedInstitutionLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isInstructorSignup, isInstitutionLocked, institutionSlugParam]);

  useEffect(() => {
    if (isInstructorSignup || isInstitutionLocked) return;
    getPublicInstitutionChoices()
      .then((list) => setInstitutionChoices(Array.isArray(list) ? list : []))
      .catch(() => setInstitutionChoices([]));
  }, [isInstructorSignup, isInstitutionLocked]);

  const updateStoredCourses = (courses: SelectedCourse[]) => {
    try {
      localStorage.setItem("xander_selected_courses", JSON.stringify(courses));
      localStorage.setItem("parrot_selected_courses", JSON.stringify(courses));
      if (courses.length > 0) {
        localStorage.setItem("xander_selected_course", JSON.stringify(courses[0]));
        localStorage.setItem("parrot_selected_course", JSON.stringify(courses[0]));
      }
    } catch {
      /* ignore */
    }
  };

  const syncCourses = (courses: SelectedCourse[]) => {
    setSelectedCourses(courses);
    updateStoredCourses(courses);
  };

  const handleInstitutionPick = (choice: InstitutionChoice) => {
    if (selectedInstitutionId !== choice) {
      setSelectedInstitutionId(choice);
      setSelectedProgramId(null);
      syncCourses([]);
      setPrograms([]);
      setCourseError(null);
      clearStudyShiftCache();
    }
  };

  const handleRemoveCourse = (id?: number) => {
    if (!id) return;
    syncCourses(selectedCourses.filter((c) => c.id !== id));
  };

  const handleCourseSelect = (course: SelectedCourse, checked: boolean) => {
    if (checked) {
      syncCourses([
        ...selectedCourses,
        {
          ...course,
          programId: course.programId ?? activeProgram?.id,
          programName: course.programName ?? activeProgram?.name,
          level: isAIMasteryCourse(course.title) ? undefined : "",
        },
      ]);
    } else {
      handleRemoveCourse(course.id);
    }
  };

  const handleLevelChange = (courseId: number, level: string) => {
    const next = selectedCourses.map((c) => (c.id === courseId ? { ...c, level } : c));
    syncCourses(next);
  };

  const handleStudyShiftChange = (courseId: number, studyShiftIds: number[]) => {
    const next = selectedCourses.map((c) =>
      c.id === courseId ? { ...c, studyShiftIds } : c
    );
    syncCourses(next);
  };

  const handleShiftsLoaded = useCallback((courseId: number, hasShifts: boolean) => {
    setSelectedCourses((prev) => {
      const existing = prev.find((c) => c.id === courseId);
      if (existing?.requiresStudyShift === hasShifts) return prev;
      const next = prev.map((c) =>
        c.id === courseId ? { ...c, requiresStudyShift: hasShifts } : c
      );
      updateStoredCourses(next);
      return next;
    });
  }, []);

  const showFormMessage = (message: FormMessage) => {
    setFormMessage(message);
    toast({
      variant: message.type === "success" ? "success" : "destructive",
      title: message.title,
      description: message.description,
    });
  };

  const validateStep = (target: Step): boolean => {
    if (target === 1) {
      if (isInstructorSignup) return true;
      if (selectedInstitutionId === null) {
        showFormMessage({
          type: "error",
          title: "Select an institution",
          description: "Choose the main platform or your partner school before continuing.",
        });
        return false;
      }
      return true;
    }
    if (target === 2) {
      if (isInstructorSignup) return true;
      if (!selectedCourses.length) {
        showFormMessage({
          type: "error",
          title: "Select a course",
          description: "Choose at least one course to continue.",
        });
        return false;
      }
      const missing = selectedCourses
        .filter((c) => !isAIMasteryCourse(c.title))
        .some((c) => !c.level);
      if (missing) {
        showFormMessage({
          type: "error",
          title: "Level required",
          description: "Pick a language level for each selected course.",
        });
        return false;
      }
      const missingShift = selectedCourses.some(
        (c) => c.requiresStudyShift && !(c.studyShiftIds?.length)
      );
      if (missingShift) {
        showFormMessage({
          type: "error",
          title: "Study shift required",
          description: "Pick a weekly study time for each course that offers shifts.",
        });
        return false;
      }
      return true;
    }
    if (target === 3) {
      if (!firstName.trim() || !email.trim()) {
        showFormMessage({
          type: "error",
          title: "Missing information",
          description: "First name and email are required.",
        });
        return false;
      }
      if (!email.includes("@") || !email.includes(".")) {
        showFormMessage({
          type: "error",
          title: "Invalid email",
          description: "Please enter a valid email address.",
        });
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    setFormMessage(null);
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1) as Step);
  };

  const goBack = () => {
    setFormMessage(null);
    setStep((s) => Math.max(minStep, s - 1) as Step);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormMessage(null);

    if (isInstructorSignup) {
      if (!validateStep(3)) {
        setStep(3);
        return;
      }
    } else if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setStep(
        selectedInstitutionId === null
          ? 1
          : !selectedCourses.length
            ? 2
            : !firstName || !email
              ? 3
              : step,
      );
      return;
    }

    if (!acceptTerms) {
      showFormMessage({
        type: "error",
        title: "Terms not accepted",
        description: "You must accept the terms to continue.",
      });
      return;
    }

    if (isInstructorSignup) {
      if (password !== confirmPassword) {
        showFormMessage({
          type: "error",
          title: "Passwords do not match",
          description: "Both passwords must match.",
        });
        return;
      }
      if (passwordStrength === "weak" || passwordStrength === "empty") {
        showFormMessage({
          type: "error",
          title: "Weak password",
          description: "Password must be at least 8 characters with letters and numbers.",
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (isInstructorSignup) {
        const fullName = `${firstName} ${lastName}`.trim();
        await registerInstructor(
          fullName,
          email,
          password,
          phone || undefined,
          country || undefined,
          goal || undefined
        );

        showFormMessage({
          type: "success",
          title: "Application submitted",
          description:
            "Your instructor account is pending admin approval. You can sign in once approved.",
        });
        setTimeout(() => navigate(isInstitutionLocked ? `/login/${institutionSlugParam}` : "/login"), 2500);
        setLoading(false);
        return;
      }

      const courseTitles = selectedCourses.map((c) => c.title!);
      const data = await registerStudent(firstName, lastName, email, {
        country: country || undefined,
        phone: phone || undefined,
        primaryGoal: goal || undefined,
        selectedCourseTitles: courseTitles,
        platformInstitutionId:
          selectedInstitutionId === "main" || selectedInstitutionId === null
            ? null
            : Number(selectedInstitutionId),
        enrollments: selectedCourses
          .filter((c) => c.id)
          .map((c) => ({
            course_id: c.id!,
            level: c.level || "beginner",
            study_shift_ids: c.studyShiftIds,
          })),
      });

      const studentId = Number(data.user.id);
      if (!isNaN(studentId)) {
        localStorage.setItem("parrot_student_id", String(studentId));
        selectedCourses.filter((c) => c.id).forEach((c) => {
          localStorage.setItem(`parrot_course_status_${c.id}`, "waiting approval");
        });
      }

      if (data.institution?.id) {
        saveInstitutionContext(data.institution, false);
      } else if (selectedInstitutionId !== "main" && selectedInstitutionId !== null) {
        const picked = institutionChoices.find((i) => i.id === selectedInstitutionId);
        if (picked) saveInstitutionContext(picked, false);
      } else {
        saveInstitutionContext(null, false);
      }

      localStorage.removeItem("xander_selected_courses");
      localStorage.removeItem("xander_selected_course");
      localStorage.removeItem("parrot_selected_courses");
      localStorage.removeItem("parrot_selected_course");

      showFormMessage({
        type: "success",
        title: "Account created",
        description: data.email_sent
          ? `Welcome! We emailed your login credentials to ${email}. Your account is pending admin approval — you can sign in once approved.`
          : `Your account was created and is pending admin approval. Contact support if you did not receive your login email at ${email}.`,
      });
      setTimeout(() => navigate(isInstitutionLocked ? `/login/${institutionSlugParam}` : "/login"), 3500);
    } catch (err: unknown) {
      let description = "Signup failed. Please try again.";
      const responseData = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
        ?.response?.data;
      if (responseData?.message) description = responseData.message;
      if (responseData?.errors) {
        const firstKey = Object.keys(responseData.errors)[0];
        const firstError = responseData.errors[firstKey]?.[0];
        if (firstError) description = firstError;
      }
      showFormMessage({ type: "error", title: "Registration failed", description });
    }
    setLoading(false);
  };

  const inputClass = (opts?: { error?: boolean; success?: boolean }) =>
    cn(
      "h-11 rounded-xl pl-11 pr-4 border bg-white text-slate-900 placeholder:text-slate-400",
      "transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/20 focus-visible:border-[var(--brand-primary)]",
      opts?.error && "border-red-300 focus-visible:ring-red-200",
      opts?.success && "border-emerald-300 focus-visible:ring-emerald-200",
      !opts?.error && !opts?.success && "border-slate-200 hover:border-slate-300"
    );

  const useInstitutionJoinChrome = isInstitutionLocked && !isInstructorSignup;
  const showInstitutionJoinShell = useInstitutionJoinChrome && Boolean(lockedInstitution) && !lockedInstitutionError;
  const portalTheme = resolvePortalTheme(lockedInstitution);
  const brandStyle = {
    "--brand-primary": showInstitutionJoinShell ? portalTheme.primary : brand.primary,
    "--brand-primary-dark": showInstitutionJoinShell ? portalTheme.primaryDark : brand.primaryDark,
    ...(showInstitutionJoinShell ? portalThemeStyle(portalTheme) : {}),
  } as React.CSSProperties;

  if (useInstitutionJoinChrome && lockedInstitutionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  if (useInstitutionJoinChrome && lockedInstitutionError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h1 className="text-xl font-bold text-slate-800">Registration unavailable</h1>
        <p className="mt-2 max-w-md text-slate-600">{lockedInstitutionError}</p>
      </div>
    );
  }

  const signupPage = (
    <div
      className={cn(
        "min-h-screen",
        showInstitutionJoinShell
          ? "bg-transparent"
          : "bg-gradient-to-b from-slate-50 via-white to-slate-50",
      )}
      style={brandStyle}
    >
      {!showInstitutionJoinShell && useInstitutionJoinChrome && (
        <header className="border-b border-white/10 bg-gradient-to-r from-[#1F8A4C] to-[#1A8AD8] px-4 py-5 text-white">
          <div className="container mx-auto max-w-3xl flex items-center gap-3">
            {lockedInstitutionLoading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-white/90" />
                <span className="text-sm font-medium">Loading registration…</span>
              </>
            ) : (
              <span className="text-sm font-medium">Institution registration</span>
            )}
          </div>
        </header>
      )}

      <div className={cn("pb-16 px-4", useInstitutionJoinChrome ? "pt-8" : "public-page-offset")}>
        <div className={cn("container mx-auto", useInstitutionJoinChrome ? "max-w-3xl" : "max-w-6xl")}>
          {/* Page header */}
          {!showInstitutionJoinShell && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <Badge className="mb-4 bg-[var(--brand-primary)]/8 text-[var(--brand-primary)] border-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/10">
              <ParrotLogo size="xs" showRing={false} className="mr-1.5 w-5 h-5" />
              {isInstructorSignup ? "Apply as instructor" : "Create your learner account"}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--brand-primary)] mb-2">
              {isInstructorSignup
                ? "Teach on " + HUB.name
                : isInstitutionLocked && lockedInstitution
                  ? `Join ${lockedInstitution.name}`
                  : `Join ${HUB.name}`}
            </h1>
            <p className="text-slate-600 max-w-xl mx-auto">
              {isInstructorSignup
                ? "Submit your application — an administrator will review and approve your instructor account."
                : isInstitutionLocked && lockedInstitution
                  ? "Create your learner account and choose programs offered by your institution."
                  : HUB.slogan}
            </p>
            {!isInstructorSignup && (
              <p className="text-sm text-slate-500 mt-3">
                Want to teach?{" "}
                <button
                  type="button"
                  className="text-[var(--brand-primary)] font-semibold underline-offset-2 hover:underline"
                  onClick={() => navigate("/signup?role=instructor")}
                >
                  Apply as instructor
                </button>
              </p>
            )}
            {isInstructorSignup && (
              <p className="text-sm text-slate-500 mt-3">
                Signing up to learn?{" "}
                <button
                  type="button"
                  className="text-[var(--brand-primary)] font-semibold underline-offset-2 hover:underline"
                  onClick={() => navigate("/signup")}
                >
                  Create learner account
                </button>
              </p>
            )}
          </motion.div>
          )}

          {showInstitutionJoinShell && lockedInstitution && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 text-center"
            >
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Complete the steps below to create your account and enroll in programs at{" "}
                <span className="font-semibold text-[var(--institution-primary,#1F8A4C)]">{lockedInstitution.name}</span>.
              </p>
            </motion.div>
          )}

          <div className={cn(showInstitutionJoinShell ? "" : "grid lg:grid-cols-[1fr_1.35fr] gap-8 lg:gap-10 items-start")}>
            {/* Left panel — hidden on institution join links */}
            {!showInstitutionJoinShell && (
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className={cn("hidden lg:block sticky top-28", step > 1 && "lg:block")}
            >
              <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200/80">
                <SafeImage
                  src={HOME_UNIQUE_IMAGES.featEnroll}
                  alt="Students learning together"
                  className="w-full h-56 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/90 via-[var(--brand-primary)]/40 to-transparent" />
                <div className="absolute bottom-0 p-6 text-white">
                  <Sparkles className="h-5 w-5 text-[#1F8A4C] mb-2" />
                  <p className="font-semibold text-lg leading-snug">
                    Expert instructors, live classes, and exam prep — all in one place.
                  </p>
                </div>
              </div>

              <ul className="mt-6 space-y-4">
                {(isInstructorSignup
                  ? [
                      "Share your expertise with learners worldwide",
                      "Host live Zoom classes after approval",
                      "Get course assignments from the admin team",
                    ]
                  : isInstitutionLocked
                    ? [
                        "Enroll with your institution's private link",
                        "Select courses and your proficiency level",
                        "Pick your weekly study shift per day",
                        "Access your dashboard after admin approval",
                      ]
                    : [
                        "Choose your institution or the main platform",
                        "Select courses and your proficiency level",
                        "Pick your weekly study shift per day",
                        "Access your dashboard after admin approval",
                      ]
                ).map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>

              {selectedInstitutionLabel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-6 rounded-2xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-primary)]/70 mb-2">
                    Your institution
                  </p>
                  <Badge variant="secondary" className="bg-white text-[var(--brand-primary)] border border-slate-200">
                    {selectedInstitutionLabel}
                  </Badge>
                </motion.div>
              )}

              {selectedCourses.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-6 rounded-2xl border border-[#1F8A4C]/30 bg-[#1F8A4C]/8 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-primary)]/70 mb-2">
                    Your selection
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCourses.map((c) => (
                      <Badge key={c.id} variant="secondary" className="bg-white text-[var(--brand-primary)] border border-slate-200">
                        {c.title}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.aside>
            )}

            {/* Main form card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={cn(
                "rounded-3xl border bg-white shadow-xl overflow-hidden",
                showInstitutionJoinShell
                  ? "border-[#1F8A4C]/10 shadow-[#1F8A4C]/10"
                  : "border-slate-200/80 shadow-slate-200/50",
              )}
            >
              {/* Progress */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-4">
                  {visibleSteps.map(({ id, label, icon: Icon }) => {
                    const active = step === id;
                    const done = step > id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          if (id <= step) {
                            setStep(id);
                            return;
                          }
                          for (let s = step; s < id; s++) {
                            if (!validateStep(s as Step)) return;
                          }
                          setStep(id);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 flex-1 transition-colors",
                          active ? "text-[var(--brand-primary)]" : done ? "text-[var(--brand-primary)]" : "text-slate-400"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                            active && "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/25",
                            done && !active && "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white",
                            !active && !done && "border-slate-200 bg-white"
                          )}
                        >
                          {done && !active ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                        </span>
                        <span className="text-xs font-medium hidden sm:block">{label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[#1F8A4C] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>

              <div className="p-6 md:p-8">
                {lockedInstitutionLoading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-[var(--brand-primary)]" />
                    <p className="text-sm text-slate-500">Loading your institution…</p>
                  </div>
                )}

                {lockedInstitutionError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-3" />
                    <p className="font-semibold text-red-900">{lockedInstitutionError}</p>
                    <Button type="button" variant="outline" className="mt-4" onClick={() => navigate("/signup")}>
                      Go to general signup
                    </Button>
                  </div>
                )}

                {!lockedInstitutionLoading && !lockedInstitutionError && (
                <>
                {formMessage && (
                  <div
                    role="alert"
                    className={cn(
                      "mb-6 rounded-2xl border px-5 py-4 text-center shadow-sm",
                      formMessage.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-red-200 bg-red-50 text-red-900"
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {formMessage.type === "success" ? (
                        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-8 w-8 text-red-500" />
                      )}
                      <p className="text-lg font-bold">{formMessage.title}</p>
                      <p className="text-sm leading-relaxed max-w-md">{formMessage.description}</p>
                    </div>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {/* Step 1 — Institution */}
                  {step === 1 && !isInstructorSignup && !isInstitutionLocked && (
                    <motion.div
                      key="step-institution"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      <div>
                        <h2 className="text-xl font-bold text-[var(--brand-primary)]">Select your institution</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          Choose where you are enrolling before picking programs and courses.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => handleInstitutionPick("main")}
                          className={cn(
                            "rounded-xl border-2 p-4 text-left transition-all",
                            selectedInstitutionId === "main"
                              ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 shadow-sm"
                              : "border-slate-200 bg-white hover:border-[var(--brand-primary)]/40",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                                selectedInstitutionId === "main"
                                  ? "bg-[var(--brand-primary)] text-white"
                                  : "bg-slate-100 text-[var(--brand-primary)]",
                              )}
                            >
                              {HUB.company.charAt(0)}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-900">{HUB.company}</p>
                              <p className="text-xs text-slate-500 mt-1">Main learning platform</p>
                            </div>
                          </div>
                        </button>

                        {(institutionChoices ?? []).map((inst) => {
                          const logo = resolveInstitutionLogoUrl(inst);
                          const selected = selectedInstitutionId === inst.id;
                          return (
                            <button
                              key={inst.id}
                              type="button"
                              onClick={() => inst.id && handleInstitutionPick(inst.id)}
                              className={cn(
                                "rounded-xl border-2 p-4 text-left transition-all",
                                selected
                                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 shadow-sm"
                                  : "border-slate-200 bg-white hover:border-[var(--brand-primary)]/40",
                              )}
                            >
                              <div className="flex items-start gap-3">
                                {logo ? (
                                  <img
                                    src={logo}
                                    alt=""
                                    className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 object-cover bg-white"
                                  />
                                ) : (
                                  <span
                                    className={cn(
                                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                                      selected
                                        ? "bg-[var(--brand-primary)] text-white"
                                        : "bg-slate-100 text-[var(--brand-primary)]",
                                    )}
                                  >
                                    {(inst.name || "P").charAt(0)}
                                  </span>
                                )}
                                <div>
                                  <p className="font-semibold text-slate-900">{inst.name}</p>
                                  <p className="text-xs text-slate-500 mt-1">Partner institution</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2 — Courses */}
                  {step === 2 && !isInstructorSignup && (
                    <motion.div
                      key="step2-courses"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      <div>
                        <h2 className="text-xl font-bold text-[var(--brand-primary)]">Select your program & courses</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          {isInstitutionLocked && lockedInstitution
                            ? `Programs available at ${lockedInstitution.name}.`
                            : "Choose a program, then pick one or more courses."}
                        </p>
                      </div>

                      {showInstitutionJoinShell && lockedInstitution && (
                        <div className="rounded-xl border border-[var(--institution-primary)]/15 bg-[var(--institution-primary)]/5 px-4 py-3 text-sm text-slate-700">
                          Programs published by{" "}
                          <span className="font-semibold text-[var(--institution-primary)]">{lockedInstitution.name}</span>
                        </div>
                      )}

                      {programs.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {(programs ?? []).map((program) => {
                            const isActive = (selectedProgramId ?? programs[0]?.id) === program.id;
                            return (
                              <button
                                key={program.id}
                                type="button"
                                onClick={() => setSelectedProgramId(program.id ?? null)}
                                className={cn(
                                  "px-4 py-2 rounded-full text-sm font-medium border-2 transition-all",
                                  isActive
                                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-[var(--brand-primary)]/40"
                                )}
                              >
                                {program.name}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="rounded-2xl border border-slate-200 max-h-72 overflow-y-auto bg-slate-50/50 p-3 space-y-2">
                        {coursesLoading ? (
                          <div className="flex items-center justify-center py-12 text-slate-500">
                            <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)] mr-2" />
                            Loading programs…
                          </div>
                        ) : courseError ? (
                          <div className="text-center py-8 px-4">
                            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-2" />
                            <p className="text-sm font-medium text-slate-700">{courseError}</p>
                          </div>
                        ) : programs.length === 0 ? (
                          <p className="text-center py-8 text-slate-500">
                            {lockedInstitution
                              ? `${lockedInstitution.name} has not published any programs for enrollment yet.`
                              : "No programs available right now."}
                          </p>
                        ) : availableCourses.length === 0 ? (
                          <p className="text-center py-8 text-slate-500">
                            No courses in {activeProgram?.name ?? "this program"} yet.
                          </p>
                        ) : (
                          availableCourses.map((course) => {
                            const isSelected = selectedCourses.some((c) => c.id === course.id);
                            const isAI = isAIMasteryCourse(course.title);
                            return (
                              <button
                                key={course.id}
                                type="button"
                                onClick={() => handleCourseSelect(course, !isSelected)}
                                className={cn(
                                  "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                                  isSelected
                                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 shadow-sm"
                                    : "border-transparent bg-white hover:border-slate-200 hover:shadow-sm"
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={cn(
                                      "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                                      isSelected ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]" : "border-slate-300"
                                    )}
                                  >
                                    {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-slate-900">{course.title}</span>
                                      {course.programName && (
                                        <Badge variant="outline" className="text-[10px] border-slate-200">
                                          {course.programName}
                                        </Badge>
                                      )}
                                      {isAI && (
                                        <Badge className="bg-gradient-to-r from-violet-500 to-pink-500 text-white border-0 text-[10px]">
                                          AI Course
                                        </Badge>
                                      )}
                                    </div>
                                    {!isAI && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        {course.title?.includes("French") ? "French" : "English"} level required
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {selectedCourses.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-[var(--brand-primary)]">
                              {selectedCourses.length} course{selectedCourses.length > 1 ? "s" : ""} selected
                            </p>
                            <button
                              type="button"
                              onClick={() => syncCourses([])}
                              className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1"
                            >
                              <X className="h-3 w-3" /> Clear all
                            </button>
                          </div>
                          {selectedCourses.map((course) => {
                            const isAI = isAIMasteryCourse(course.title);
                            return (
                              <div key={course.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/80 space-y-4">
                                <p className="text-sm font-medium text-slate-800">{course.title}</p>
                                {!isAI && (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {LEVELS.map((lvl) => (
                                      <button
                                        key={lvl.id}
                                        type="button"
                                        onClick={() => handleLevelChange(course.id!, lvl.id)}
                                        className={cn(
                                          "p-2.5 rounded-lg border text-left text-xs transition-all",
                                          course.level === lvl.id
                                            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-md"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-[var(--brand-primary)]/40"
                                        )}
                                      >
                                        <span className="font-semibold block">{lvl.label}</span>
                                        <span className={cn("opacity-75", course.level === lvl.id && "text-white/80")}>
                                          {lvl.description}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {course.id && (
                                  <StudyShiftPicker
                                    courseId={course.id}
                                    platformInstitutionId={selectedInstitutionParam}
                                    ensureDefaults
                                    value={course.studyShiftIds ?? []}
                                    onChange={(shiftIds) => handleStudyShiftChange(course.id!, shiftIds)}
                                    onShiftsLoaded={(hasShifts) => handleShiftsLoaded(course.id!, hasShifts)}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Step 3 — Profile */}
                  {step === 3 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      <div>
                        <h2 className="text-xl font-bold text-[var(--brand-primary)]">Personal information</h2>
                        <p className="text-sm text-slate-500 mt-1">Tell us a bit about yourself.</p>
                      </div>

                      {selectedInstitutionLabel && !isInstructorSignup && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          Enrolling through{" "}
                          <span className="font-semibold text-[var(--brand-primary)]">{selectedInstitutionLabel}</span>
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-slate-700">
                            First name <span className="text-[#1F8A4C]">*</span>
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="Your first name"
                              className={inputClass({ success: firstName.length > 1 })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-slate-700">Last name</Label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="Optional"
                              className={inputClass()}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-slate-700">
                            Email <span className="text-[#1F8A4C]">*</span>
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="you@example.com"
                              className={inputClass({
                                success: email.includes("@") && email.includes("."),
                              })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-slate-700">Country</Label>
                          <div className="relative">
                            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                            <CountrySelect
                              value={country}
                              onChange={setCountry}
                              inputClassName={inputClass()}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-slate-700">Phone</Label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="Optional"
                              className={inputClass()}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-slate-700">Learning goal</Label>
                          <div className="relative">
                            <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              value={goal}
                              onChange={(e) => setGoal(e.target.value)}
                              placeholder="e.g. IELTS band 7"
                              className={inputClass()}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4 — Confirm (learners) or password (instructors) */}
                  {step === 4 && (
                    <motion.form
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleSubmit}
                      className="space-y-5"
                    >
                      {isInstructorSignup ? (
                        <>
                          <div>
                            <h2 className="text-xl font-bold text-[var(--brand-primary)]">Secure your account</h2>
                            <p className="text-sm text-slate-500 mt-1">Create a strong password to protect your profile.</p>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-slate-700">
                                Password <span className="text-[#1F8A4C]">*</span>
                              </Label>
                              <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  value={password}
                                  onChange={(e) => {
                                    setPassword(e.target.value);
                                    setPasswordStrength(evaluatePasswordStrength(e.target.value));
                                  }}
                                  placeholder="Min. 8 characters"
                                  className={inputClass({
                                    error: passwordStrength === "weak" && password.length > 0,
                                    success: passwordStrength === "strong",
                                  })}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--brand-primary)]"
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-slate-700">
                                Confirm password <span className="text-[#1F8A4C]">*</span>
                              </Label>
                              <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                  type={showConfirmPassword ? "text" : "password"}
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  placeholder="Repeat password"
                                  className={inputClass({
                                    error: confirmPassword.length > 0 && password !== confirmPassword,
                                    success: confirmPassword.length > 0 && password === confirmPassword,
                                  })}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--brand-primary)]"
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <h2 className="text-xl font-bold text-[var(--brand-primary)]">Review & create account</h2>
                            <p className="text-sm text-slate-500 mt-1">
                              We will email your login credentials to <span className="font-semibold text-slate-700">{email}</span> after you submit.
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm">
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-500">Name</span>
                              <span className="font-medium text-slate-800 text-right">
                                {firstName} {lastName}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-500">Email</span>
                              <span className="font-medium text-slate-800 text-right break-all">{email}</span>
                            </div>
                            {selectedInstitutionLabel && (
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-500">Institution</span>
                                <span className="font-medium text-slate-800 text-right">{selectedInstitutionLabel}</span>
                              </div>
                            )}
                            {selectedCourses.length > 0 && (
                              <div>
                                <span className="text-slate-500 block mb-1">Courses</span>
                                <div className="flex flex-wrap gap-1.5 justify-end">
                                  {selectedCourses.map((c) => (
                                    <Badge key={c.id} variant="secondary" className="bg-white">
                                      {c.title}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="rounded-xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 p-4 flex items-start gap-3">
                            <Mail className="h-5 w-5 text-[var(--brand-primary)] shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-600 leading-relaxed">
                              No password needed here — a secure password will be generated and sent to your email along with your login details.
                            </p>
                          </div>
                        </>
                      )}

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="terms"
                            checked={acceptTerms}
                            onCheckedChange={(c) => setAcceptTerms(Boolean(c))}
                            className="mt-0.5 data-[state=checked]:bg-[var(--brand-primary)] data-[state=checked]:border-[var(--brand-primary)]"
                          />
                          <label htmlFor="terms" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
                            I agree to the{" "}
                            <span className="font-semibold text-[var(--brand-primary)]">Terms of Service</span> and{" "}
                            <span className="font-semibold text-[var(--brand-primary)]">Privacy Policy</span>. Course updates may be
                            sent by email.
                          </label>
                        </div>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-100">
                  {step > minStep ? (
                    <Button type="button" variant="outline" onClick={goBack} className="rounded-full border-slate-200">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  {step < 4 ? (
                    <Button
                      type="button"
                      onClick={goNext}
                      className="rounded-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] ml-auto px-8"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={loading || !acceptTerms}
                      onClick={handleSubmit}
                      className="rounded-full bg-[#1F8A4C] hover:bg-[#c91820] text-white font-semibold ml-auto px-8 shadow-lg shadow-[#1F8A4C]/25"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating account…
                        </>
                      ) : (
                        <>
                          Create account
                          <GraduationCap className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <p className="text-center text-sm text-slate-500 mt-6">
                  Already have an account?{" "}
                  <NavLink
                    to={isInstitutionLocked ? `/login/${institutionSlugParam}` : "/login"}
                    className="font-semibold text-[var(--brand-primary)] hover:text-[#1F8A4C] transition-colors"
                  >
                    Log in
                  </NavLink>
                </p>
                </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );

  if (showInstitutionJoinShell && lockedInstitution) {
    return (
      <InstitutionPortalShell institution={lockedInstitution} activeSection="join" compactHero>
        {signupPage}
      </InstitutionPortalShell>
    );
  }

  return signupPage;
};

export default Signup;
