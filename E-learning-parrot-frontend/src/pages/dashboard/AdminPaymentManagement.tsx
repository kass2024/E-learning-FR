import { useMemo, useState } from "react";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  getAdminAnalytics,
  getAdminPayments,
  updateAdminPaymentStatus,
  type AdminPaymentRow,
} from "@/api/axios";
import { useToast } from "@/components/ui/use-toast";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { invalidateDashboardCache } from "@/lib/dashboardCache";
import { filterBySmartSearch } from "@/lib/smartSearch";
const STATUS_OPTIONS = ["pending", "processing", "paid", "succeeded", "completed", "failed", "cancelled", "refunded"];

function statusBadge(status: string) {
  const lower = status.toLowerCase();
  if (["paid", "succeeded", "completed"].includes(lower)) return "default";
  if (["failed", "cancelled", "refunded"].includes(lower)) return "destructive";
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
  const payments = paymentsData ?? [];
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
    await reloadPayments();
  };
  const handleStatusChange = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await updateAdminPaymentStatus(id, status);
      toast({ title: "Payment updated", description: `Status set to ${status}.` });
      invalidateDashboardCache("admin-payments");
      invalidateDashboardCache("admin-analytics");
      await reloadPayments();    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error?.response?.data?.message || "Could not update payment.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Payment Management"
        description="Monitor Stripe checkout sessions and update payment statuses."
      >
        <Button onClick={() => void load()} disabled={refreshing} className="bg-[#FCC400] hover:bg-[#E79A4D] text-slate-900">
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}          Refresh
        </Button>
      </AdminPageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminStatCard label="Payment provider" value={summary.provider} hint="Students pay via Stripe" />
        <AdminStatCard label="Total revenue" value={`$${summary.totalRevenue.toFixed(2)}`} />
        <AdminStatCard label="Pending payments" value={summary.pendingPayments} />
      </div>

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
              No payment records yet. Payments appear when learners start Stripe checkout.
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
                        {payment.currency} ${payment.amount.toFixed(2)}
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
