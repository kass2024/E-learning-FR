import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, UserCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { getInstructorsWithCourses, updateUser } from "@/api/axios";
import { useToast } from "@/components/ui/use-toast";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { invalidateDashboardCache } from "@/lib/dashboardCache";

type InstructorRow = {
  id: number;
  name: string;
  email?: string;
  status?: string;
  phone?: string;
};

function isPending(status?: string) {
  return (status ?? "").toLowerCase() === "pending";
}

const InstructorApproval = () => {
  const { toast } = useToast();
  const {
    data: instructorsData,
    loading,
    refreshing,
    reload,
  } = useDashboardQuery<InstructorRow[]>("instructors-with-courses", getInstructorsWithCourses);
  const instructors = useMemo(
    () => (Array.isArray(instructorsData) ? instructorsData : []).filter((i) => isPending(i.status)),
    [instructorsData]
  );
  const [actingId, setActingId] = useState<number | null>(null);

  const load = async () => {
    invalidateDashboardCache("instructors-with-courses");
    await reload();
  };

  const setStatus = async (instructor: InstructorRow, status: "Active" | "Rejected") => {
    setActingId(instructor.id);
    try {
      await updateUser(instructor.id, { status });
      toast({
        title: status === "Active" ? "Instructor approved" : "Instructor rejected",
        description: `${instructor.name} is now ${status.toLowerCase()}.`,
      });
      invalidateDashboardCache("instructors-with-courses");
      invalidateDashboardCache("users-list");
      await reload();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: error?.response?.data?.message || "Could not update instructor.",
      });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Instructor Approval"
        description="Review and approve instructors before they can teach on the platform."
      >
        <Button onClick={() => void load()} disabled={refreshing} className="bg-[#FCC400] hover:bg-[#E79A4D] text-slate-900">
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Pending instructors ({instructors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !instructorsData ? (
            <TableSkeleton rows={5} cols={5} />
          ) : instructors.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No instructors awaiting approval. New instructors created with status Pending will appear here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors.map((instructor) => (
                  <TableRow key={instructor.id}>
                    <TableCell className="font-medium">{instructor.name}</TableCell>
                    <TableCell>{instructor.email}</TableCell>
                    <TableCell>{instructor.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{instructor.status || "Pending"}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        onClick={() => setStatus(instructor, "Active")}
                        disabled={actingId === instructor.id}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(instructor, "Rejected")}
                        disabled={actingId === instructor.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
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

export default InstructorApproval;
