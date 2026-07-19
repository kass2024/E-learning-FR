import { useEffect, useMemo, useState, FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, DollarSign, Wallet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  getInstructorDashboard,
  getInstructorPayoutPaymentOptions,
  getInstructorPayoutRequests,
  requestInstructorPayout,
  type InstructorDashboardData,
  type InstructorPayoutPaymentOption,
  type InstructorPayoutRequestRow,
} from "@/api/axios";
import { AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPageHeader";
import { fetchDashboardCached, readDashboardCache } from "@/lib/dashboardCache";
import { dashboardCacheKey, resolveInstructorEmail } from "@/lib/dashboardUser";
import { initialDashboardLoading, readCachedDashboardData } from "@/lib/dashboardInitialLoad";

const paymentDetailsPlaceholder = (method: string) => {
  switch (method) {
    case "bank_transfer":
      return "Bank name and account number";
    case "mtn_momo":
    case "airtel_money":
      return "Mobile money phone number";
    case "paypal":
      return "PayPal email address";
    case "wise":
      return "Wise account email or transfer details";
    case "cash":
      return "Pickup location or contact number";
    default:
      return "Account number, email, or reference";
  }
};

const statusBadgeClass = (status: string) => {
  const s = status.toLowerCase();
  if (s === "pending" || s === "processing") return "bg-amber-500 hover:bg-amber-500 text-white border-0";
  if (s === "paid" || s === "approved" || s === "completed") return "bg-emerald-600 hover:bg-emerald-600 text-white border-0";
  if (s === "rejected") return "bg-red-600 hover:bg-red-600 text-white border-0";
  return "";
};

const InstructorEarnings = () => {
  const { toast } = useToast();
  const email = resolveInstructorEmail() || null;
  const dashboardCache = email ? dashboardCacheKey("instructor-dashboard", email) : "";
  const payoutsCache = email ? dashboardCacheKey("instructor-payout-requests", email) : "";

  const initialDashboard = dashboardCache
    ? readCachedDashboardData<InstructorDashboardData>(dashboardCache)
    : null;
  const initialPayouts = payoutsCache
    ? readCachedDashboardData<{ payoutRequests?: InstructorPayoutRequestRow[] }>(payoutsCache)
    : null;
  const initialOptions = readCachedDashboardData<{ paymentMethods?: InstructorPayoutPaymentOption[] }>(
    "instructor-payout-options",
  );

  const [dashboard, setDashboard] = useState<InstructorDashboardData | null>(initialDashboard);
  const [payouts, setPayouts] = useState<InstructorPayoutRequestRow[]>(
    () => initialPayouts?.payoutRequests ?? [],
  );
  const [paymentOptions, setPaymentOptions] = useState<InstructorPayoutPaymentOption[]>(
    () => initialOptions?.paymentMethods ?? [],
  );
  const [loading, setLoading] = useState(() =>
    dashboardCache ? initialDashboardLoading(dashboardCache) : !email,
  );
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const detailsPlaceholder = useMemo(
    () => paymentDetailsPlaceholder(paymentMethod),
    [paymentMethod]
  );

  const load = async () => {
    if (!email) return;
    if (!readDashboardCache(dashboardCache)) setLoading(true);
    try {
      const [dashResult, payoutResult, optionsResult] = await Promise.all([
        fetchDashboardCached(dashboardCache, () => getInstructorDashboard(email)),
        fetchDashboardCached(payoutsCache, () => getInstructorPayoutRequests(email)),
        fetchDashboardCached("instructor-payout-options", getInstructorPayoutPaymentOptions),
      ]);
      setDashboard(dashResult.data);
      setPayouts(payoutResult.data.payoutRequests ?? []);
      setPaymentOptions(optionsResult.data.paymentMethods ?? []);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.response?.data?.message || "Unable to load earnings.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePayout = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const value = parseFloat(amount);
    if (!value || value <= 0) {
      toast({ variant: "destructive", title: "Invalid amount", description: "Enter a valid payout amount." });
      return;
    }

    if (!paymentMethod) {
      toast({ variant: "destructive", title: "Payment method required", description: "Choose how you want to be paid." });
      return;
    }

    setSubmitting(true);
    try {
      await requestInstructorPayout({
        instructor_email: email,
        amount: value,
        payment_method: paymentMethod,
        payment_details: paymentDetails.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast({ title: "Payout requested", description: "Your request has been submitted for admin review." });
      setAmount("");
      setPaymentMethod("");
      setPaymentDetails("");
      setNotes("");
      await load();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Request failed",
        description: err?.response?.data?.message || "Could not submit payout request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const summary = dashboard?.summary;

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Instructor"
        title="Track Earnings & Payouts"
        description="Monitor course revenue, your instructor share, and request payouts."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Total revenue" value={`$${(summary?.totalRevenue ?? 0).toFixed(2)}`} />
        <AdminStatCard label="Your earnings" value={`$${(summary?.totalEarnings ?? 0).toFixed(2)}`} hint={`${summary?.instructorSharePercent ?? 70}% share`} />
        <AdminStatCard label="Available balance" value={`$${(summary?.availableBalance ?? 0).toFixed(2)}`} />
        <AdminStatCard label="Paid out" value={`$${(summary?.paidOut ?? 0).toFixed(2)}`} hint={`$${(summary?.pendingPayouts ?? 0).toFixed(2)} pending`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Request payout
            </CardTitle>
            <CardDescription>
              Available: ${(summary?.availableBalance ?? 0).toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePayout} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment_method">
                    <SelectValue placeholder="Select how you want to be paid" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_details">Payment details</Label>
                <Input
                  id="payment_details"
                  placeholder={paymentMethod ? detailsPlaceholder : "Select a payment method first"}
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  disabled={!paymentMethod}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Additional notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any extra instructions for the admin..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <Button
                type="submit"
                disabled={submitting || !paymentMethod || (summary?.availableBalance ?? 0) <= 0}
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                Submit payout request
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Earnings by course</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(dashboard?.courses ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No course earnings yet.</p>
            ) : (
              (dashboard?.courses ?? []).map((course) => (
                <div key={course.id} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{course.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {course.paid_enrollments_count ?? 0} paid · ${(course.revenue ?? 0).toFixed(2)} revenue
                    </p>
                  </div>
                  <span className="font-semibold text-primary">${(course.earnings ?? 0).toFixed(2)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout history</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payout requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment method</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>${row.amount.toFixed(2)}</TableCell>
                    <TableCell>{row.payment_method_label || row.payment_method || "—"}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {row.payment_details || row.notes || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass(row.status)}>{row.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstructorEarnings;
