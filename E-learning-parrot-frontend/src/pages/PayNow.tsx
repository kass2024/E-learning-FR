import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  getPublicPayNowCatalog,
  requestPublicPayNow,
  getPublicPayNowStatus,
  type PublicPayNowCourse,
} from "@/api/axios";
import { ArrowLeft, CheckCircle2, Loader2, Smartphone } from "lucide-react";

const PayNow = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<PublicPayNowCourse[]>([]);
  const [configured, setConfigured] = useState(false);
  const [receiverPhone, setReceiverPhone] = useState<string | null>(null);
  const [currency, setCurrency] = useState("RWF");

  const selectedId = Number(searchParams.get("course") || 0) || null;
  const selected = useMemo(
    () => courses.find((c) => c.id === selectedId) ?? null,
    [courses, selectedId]
  );

  const [payerName, setPayerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [payStatus, setPayStatus] = useState<string | null>(null);
  const [receiptEmailed, setReceiptEmailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getPublicPayNowCatalog()
      .then((data) => {
        setCourses(data.courses || []);
        setConfigured(Boolean(data.configured));
        setReceiverPhone(data.receiver_phone || null);
        setCurrency(data.currency || "RWF");
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Unable to load courses",
          description: "Please refresh and try again.",
        });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (selected) {
      setAmount(String(selected.price));
    }
  }, [selected?.id]);

  useEffect(() => {
    if (!transactionId) return;
    let cancelled = false;
    let failureToasted = false;
    const tick = async () => {
      try {
        const res = await getPublicPayNowStatus(transactionId);
        if (cancelled) return;
        setPayStatus(res.payment.status);
        setReceiptEmailed(Boolean(res.payment.receipt_emailed));
        const err = res.payment?.error_message || (res.payment?.status === "failed" ? res.message : null);
        if (err) setErrorMessage(String(err));
        if (res.payment?.status === "failed" && err && !failureToasted) {
          failureToasted = true;
          toast({
            variant: "destructive",
            title: "Payment failed",
            description: String(err),
          });
        }
      } catch {
        /* ignore poll errors */
      }
    };
    tick();
    const id = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [transactionId, toast]);

  const selectCourse = (id: number) => {
    setSearchParams({ course: String(id) });
    setTransactionId(null);
    setPayStatus(null);
    setReceiptEmailed(false);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const amountNum = Math.floor(Number(amount));
    if (!Number.isFinite(amountNum) || amountNum < 1) {
      toast({ variant: "destructive", title: "Enter a valid amount" });
      return;
    }
    if (amountNum > selected.price) {
      toast({
        variant: "destructive",
        title: "Amount too high",
        description: `Maximum for this course is ${selected.price.toLocaleString()} ${currency}.`,
      });
      return;
    }
    try {
      setBusy(true);
      const res = await requestPublicPayNow({
        course_id: selected.id,
        amount: amountNum,
        phone,
        email,
        payer_name: payerName || undefined,
      });
      setTransactionId(res.transaction_id || res.payment?.transaction_id || null);
      setPayStatus(res.payment?.status || "processing");
      setErrorMessage(null);
      toast({
        title: "Check your phone",
        description: res.message || "Approve the Mobile Money prompt.",
      });
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.payment?.error_message ||
        "Unable to start payment.";
      setErrorMessage(String(msg));
      toast({
        variant: "destructive",
        title: "Payment error",
        description: String(msg),
      });
    } finally {
      setBusy(false);
    }
  };

  const paid = payStatus === "paid" || payStatus === "succeeded" || payStatus === "completed";
  const failed = payStatus === "failed" || payStatus === "cancelled" || payStatus === "canceled";

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-3 text-slate-600">
        <Loader2 className="h-6 w-6 animate-spin text-[#0070D0]" />
        Loading payable courses…
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="mb-8">
        <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Home
        </Button>
        <h1 className="text-3xl font-bold text-[#0070D0]">Pay Now</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Pay for any course without creating an account. Enter the amount (up to the course maximum),
          approve Mobile Money on your phone, and we email a PDF receipt to the address you provide.
          This payment is not linked to a learner login.
        </p>
        {receiverPhone ? (
          <p className="text-sm text-slate-500 mt-2">Funds are received on MoMo: {receiverPhone}</p>
        ) : null}
      </div>

      {!selected ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                No payable courses are available right now.
              </CardContent>
            </Card>
          ) : (
            courses.map((course) => (
              <Card key={course.id} className="hover:border-[#0070D0]/40 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg text-[#0070D0]">{course.title}</CardTitle>
                  <CardDescription>
                    Max:{" "}
                    <span className="font-semibold text-slate-800">
                      {course.price.toLocaleString()} {course.currency}
                    </span>
                    {course.duration ? ` · ${course.duration}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {course.description ? (
                    <p className="text-sm text-slate-600 line-clamp-3">{course.description}</p>
                  ) : null}
                  <Button className="bg-[#0070D0] hover:bg-[#0059a8]" onClick={() => selectCourse(course.id)}>
                    Proceed to pay
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <button
                type="button"
                className="text-sm text-[#0070D0] mb-2 text-left"
                onClick={() => setSearchParams({})}
              >
                ← All courses
              </button>
              <CardTitle>{selected.title}</CardTitle>
              <CardDescription>
                Maximum payable:{" "}
                <strong>
                  {selected.price.toLocaleString()} {currency}
                </strong>
                . You may pay any amount up to this maximum.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paid ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                  <h3 className="font-semibold text-emerald-900">Payment received</h3>
                  <p className="text-sm text-emerald-800">
                    {receiptEmailed
                      ? `A PDF receipt was sent to ${email}.`
                      : `Payment confirmed. Receipt will be emailed to ${email} shortly.`}
                  </p>
                  <p className="text-xs text-slate-500">Ref: {transactionId}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {failed && errorMessage ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <strong className="block mb-1">Payment failed</strong>
                      {errorMessage}
                    </div>
                  ) : null}
                  {!failed && errorMessage ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      {errorMessage}
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount to pay ({currency})</Label>
                    <Input
                      id="amount"
                      type="number"
                      min={1}
                      max={selected.price}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name (optional)</Label>
                    <Input id="name" value={payerName} onChange={(e) => setPayerName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email for PDF receipt</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Money number</Label>
                    <Input
                      id="phone"
                      placeholder="0788 XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  {!configured ? (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                      Mobile Money gateway is not configured yet. Please try again later or contact support.
                    </p>
                  ) : null}
                  <Button
                    type="submit"
                    disabled={busy || !configured}
                    className="w-full bg-[#0070D0] hover:bg-[#0059a8]"
                  >
                    {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Smartphone className="h-4 w-4 mr-2" />}
                    Pay with Mobile Money
                  </Button>
                  {transactionId && !paid ? (
                    <p className="text-sm text-slate-600 text-center">
                      Waiting for confirmation… Ref: {transactionId}
                      {payStatus ? ` (${payStatus})` : ""}
                    </p>
                  ) : null}
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 h-fit">
            <CardHeader>
              <CardTitle className="text-base">How it works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <p>1. Choose a course and enter any amount up to the maximum.</p>
              <p>2. Provide the email that should receive the PDF receipt.</p>
              <p>3. Approve the MoMo prompt on your phone.</p>
              <p>4. We email your receipt automatically — no login required.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PayNow;
