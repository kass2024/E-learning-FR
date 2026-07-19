import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { formatCoursePrice } from "@/lib/apiConfig";
import { getCourses, updateCourse, type CoursePayload } from "@/api/axios";
import { useToast } from "@/components/ui/use-toast";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { invalidateDashboardCache } from "@/lib/dashboardCache";

type CourseRow = CoursePayload & { id: number };

function isPending(status?: string | null) {
  const lower = (status ?? "").toLowerCase();
  return lower === "pending" || lower === "draft";
}

const CourseApproval = () => {
  const { toast } = useToast();
  const {
    data: coursesData,
    loading,
    refreshing,
    reload,
  } = useDashboardQuery<CourseRow[]>("courses-list", getCourses);
  const courses = useMemo(
    () => (Array.isArray(coursesData) ? coursesData : []).filter((c: CourseRow) => isPending(c.status)),
    [coursesData]
  );
  const [actingId, setActingId] = useState<number | null>(null);

  const load = async () => {
    invalidateDashboardCache("courses-list");
    await reload();
  };

  const setStatus = async (course: CourseRow, status: "Active" | "Inactive") => {
    setActingId(course.id);
    try {
      await updateCourse(course.id, { ...course, status });
      toast({
        title: status === "Active" ? "Course approved" : "Course rejected",
        description: `"${course.title}" is now ${status.toLowerCase()}.`,
      });
      invalidateDashboardCache("courses-list");
      await reload();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: error?.response?.data?.message || "Could not update course.",
      });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Course Approval"
        description="Review submitted courses before they appear in the public catalog."
      >
        <Button onClick={() => void load()} disabled={refreshing} className="bg-[#FCC400] hover:bg-[#E79A4D] text-slate-900">
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Pending courses ({courses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !coursesData ? (
            <TableSkeleton rows={5} cols={5} />
          ) : courses.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No courses awaiting approval. Set a course status to Pending in Course Management to queue it here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <p className="font-medium">{course.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{course.description}</p>
                    </TableCell>
                    <TableCell>{formatCoursePrice(course.price)}</TableCell>
                    <TableCell>{course.duration || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{course.status || "Pending"}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        onClick={() => setStatus(course, "Active")}
                        disabled={actingId === course.id}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(course, "Inactive")}
                        disabled={actingId === course.id}
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

export default CourseApproval;
