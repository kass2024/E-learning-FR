import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PaymentGuidelines, type PaymentGuidelinesData } from "@/components/payments/PaymentGuidelines";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  BookOpen,
  Smartphone,
  Ticket,
  Upload,
} from "lucide-react";
import {
  applyCoursePromoCode,
  getCourses,
  getPaymentConfig,
  getStudentCourseEnrollments,
  requestMomoPayment,
  submitPaymentProof,
} from "@/api/axios";
import { canPayForEnrollment, hasCourseAccess, isEnrollmentPaid, isPendingEnrollmentApproval } from "@/lib/enrollmentStatus";

type PayTab = "momo" | "promo" | "proof";

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

const LearnerPayment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hasCourseContext, setHasCourseContext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [coursePrice, setCoursePrice] = useState(0);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);
  const [guidelines, setGuidelines] = useState<PaymentGuidelinesData | null>(null);
  const [momoConfigured, setMomoConfigured] = useState(false);
  const [tab, setTab] = useState<PayTab>("momo");
  const [phone, setPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPaymentConfig()
      .then((cfg) => {
        setMomoConfigured(Boolean(cfg.configured));
        setGuidelines(cfg.guidelines ?? null);
      })
      .catch(() => setMomoConfigured(false));
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

  const courseId = Number(localStorage.getItem("parrot_selected_course_id") || 0);
  const studentId = Number(localStorage.getItem("parrot_student_id") || 0);

  const handleMomo = async () => {
    if (!courseId || !studentId) return;
    try {
      setBusy(true);
      const res = await requestMomoPayment(courseId, studentId, phone);
      toast({
        title: "Check your phone",
        description: res.message || "Approve the Mobile Money prompt to finish payment.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Mobile Money error",
        description: error?.response?.data?.message || "Unable to start Mobile Money payment.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePromo = async () => {
    if (!courseId || !studentId) return;
    try {
      setBusy(true);
      const res = await applyCoursePromoCode(courseId, studentId, promoCode);
      setEnrollmentStatus("paid");
      toast({ title: "Promo applied", description: res.message });
      navigate("/dashboard/my-courses");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Promo code error",
        description: error?.response?.data?.message || "Invalid promo code.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleProof = async () => {
    if (!courseId || !studentId || !proofFile) {
      toast({ variant: "destructive", title: "Missing file", description: "Attach a payment screenshot or PDF." });
      return;
    }
    try {
      setBusy(true);
      const res = await submitPaymentProof(courseId, studentId, proofFile, proofNote);
      toast({ title: "Proof submitted", description: res.message });
      navigate("/dashboard/my-courses");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error?.response?.data?.message || "Unable to upload payment proof.",
      });
    } finally {
      setBusy(false);
    }
  };

  const courseTitle =
    selectedCourse?.title || selectedCourse?.course_name || selectedCourse?.name || "Selected course";
  const formattedPrice = coursePrice.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });

  const canPay = canPayForEnrollment(enrollmentStatus);
  const alreadyPaid = isEnrollmentPaid(enrollmentStatus);
  const pendingApproval = isPendingEnrollmentApproval(enrollmentStatus);
  const approvalBlocked = hasCourseContext && !canPay && !alreadyPaid;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparing payment options...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      <AdminPageHeader
        eyebrow="Course payment"
        title="Pay & enroll"
        description="Pay with Mobile Money, use a promo code, or upload proof after bank/MoMo transfer."
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

      {!hasCourseContext ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No course selected</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Choose a course from your dashboard before proceeding to payment.
            </p>
            <Button onClick={() => navigate("/dashboard/learner")}>Browse courses</Button>
          </CardContent>
        </Card>
      ) : alreadyPaid ? (
        <Card className="rounded-2xl border-emerald-200 bg-emerald-50/80">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <h3 className="text-lg font-semibold">Already enrolled and paid</h3>
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
            <h3 className="text-lg font-semibold text-amber-900">Payment not available</h3>
            <p className="text-sm text-amber-800/90 max-w-md mx-auto">
              Contact support if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xl">{courseTitle}</CardTitle>
                <CardDescription>
                  Amount due: <span className="font-semibold text-foreground">{formattedPrice} RWF</span>
                  {hasCourseAccess(enrollmentStatus) ? " · Access already granted pending payment" : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "momo" as const, label: "Mobile Money", icon: Smartphone },
                      { id: "promo" as const, label: "Promo code", icon: Ticket },
                      { id: "proof" as const, label: "Payment proof", icon: Upload },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <Button
                      key={id}
                      type="button"
                      variant={tab === id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTab(id)}
                    >
                      <Icon className="h-4 w-4 mr-1.5" />
                      {label}
                    </Button>
                  ))}
                </div>

                {tab === "momo" && (
                  <div className="space-y-3 rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                      Enter the MTN or Airtel number that will receive the payment prompt.
                      {!momoConfigured ? " (Gateway not configured yet — use bank transfer + proof meanwhile.)" : ""}
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="momo-phone">Mobile Money number</Label>
                      <Input
                        id="momo-phone"
                        placeholder="0788 XXX XXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleMomo} disabled={busy || !phone.trim() || !momoConfigured}>
                      {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Request Mobile Money payment
                    </Button>
                  </div>
                )}

                {tab === "promo" && (
                  <div className="space-y-3 rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                      Have a staff promo code? Apply it to enroll without paying.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="promo">Promo code</Label>
                      <Input
                        id="promo"
                        placeholder="e.g. FRWANDA2026"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                      />
                    </div>
                    <Button onClick={handlePromo} disabled={busy || !promoCode.trim()}>
                      {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Apply promo & enroll
                    </Button>
                  </div>
                )}

                {tab === "proof" && (
                  <div className="space-y-3 rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                      Pay via Equity Bank or MTN using the guidelines, then upload your receipt for confirmation.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="proof-file">Payment proof (JPG, PNG, PDF)</Label>
                      <Input
                        id="proof-file"
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="proof-note">Note (optional)</Label>
                      <Textarea
                        id="proof-note"
                        placeholder="Transaction ID, payer name…"
                        value={proofNote}
                        onChange={(e) => setProofNote(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleProof} disabled={busy || !proofFile}>
                      {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Submit proof
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <PaymentGuidelines data={guidelines} />
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerPayment;
