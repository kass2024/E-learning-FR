import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  approvePlatformInstitution,
  createInstitutionPromoCode,
  deletePlatformInstitution,
  disablePlatformInstitution,
  enablePlatformInstitution,
  getInstitutionPromoCodes,
  getPlatformInstitutions,
  resendInstitutionCredentials,
  sendInstitutionPaymentReminder,
  type PlatformInstitutionInfo,
} from "@/api/axios";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import InstitutionAdminEditDialog from "@/components/dashboard/InstitutionAdminEditDialog";
import InstitutionAdminCreateDialog from "@/components/dashboard/InstitutionAdminCreateDialog";
import { startAdminInstitutionViewAs } from "@/lib/adminImpersonation";
import {
  Building2,
  Mail,
  ShieldOff,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  Settings2,
  Eye,
  MoreHorizontal,
  Search,
  RefreshCw,
  KeyRound,
  Ticket,
  Loader2,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Link2,
  LogIn,
  Globe2,
} from "lucide-react";
import { getPublicStorageUrl } from "@/lib/apiConfig";
import { buildInstitutionLearnerLoginUrl, buildInstitutionLearnerSignupUrl, buildInstitutionPortalUrl } from "@/lib/institutionSignupLink";

type InstitutionRow = PlatformInstitutionInfo & {
  owner?: { id: number; name: string; email: string; status: string } | null;
  total_paid_cents?: number;
  payments_count?: number;
};

type SortKey = "name" | "status" | "payment_status" | "approved_at" | "total_paid_cents";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "bg-[#0070D0]/10 text-[#0070D0] border-[#0070D0]/20";
    case "pending_approval":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "disabled":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function paymentBadgeClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "unpaid":
      return "bg-red-100 text-red-700 border-red-200";
    case "promo":
      return "bg-violet-100 text-violet-800 border-violet-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

const AdminInstitutionManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, loading, refreshing, reload } = useDashboardQuery("platform-institutions", getPlatformInstitutions);
  const { data: promos, reload: reloadPromos } = useDashboardQuery("institution-promos", getInstitutionPromoCodes);
  const rows = useMemo(() => (Array.isArray(data) ? (data as InstitutionRow[]) : []), [data]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("approved_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [promoCode, setPromoCode] = useState("");
  const [promoLabel, setPromoLabel] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [creatingPromo, setCreatingPromo] = useState(false);

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      pending: rows.filter((r) => r.status === "pending_approval").length,
      unpaid: rows.filter((r) => r.payment_status === "unpaid").length,
      revenue: rows.reduce((sum, r) => sum + (r.total_paid_cents ?? 0), 0) / 100,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (paymentFilter !== "all" && row.payment_status !== paymentFilter) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.contact_email.toLowerCase().includes(q) ||
        (row.owner?.name ?? "").toLowerCase().includes(q) ||
        (row.owner?.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter, paymentFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "payment_status":
          cmp = a.payment_status.localeCompare(b.payment_status);
          break;
        case "total_paid_cents":
          cmp = (a.total_paid_cents ?? 0) - (b.total_paid_cents ?? 0);
          break;
        case "approved_at": {
          const da = a.approved_at ? new Date(a.approved_at).getTime() : 0;
          const db = b.approved_at ? new Date(b.approved_at).getTime() : 0;
          cmp = da - db;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, sorted.length);
  const pageRows = useMemo(
    () => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sorted, currentPage, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, paymentFilter, pageSize, sortKey, sortDir]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3.5 w-3.5 text-[#0070D0]" />
    ) : (
      <ArrowDown className="ml-1 inline h-3.5 w-3.5 text-[#0070D0]" />
    );
  };

  const refresh = async () => {
    await reload();
    await reloadPromos();
  };

  const withAction = async (id: number, fn: () => Promise<unknown>, success: string) => {
    setActionId(id);
    try {
      await fn();
      toast({ title: success });
      await refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Action failed", description: msg });
    } finally {
      setActionId(null);
    }
  };

  const handleViewDashboard = (row: InstitutionRow) => {
    startAdminInstitutionViewAs({
      institution: row,
      ownerName: row.owner?.name ?? row.name,
      ownerEmail: row.owner?.email ?? row.contact_email,
      returnPath: "/dashboard/institutions",
    });
    toast({ title: `Previewing ${row.name}` });
    navigate("/dashboard/admin");
  };

  const handleCreatePromo = async () => {
    if (!promoCode.trim()) return;
    setCreatingPromo(true);
    try {
      await createInstitutionPromoCode({ code: promoCode.trim(), label: promoLabel || undefined });
      setPromoCode("");
      setPromoLabel("");
      toast({ title: "Promo code created" });
      await reloadPromos();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Failed", description: msg });
    } finally {
      setCreatingPromo(false);
    }
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);

  const copyPortalLink = async (row: InstitutionRow) => {
    if (!row.slug) {
      toast({ variant: "destructive", title: "No website slug for this institution" });
      return;
    }
    try {
      await navigator.clipboard.writeText(buildInstitutionPortalUrl(row.slug));
      toast({ title: "Website link copied", description: row.name });
    } catch {
      toast({ variant: "destructive", title: "Could not copy link" });
    }
  };

  const copySignupLink = async (row: InstitutionRow) => {
    if (!row.slug) {
      toast({ variant: "destructive", title: "No signup slug for this institution" });
      return;
    }
    try {
      await navigator.clipboard.writeText(buildInstitutionLearnerSignupUrl(row.slug));
      toast({ title: "Signup link copied", description: row.name });
    } catch {
      toast({ variant: "destructive", title: "Could not copy link" });
    }
  };

  const copyLoginLink = async (row: InstitutionRow) => {
    if (!row.slug) {
      toast({ variant: "destructive", title: "No login slug for this institution" });
      return;
    }
    try {
      await navigator.clipboard.writeText(buildInstitutionLearnerLoginUrl(row.slug));
      toast({ title: "Login link copied", description: row.name });
    } catch {
      toast({ variant: "destructive", title: "Could not copy link" });
    }
  };

  const renderRowActions = (row: InstitutionRow) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        title="Preview dashboard"
        onClick={() => handleViewDashboard(row)}
        disabled={row.status === "disabled"}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        title="Manage"
        onClick={() => {
          setEditId(row.id);
          setEditOpen(true);
        }}
      >
        <Settings2 className="h-4 w-4" />
      </Button>
      {row.status === "pending_approval" && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
          title="Approve"
          disabled={actionId === row.id}
          onClick={() => void withAction(row.id, () => approvePlatformInstitution(row.id), "Institution approved")}
        >
          {actionId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={actionId === row.id}>
            {actionId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => void copyPortalLink(row)} disabled={!row.slug || row.status !== "active"}>
            <Globe2 className="mr-2 h-4 w-4" />
            Copy website link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void copySignupLink(row)} disabled={!row.slug || row.status !== "active"}>
            <Link2 className="mr-2 h-4 w-4" />
            Copy signup link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void copyLoginLink(row)} disabled={!row.slug || row.status !== "active"}>
            <LogIn className="mr-2 h-4 w-4" />
            Copy login link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {row.payment_status === "unpaid" && (
            <DropdownMenuItem
              onClick={() =>
                void withAction(row.id, () => sendInstitutionPaymentReminder(row.id), "Payment reminder sent")
              }
            >
              <Mail className="mr-2 h-4 w-4" />
              Send payment link
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={async () => {
              setActionId(row.id);
              try {
                const res = await resendInstitutionCredentials(row.id);
                toast({
                  title: "Owner login reset",
                  description: res.password ? `${res.message} Password: ${res.password}` : res.message,
                });
                await refresh();
              } catch (err: unknown) {
                const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                toast({ variant: "destructive", title: "Reset failed", description: msg });
              } finally {
                setActionId(null);
              }
            }}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Reset owner login
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {row.status === "disabled" ? (
            <DropdownMenuItem
              onClick={() => void withAction(row.id, () => enablePlatformInstitution(row.id), "Institution enabled")}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Enable
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => void withAction(row.id, () => disablePlatformInstitution(row.id), "Institution disabled")}
            >
              <ShieldOff className="mr-2 h-4 w-4" />
              Disable
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              if (!window.confirm(`Remove "${row.name}" permanently?`)) return;
              void withAction(row.id, () => deletePlatformInstitution(row.id), "Institution removed");
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader eyebrow="Platform" title="Partner Institutions" description="Approve, manage, and preview partner dashboards.">
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="bg-[#0070D0] hover:bg-[#1A8AD8] text-white font-semibold"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create institution
        </Button>
        <Button
          onClick={() => void refresh()}
          disabled={refreshing}
          className="bg-[#FCC400] hover:bg-[#E79A4D] text-slate-900 font-semibold"
        >
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </AdminPageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total partners", value: stats.total, sub: "Registered" },
          { label: "Active", value: stats.active, sub: "Live on platform" },
          { label: "Pending", value: stats.pending, sub: "Awaiting review", accent: stats.pending > 0 },
          { label: "Collected", value: formatMoney(stats.revenue), sub: `${stats.unpaid} unpaid` },
        ].map((item) => (
          <Card
            key={item.label}
            className={cn(
              "overflow-hidden border-0 shadow-md ring-1 ring-[#0070D0]/10",
              item.accent && "ring-amber-300/60",
            )}
          >
            <div className={cn("h-1", item.accent ? "bg-amber-400" : "bg-gradient-to-r from-[#0070D0] to-[#1A8AD8]")} />
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-[#0070D0]">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <InstitutionAdminEditDialog institutionId={editId} open={editOpen} onOpenChange={setEditOpen} onSaved={refresh} />
      <InstitutionAdminCreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />

      <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-[#0070D0]/10">
        <CardHeader className="border-b border-[#0070D0]/10 bg-gradient-to-r from-[#0070D0]/[0.05] to-transparent pb-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg text-[#0070D0]">
              <Building2 className="h-5 w-5" />
              Institutions
              <Badge variant="outline" className="ml-1 font-normal">
                {filtered.length}
              </Badge>
            </CardTitle>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9 border-[#0070D0]/15"
                placeholder="Search name, email, owner…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1 rounded-lg border border-[#0070D0]/15 bg-muted/40 p-1">
                {(["all", "active", "pending_approval", "disabled"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      statusFilter === s ? "bg-[#0070D0] text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s === "all" ? "All" : s === "pending_approval" ? "Pending" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-lg border border-[#0070D0]/15 bg-muted/40 p-1">
                {(["all", "paid", "unpaid", "promo"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPaymentFilter(p)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                      paymentFilter === p ? "bg-[#0070D0] text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p === "all" ? "All payments" : p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="whitespace-nowrap">
                {sorted.length === 0 ? "No results" : `${pageStart}–${pageEnd} of ${sorted.length}`}
              </span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-9 w-[110px] border-[#0070D0]/15">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#0070D0]" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Building2 className="h-12 w-12 text-[#0070D0]/20 mb-3" />
              <p className="font-medium text-muted-foreground">No partners match your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#0070D0]/[0.04] hover:bg-[#0070D0]/[0.04]">
                      <TableHead className="w-[280px] min-w-[200px]">
                        <button type="button" className="inline-flex items-center font-semibold text-[#0070D0]" onClick={() => toggleSort("name")}>
                          Institution
                          <SortIcon column="name" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden md:table-cell min-w-[180px]">Contact</TableHead>
                      <TableHead>
                        <button type="button" className="inline-flex items-center font-semibold text-[#0070D0]" onClick={() => toggleSort("status")}>
                          Status
                          <SortIcon column="status" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        <button type="button" className="inline-flex items-center font-semibold text-[#0070D0]" onClick={() => toggleSort("payment_status")}>
                          Payment
                          <SortIcon column="payment_status" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        <button type="button" className="inline-flex items-center font-semibold text-[#0070D0]" onClick={() => toggleSort("total_paid_cents")}>
                          Collected
                          <SortIcon column="total_paid_cents" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">
                        <button type="button" className="inline-flex items-center font-semibold text-[#0070D0]" onClick={() => toggleSort("approved_at")}>
                          Approved
                          <SortIcon column="approved_at" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((row) => (
                      <TableRow key={row.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            {row.logo_url ? (
                              <img
                                src={getPublicStorageUrl(row.logo_url) ?? row.logo_url}
                                alt=""
                                className="h-9 w-9 shrink-0 rounded-lg border object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0070D0] to-[#1A8AD8] text-sm font-bold text-white">
                                {row.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{row.name}</p>
                              <p className="truncate text-xs text-muted-foreground md:hidden">{row.contact_email}</p>
                              <p className="truncate text-xs text-muted-foreground">{row.owner?.name ?? "No owner"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p className="truncate text-sm">{row.contact_email}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[10px] border", statusBadgeClass(row.status))}>
                            {row.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={cn("text-[10px] border", paymentBadgeClass(row.payment_status))}>
                            {row.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm tabular-nums">
                          {formatMoney((row.total_paid_cents ?? 0) / 100)}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-muted-foreground whitespace-nowrap">
                          {row.approved_at ? new Date(row.approved_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">{renderRowActions(row)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pageCount > 1 && (
                <div className="flex flex-col items-center gap-3 border-t border-[#0070D0]/10 px-4 py-4 sm:flex-row sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {pageCount}
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage((p) => Math.max(1, p - 1));
                          }}
                        />
                      </PaginationItem>
                      {getPageNumbers(currentPage, pageCount).map((p, i) =>
                        p === "ellipsis" ? (
                          <PaginationItem key={`ellipsis-${i}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href="#"
                              isActive={p === currentPage}
                              onClick={(e) => {
                                e.preventDefault();
                                setPage(p);
                              }}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        ),
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          className={currentPage >= pageCount ? "pointer-events-none opacity-50" : ""}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage((p) => Math.min(pageCount, p + 1));
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-md ring-1 ring-[#0070D0]/10">
        <div className="h-1 bg-gradient-to-r from-[#0070D0] via-[#1A8AD8] to-[#FCC400]" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-[#0070D0]">
            <Ticket className="h-5 w-5" />
            Partner promo codes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[#0070D0]/20 bg-[#0070D0]/[0.02] p-4 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="promo-code">Code</Label>
                <Input
                  id="promo-code"
                  className="h-10 font-mono uppercase border-[#0070D0]/15"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="PARTNER2026"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promo-label">Label (optional)</Label>
                <Input
                  id="promo-label"
                  className="h-10 border-[#0070D0]/15"
                  value={promoLabel}
                  onChange={(e) => setPromoLabel(e.target.value)}
                  placeholder="Internal note"
                />
              </div>
            </div>
            <Button
              onClick={() => void handleCreatePromo()}
              disabled={creatingPromo || !promoCode.trim()}
              className="h-10 shrink-0 bg-[#0070D0] hover:bg-[#1A8AD8] sm:w-auto w-full"
            >
              {creatingPromo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create code
            </Button>
          </div>

          {(Array.isArray(promos) ? promos : []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No promo codes yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(Array.isArray(promos) ? promos : []).map(
                (p: { id: number; code: string; uses_count: number; max_uses: number; label?: string }) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-[#0070D0]/10 bg-white px-4 py-3 text-sm dark:bg-card"
                  >
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-[#0070D0] truncate">{p.code}</p>
                      {p.label && <p className="text-xs text-muted-foreground truncate">{p.label}</p>}
                    </div>
                    <Badge variant="outline" className="shrink-0 ml-2 text-[10px]">
                      {p.uses_count}/{p.max_uses}
                    </Badge>
                  </div>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInstitutionManagement;
