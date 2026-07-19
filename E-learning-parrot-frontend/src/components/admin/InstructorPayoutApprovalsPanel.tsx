import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Wallet, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  approveInstructorPayout,
  getAdminInstructorPayouts,
  rejectInstructorPayout,
  type AdminPayoutRequest,
} from "@/api/axios";
import { SmartSearchInput } from "@/components/admin/SmartSearchInput";
import { filterBySmartSearch } from "@/lib/smartSearch";

const statusBadge = (status: string) => {
  const s = status.toLowerCase();
  if (s === "pending" || s === "processing") return "bg-amber-500 hover:bg-amber-500 text-white border-0";
  if (s === "paid" || s === "approved" || s === "completed") return "bg-emerald-600 hover:bg-emerald-600 text-white border-0";
  if (s === "rejected") return "bg-red-600 hover:bg-red-600 text-white border-0";
  return "";
};

type Props = {
  compact?: boolean;
  onUpdated?: () => void;
};

export function InstructorPayoutApprovalsPanel({ compact = false, onUpdated }: Props) {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<AdminPayoutRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminPayoutRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getAdminInstructorPayouts();
      setPayouts(data.payoutRequests ?? []);
      setPendingCount(data.pendingCount ?? 0);
      setPendingAmount(data.pendingAmount ?? 0);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err?.response?.status === 404
          ? "Payout API not found. Start the Laravel backend (php artisan serve) and run route:clear."
          : err?.code === "ERR_NETWORK"
            ? "Cannot reach the API. Start the backend on http://127.0.0.1:8000 and run npm run dev for the frontend."
            : "Could not load instructor payout requests.");
      setLoadError(message);
      setPayouts([]);
      setPendingCount(0);
      setPendingAmount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingPayouts = useMemo(
    () => payouts.filter((p) => ["pending", "processing"].includes((p.status ?? "").toLowerCase())),
    [payouts]
  );

  const filteredPendingPayouts = useMemo(
    () =>
      filterBySmartSearch(pendingPayouts, search, (row) => [
        row.instructor_name,
        row.instructor_email,
        row.amount,
        row.status,
        row.payment_method,
        row.payment_method_label,
        row.payment_details,
        row.notes,
        row.created_at,
      ]),
    [pendingPayouts, search]
  );

  const historyPayouts = useMemo(
    () => payouts.filter((p) => !["pending", "processing"].includes((p.status ?? "").toLowerCase())),
    [payouts]
  );

  const filteredHistoryPayouts = useMemo(
    () =>
      filterBySmartSearch(historyPayouts, search, (row) => [
        row.instructor_name,
        row.instructor_email,
        row.amount,
        row.status,
        row.payment_method,
        row.payment_method_label,
        row.payment_details,
        row.notes,
        row.created_at,
        row.processed_at,
      ]),
    [historyPayouts, search]
  );

  const displayedHistoryPayouts = useMemo(
    () => (search.trim() ? filteredHistoryPayouts : filteredHistoryPayouts.slice(0, compact ? 3 : 8)),
    [filteredHistoryPayouts, search, compact]
  );

  const searchResultCount = filteredPendingPayouts.length + filteredHistoryPayouts.length;

  const notifyUpdated = async () => {
    await load();
    onUpdated?.();
  };

  const handleApprove = async (row: AdminPayoutRequest) => {
    setBusyId(row.id);
    try {
      const res = await approveInstructorPayout(row.id);
      toast({
        title: "Payout approved",
        description: res.message || `$${row.amount.toFixed(2)} marked as paid.`,
      });
      await notifyUpdated();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Approval failed",
        description: err?.response?.data?.message || "Could not approve payout.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      const res = await rejectInstructorPayout(rejectTarget.id, rejectReason.trim() || undefined);
      toast({
        title: "Payout rejected",
        description: res.message || "Funds returned to instructor balance.",
      });
      setRejectTarget(null);
      setRejectReason("");
      await notifyUpdated();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Rejection failed",
        description: err?.response?.data?.message || "Could not reject payout.",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Card
        id="instructor-payout-approvals"
        className="border-2 border-amber-400/90 bg-gradient-to-r from-amber-50 via-white to-orange-50 shadow-md ring-1 ring-amber-200/60"
      >
        <CardHeader className={compact ? "pb-2" : "pb-3"}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className={`flex items-center gap-2 text-amber-950 ${compact ? "text-base" : "text-lg"}`}>
                <Wallet className="h-5 w-5 text-amber-700" />
                Instructor payout approvals
              </CardTitle>
              <CardDescription>
                Approve or reject instructor withdrawal requests before sending funds.
              </CardDescription>
            </div>
            <Badge className="w-fit bg-amber-600 hover:bg-amber-600 text-white border-0 text-sm px-3 py-1.5">
              {pendingCount} pending · ${pendingAmount.toFixed(2)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!compact && !loadError && !loading ? (
            <SmartSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search instructor, payment method, amount, status…"
              resultCount={search.trim() ? searchResultCount : undefined}
              totalCount={payouts.length}
            />
          ) : null}

          {loadError && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 flex gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Could not load payout requests</p>
                <p className="mt-1">{loadError}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading payout requests...
            </div>
          ) : loadError ? null : pendingPayouts.length === 0 && !search.trim() ? (
            <div className="rounded-xl border border-dashed bg-white/70 p-6 text-center">
              <CheckCircle2 className="h-9 w-9 mx-auto mb-2 text-emerald-600" />
              <p className="font-medium">No pending payout requests</p>
              <p className="text-sm text-muted-foreground mt-1">
                Use the search above to find past payout decisions.
              </p>
            </div>
          ) : filteredPendingPayouts.length === 0 && search.trim() && displayedHistoryPayouts.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-white/70 p-6 text-center">
              <p className="font-medium">No payouts match your search</p>
            </div>
          ) : filteredPendingPayouts.length === 0 ? null : (
            <div className="rounded-xl border overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Amount</TableHead>
                    {!compact && <TableHead>Payment</TableHead>}
                    {!compact && <TableHead>Details</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPendingPayouts.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">
                        {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{row.instructor_name || "Instructor"}</p>
                        <p className="text-xs text-muted-foreground">{row.instructor_email}</p>
                      </TableCell>
                      <TableCell className="font-semibold text-[#0A0A0A]">${row.amount.toFixed(2)}</TableCell>
                      {!compact && (
                        <TableCell className="text-sm">
                          {row.payment_method_label || row.payment_method || "—"}
                        </TableCell>
                      )}
                      {!compact && (
                        <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                          {row.payment_details || row.notes || "—"}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500"
                            disabled={busyId === row.id}
                            onClick={() => handleApprove(row)}
                          >
                            {busyId === row.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            disabled={busyId === row.id}
                            onClick={() => setRejectTarget(row)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!compact && displayedHistoryPayouts.length > 0 && !loadError && (
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">
                {search.trim() ? "Matching payout history" : "Recent decisions"}
              </p>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Date</TableHead>
                      <TableHead>Instructor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedHistoryPayouts.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {row.processed_at
                            ? new Date(row.processed_at).toLocaleDateString()
                            : row.created_at
                              ? new Date(row.created_at).toLocaleDateString()
                              : "—"}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{row.instructor_name || "Instructor"}</p>
                          <p className="text-xs text-muted-foreground">{row.instructor_email}</p>
                        </TableCell>
                        <TableCell>${row.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.payment_method_label || row.payment_method || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusBadge(row.status)}>{row.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject payout request?</AlertDialogTitle>
            <AlertDialogDescription>
              Rejecting ${rejectTarget?.amount.toFixed(2)} returns the amount to the instructor&apos;s available balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Optional reason for the instructor..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={busyId === rejectTarget?.id}
              onClick={(e) => {
                e.preventDefault();
                handleReject();
              }}
            >
              Reject payout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default InstructorPayoutApprovalsPanel;
