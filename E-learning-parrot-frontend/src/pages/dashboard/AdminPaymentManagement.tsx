import { useMemo, useState } from "react";
import { CreditCard, Loader2, Plus, RefreshCw, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPageHeader";
import { SmartSearchInput } from "@/components/admin/SmartSearchInput";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import {
  createCoursePromoCode,
  getAdminAnalytics,
  getAdminPayments,
  getCoursePromoCodes,
  getCourses,
  updateAdminPaymentStatus,
  updateCoursePromoCode,
  type AdminPaymentRow,
  type CoursePromoCodeRow,
} from "@/api/axios";
import { useToast } from "@/components/ui/use-toast";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { invalidateDashboardCache } from "@/lib/dashboardCache";
import { filterBySmartSearch } from "@/lib/smartSearch";

const STATUS_OPTIONS = ["pending", "processing", "proof_pending", "paid", "succeeded", "completed", "failed", "cancelled", "refunded"];

function statusBadge(status: string) {
  const lower = status.toLowerCase();
  if (["paid", "succeeded", "completed"].includes(lower)) return "default";
  if (["failed", "cancelled", "refunded"].includes(lower)) return "destructive";
  if (lower === "proof_pending") return "outline";
  return "secondary";
}

const AdminPaymentManagement = () => {
  const { toast } = useToast();
  const {
    data: paymentsData,
    loading,
    refreshing,
    reload: reloadPayments,
  } = useDashboardQuery<AdminPaymentRow[]>("admin-payments", getAdminPayments);
  const { data: analytics } = useDashboardQuery("admin-analytics", getAdminAnalytics);
  const {
    data: promosData,
    loading: promosLoading,
    reload: reloadPromos,
  } = useDashboardQuery<CoursePromoCodeRow[]>("course-promo-codes", getCoursePromoCodes);
  const { data: coursesData } = useDashboardQuery("admin-courses-for-promo", () => getCourses());
  const payments = paymentsData ?? [];
  const promos = promosData ?? [];
  const courses = Array.isArray(coursesData) ? coursesData : [];
  const summary = useMemo(
    () => ({
      totalRevenue: analytics?.summary?.totalRevenue ?? 0,
      pendingPayments: analytics?.summary?.pendingPayments ?? 0,
      provider: analytics?.summary?.paymentProvider ?? "Stripe",
    }),
    [analytics]
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoLabel, setPromoLabel] = useState("");
  const [promoMaxUses, setPromoMaxUses] = useState("100");
  const [promoExpiresAt, setPromoExpiresAt] = useState("");
  const [promoCourseId, setPromoCourseId] = useState<string>("all");
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [togglingPromoId, setTogglingPromoId] = useState<number | null>(null);

  const filteredPayments = useMemo(
    () =>
      filterBySmartSearch(payments, search, (payment) => [
        payment.student_name,
        payment.student_email,
        payment.course_title,
        payment.course_id,
        payment.currency,
        payment.amount,
        payment.provider,
        payment.status,
        payment.paid_at,
        payment.created_at,
      ]),
    [payments, search]
  );

  const load = async () => {
    invalidateDashboardCache("admin-payments");
    invalidateDashboardCache("admin-analytics");
    invalidateDashboardCache("course-promo-codes");
    await Promise.all([reloadPayments(), reloadPromos()]);
  };

  const handleStatusChange = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await updateAdminPaymentStatus(id, status);
      toast({ title: "Payment updated", description: `Status set to ${status}.` });
      invalidateDashboardCache("admin-payments");
      invalidateDashboardCache("admin-analytics");
      await reloadPayments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error?.response?.data?.message || "Could not update payment.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreatePromo = async () => {
    if (!promoCode.trim()) return;
    setCreatingPromo(true);
    try {
      const maxUses = Math.max(1, Number.parseInt(promoMaxUses, 10) || 100);
      await createCoursePromoCode({
        code: promoCode.trim(),
        label: promoLabel.trim() || undefined,
        max_uses: maxUses,
        expires_at: promoExpiresAt || undefined,
        course_id: promoCourseId === "all" ? null : Number(promoCourseId),
      });
      setPromoCode("");
      setPromoLabel("");
      setPromoMaxUses("100");
      setPromoExpiresAt("");
      setPromoCourseId("all");
      toast({ title: "Promo code created", description: "Learners can use it on Pay & Enroll." });
      invalidateDashboardCache("course-promo-codes");
      await reloadPromos();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not create promo code",
        description: error?.response?.data?.message || "Request failed.",
      });
    } finally {
      setCreatingPromo(false);
    }
  };

  const handleTogglePromo = async (promo: CoursePromoCodeRow) => {
    setTogglingPromoId(promo.id);
    try {
      await updateCoursePromoCode(promo.id, { is_active: !promo.is_active });
      toast({
        title: promo.is_active ? "Promo code deactivated" : "Promo code activated",
      });
      invalidateDashboardCache("course-promo-codes");
      await reloadPromos();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error?.response?.data?.message || "Could not update promo code.",
      });
    } finally {
      setTogglingPromoId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Payment Management"
        description="Mobile Money, promo codes, and payment-proof enrollments. Mark proof_pending rows as paid after verification."
      >
        <Button onClick={() => void load()} disabled={refreshing} className="bg-[#FCC400] hover:bg-[#E79A4D] text-slate-900">
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </AdminPageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminStatCard label="Payment provider" value={summary.provider || "Mobile Money"} hint="MoPay / proof / promo" />
        <AdminStatCard label="Total revenue" value={`${summary.totalRevenue.toLocaleString()} RWF`} />
        <AdminStatCard label="Pending payments" value={summary.pendingPayments} />
      </div>

      <Card className="overflow-hidden border-0 shadow-md ring-1 ring-[#0070D0]/10">
        <div className="h-1 bg-gradient-to-r from-[#0070D0] via-[#1A8AD8] to-[#FCC400]" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-[#0070D0]">
            <Ticket className="h-5 w-5" />
            Student course promo codes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Codes learners enter on Pay & Enroll to unlock a course without Mobile Money. Leave course blank for all courses.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <div className="rounded-xl border border-dashed border-[#0070D0]/20 bg-[#0070D0]/[0.02] p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="course-promo-code">Code</Label>
                <Input
                  id="course-promo-code"
                  className="h-10 font-mono uppercase border-[#0070D0]/15"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="FRWANDA2026"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-promo-label">Label (optional)</Label>
                <Input
                  id="course-promo-label"
                  className="h-10 border-[#0070D0]/15"
                  value={promoLabel}
                  onChange={(e) => setPromoLabel(e.target.value)}
                  placeholder="Internal note"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-promo-max">Max uses</Label>
                <Input
                  id="course-promo-max"
                  type="number"
                  min={1}
                  className="h-10 border-[#0070D0]/15"
                  value={promoMaxUses}
                  onChange={(e) => setPromoMaxUses(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-promo-expires">Expires (optional)</Label>
                <Input
                  id="course-promo-expires"
                  type="date"
                  className="h-10 border-[#0070D0]/15"
                  value={promoExpiresAt}
                  onChange={(e) => setPromoExpiresAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <Label>Course scope</Label>
                <Select value={promoCourseId} onValueChange={setPromoCourseId}>
                  <SelectTrigger className="h-10 border-[#0070D0]/15">
                    <SelectValue placeholder="All courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All courses</SelectItem>
                    {courses.map((course: { id: number; title?: string }) => (
                      <SelectItem key={course.id} value={String(course.id)}>
                        {course.title || `Course #${course.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => void handleCreatePromo()}
              disabled={creatingPromo || !promoCode.trim()}
              className="h-10 bg-[#0070D0] hover:bg-[#1A8AD8]"
            >
              {creatingPromo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create promo code
            </Button>
          </div>

          {promosLoading && !promosData ? (
            <TableSkeleton rows={4} cols={6} />
          ) : promos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No student course promo codes yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promos.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell className="font-mono font-semibold text-[#0070D0]">{promo.code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{promo.label || "—"}</TableCell>
                      <TableCell className="text-sm">{promo.course_title || "All courses"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {promo.uses_count}/{promo.max_uses}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={promo.is_active ? "default" : "secondary"}>
                          {promo.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={togglingPromoId === promo.id}
                          onClick={() => void handleTogglePromo(promo)}
                        >
                          {togglingPromoId === promo.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : promo.is_active ? (
                            "Deactivate"
                          ) : (
                            "Activate"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            All payments
          </CardTitle>
          <SmartSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search student, course, amount, status…"
            resultCount={filteredPayments.length}
            totalCount={payments.length}
            className="w-full sm:w-80"
          />
        </CardHeader>
        <CardContent>
          {loading && !paymentsData ? (
            <TableSkeleton rows={8} cols={7} />
          ) : payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No payment records yet. They appear when learners pay via Mobile Money, promo, or proof upload.
            </p>
          ) : filteredPayments.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No payments match your search.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.student_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{payment.student_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{payment.course_title || `#${payment.course_id}`}</TableCell>
                      <TableCell>
                        {payment.currency} {Number(payment.amount).toLocaleString()}
                        {payment.proof_url ? (
                          <a
                            href={payment.proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs text-primary underline mt-1"
                          >
                            View proof
                          </a>
                        ) : null}
                        {payment.promo_code ? (
                          <span className="block text-xs text-muted-foreground mt-1">Promo: {payment.promo_code}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="capitalize">{payment.provider}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadge(payment.status) as any}>{payment.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.paid_at
                          ? new Date(payment.paid_at).toLocaleDateString()
                          : payment.created_at
                            ? new Date(payment.created_at).toLocaleDateString()
                            : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={payment.status}
                          onValueChange={(value) => handleStatusChange(payment.id, value)}
                          disabled={updatingId === payment.id}
                        >
                          <SelectTrigger className="w-[140px] ml-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaymentManagement;
