import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  CreditCard,
  Shield,
  ArrowLeft,
  Loader2,
  Lock,
  CheckCircle2,
  Sparkles,
  Clock,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { createPaymentCheckout, getCourses, getStripeConfig, getStudentCourseEnrollments } from "@/api/axios";
import { canPayForEnrollment, hasCourseAccess, isEnrollmentPaid, isPendingEnrollmentApproval } from "@/lib/enrollmentStatus";

function extractPrice(course: Record<string, unknown>): number {
  const keys = ["price", "course_price", "fee", "cost", "amount", "tuition"];
  for (const key of keys) {
    const val = course[key];
    if (val !== undefined && val !== null && val !== "") {
      const n = parseFloat(String(val));
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

function getCourseImage(title?: string | null) {
  const lower = (title ?? "Course").toLowerCase();
  if (lower.includes("ai mastery") || lower.includes("xander ai")) {
    return "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&auto=format&fit=crop";
  }
  if (lower.includes("french") || lower.includes("tcf") || lower.includes("tef")) {
    return "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&fit=crop";
  }
  if (lower.includes("english") || lower.includes("ielts")) {
    return "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop";
  }
  return "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop";
}

const CHECKOUT_STEPS = [
  { label: "Review", done: true },
  { label: "Pay", done: false },
  { label: "Access course", done: false },
];

const TRUST_ITEMS = [
  { icon: Shield, label: "256-bit SSL encryption" },
  { icon: Lock, label: "PCI-compliant via Stripe" },
  { icon: CreditCard, label: "Visa, Mastercard, Amex" },
];

const LearnerPayment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hasCourseContext, setHasCourseContext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [coursePrice, setCoursePrice] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);

  useEffect(() => {
    getStripeConfig()
      .then((cfg) => setStripeReady(cfg.configured))
      .catch(() => setStripeReady(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedCourseId = localStorage.getItem("parrot_selected_course_id");
    const storedStudentId = localStorage.getItem("parrot_student_id");

    if (!storedCourseId || !storedStudentId) {
      setHasCourseContext(false);
      setIsLoading(false);
      return;
    }

    const courseIdNum = Number(storedCourseId);
    const studentIdNum = Number(storedStudentId);

    if (!courseIdNum || Number.isNaN(courseIdNum) || !studentIdNum || Number.isNaN(studentIdNum)) {
      setHasCourseContext(false);
      setIsLoading(false);
      return;
    }

    setHasCourseContext(true);

    const loadEnrollment = getStudentCourseEnrollments(studentIdNum).then((res) => {
      const match = (res.enrollments || []).find((e) => Number(e.course_id) === courseIdNum);
      setEnrollmentStatus(match?.status ?? null);
    });

    const loadCourse = getCourses()
      .then((data: unknown) => {
        const list = Array.isArray(data) ? data : [];
        const match = list.find((c: any) => Number(c.id) === courseIdNum) ?? null;

        if (match) {
          setSelectedCourse(match);
          setCoursePrice(extractPrice(match));
        }
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Error loading course",
          description: "Failed to load course details. Please try again.",
        });
      });

    Promise.all([loadCourse, loadEnrollment]).finally(() => setIsLoading(false));
  }, [toast]);

  const handleRedirectToCheckout = async () => {
    if (!selectedCourse) return;

    const storedCourseId = localStorage.getItem("parrot_selected_course_id");
    const storedStudentId = localStorage.getItem("parrot_student_id");

    if (!storedCourseId || !storedStudentId) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Course or learner information is missing.",
      });
      return;
    }

    try {
      setIsRedirecting(true);
      const response = await createPaymentCheckout(Number(storedCourseId), Number(storedStudentId));
      if (response?.url) {
        window.location.href = response.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Payment error",
        description: error?.response?.data?.message || "Unable to redirect to payment. Please try again.",
      });
      setIsRedirecting(false);
    }
  };

  const courseTitle =
    selectedCourse?.title || selectedCourse?.course_name || selectedCourse?.name || "Selected course";
  const formattedPrice = coursePrice.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const canPay = canPayForEnrollment(enrollmentStatus);
  const alreadyPaid = isEnrollmentPaid(enrollmentStatus);
  const pendingApproval = isPendingEnrollmentApproval(enrollmentStatus);
  const approvalBlocked = hasCourseContext && !canPay && !alreadyPaid;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary absolute -bottom-1 -right-1 bg-background rounded-full" />
        </div>
        <p className="text-sm text-muted-foreground">Preparing your checkout...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      <AdminPageHeader
        eyebrow="Secure checkout"
        title="Course payment"
        description="Confirm your enrollment and pay safely with Stripe."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard/learner")}
          className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </AdminPageHeader>

      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 px-2">
        {CHECKOUT_STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : i === 1 && hasCourseContext
                      ? "bg-primary/15 text-primary ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i === 0 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-xs sm:text-sm font-medium hidden sm:inline ${
                  i <= 1 ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < CHECKOUT_STEPS.length - 1 && (
              <div className={`h-px w-8 sm:w-16 ${i === 0 ? "bg-primary/40" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {!hasCourseContext ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No course selected</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Choose a course from your dashboard before proceeding to checkout.
            </p>
            <Button onClick={() => navigate("/dashboard/learner")}>Browse courses</Button>
          </CardContent>
        </Card>
      ) : alreadyPaid ? (
        <Card className="rounded-2xl border-emerald-200 bg-emerald-50/80">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <h3 className="text-lg font-semibold">Already enrolled and paid</h3>
            <p className="text-sm text-muted-foreground">You already have access to this course.</p>
            <Button onClick={() => navigate("/dashboard/my-courses")}>Go to my courses</Button>
          </CardContent>
        </Card>
      ) : approvalBlocked ? (
        <Card className="rounded-2xl border-amber-200 bg-amber-50/80">
          <CardContent className="py-12 text-center space-y-4">
            {pendingApproval ? (
              <Clock className="h-12 w-12 text-amber-600 mx-auto" />
            ) : (
              <AlertCircle className="h-12 w-12 text-amber-600 mx-auto" />
            )}
            <h3 className="text-lg font-semibold text-amber-900">
              {pendingApproval ? "Waiting for administrator approval" : "Payment not available yet"}
            </h3>
            <p className="text-sm text-amber-800/90 max-w-md mx-auto leading-relaxed">
              {pendingApproval
                ? "Your course application must be approved before you can pay. We will notify you when payment is available."
                : "Your enrollment is not approved for payment. Please contact support or apply again."}
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard/my-courses")}>
              Back to my courses
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Card className="rounded-2xl overflow-hidden border-border/70 shadow-sm">
              <div className="relative h-36 sm:h-44 bg-muted">
                <img
                  src={getCourseImage(courseTitle)}
                  alt={courseTitle}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <Badge className="mb-2 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    Enrollment pending payment
                  </Badge>
                  <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">{courseTitle}</h2>
                </div>
              </div>
              <CardContent className="p-5 sm:p-6 space-y-4">
                {selectedCourse?.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {selectedCourse.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Instant access after payment
                  </Badge>
                  {selectedCourse?.duration && (
                    <Badge variant="outline">{selectedCourse.duration}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                  <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                    Secure payment processing
                  </p>
                  <p className="text-sm text-emerald-800/80 dark:text-emerald-200/70 leading-relaxed">
                    Payments are handled by Stripe. Your card details are encrypted and never stored on our servers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment panel � right / sticky */}
          <div className="lg:col-span-2">
            <Card className="rounded-2xl border-border/70 shadow-md lg:sticky lg:top-24">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Order summary</CardTitle>
                <CardDescription>Review your total before continuing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Course fee</span>
                    <span className="font-medium">
                      {coursePrice > 0 ? `$${formattedPrice}` : "Free"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform fee</span>
                    <span className="font-medium text-emerald-600">$0.00</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">Total due</span>
                    <div className="text-right">
                      {coursePrice > 0 ? (
                        <>
                          <p className="text-3xl font-black text-primary tracking-tight">${formattedPrice}</p>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
                            USD � one-time
                          </p>
                        </>
                      ) : (
                        <p className="text-2xl font-black text-emerald-600">FREE</p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {coursePrice === 0 ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-5 text-center space-y-3">
                    <CheckCircle2 className="h-10 w-10 text-blue-600 mx-auto" />
                    <p className="font-semibold text-blue-900">This course is free</p>
                    <p className="text-sm text-blue-700/80">No payment required to enroll.</p>
                    <Button
                      className="w-full"
                      onClick={() => {
                        localStorage.removeItem("parrot_selected_course_id");
                        toast({ title: "Enrolled!", description: "You have access to the course." });
                        navigate("/dashboard/learner");
                      }}
                    >
                      Confirm free enrollment
                    </Button>
                  </div>
                ) : stripeReady === false ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center space-y-3">
                    <p className="text-sm text-amber-900 font-medium">Stripe not configured</p>
                    <p className="text-xs text-amber-800/80">
                      Add STRIPE_SECRET_KEY and STRIPE_PUBLIC_KEY to backend .env
                    </p>
                    <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard/learner")}>
                      Back to dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-muted/50 border border-border/60 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Stripe Checkout</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        You&apos;ll be redirected to Stripe&apos;s secure hosted page to enter your card details.
                      </p>
                    </div>

                    <Button
                      size="lg"
                      className="w-full h-12 text-base font-semibold bg-[#0A0A0A] hover:bg-[#0070D0] shadow-lg shadow-primary/20"
                      onClick={handleRedirectToCheckout}
                      disabled={isRedirecting || stripeReady === null || !canPay}
                    >
                      {isRedirecting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Redirecting to Stripe...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Pay ${formattedPrice} securely
                        </>
                      )}
                    </Button>

                    <p className="text-[11px] text-center text-muted-foreground">
                      By continuing, you agree to enroll in this course upon successful payment.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 pt-1">
                  {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerPayment;
