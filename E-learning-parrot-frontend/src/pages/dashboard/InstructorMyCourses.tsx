import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import {
  Loader2,
  BookOpen,
  PlusCircle,
  Pencil,
  Trash2,
  FolderOpen,
  Search,
  Clock,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { deleteInstructorCourse, getInstructorAssignedCourses } from "@/api/axios";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { dashboardCacheKey, resolveInstructorEmail } from "@/lib/dashboardUser";
import { invalidateDashboardCache } from "@/lib/dashboardCache";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { cn } from "@/lib/utils";

interface Course {
  id: number;
  title?: string | null;
  course_code?: string | null;
  description?: string | null;
  status?: string | null;
  duration?: string | null;
}

function statusVariant(status: string) {
  const s = status.toLowerCase();
  if (s === "pending") return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "inactive") return "bg-muted text-muted-foreground";
  return "bg-[#0070D0]/10 text-[#0070D0] border-[#0070D0]/20";
}

const InstructorMyCourses = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const email = resolveInstructorEmail();
  const {
    data: assignedData,
    loading,
    reload,
  } = useDashboardQuery<{ courses: Course[] }>(
    dashboardCacheKey("instructor-courses", email),
    () => getInstructorAssignedCourses(email),
    { enabled: !!email },
  );
  const courses = Array.isArray(assignedData?.courses) ? assignedData.courses : [];
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((course) => {
      const title = (course.title ?? "").toLowerCase();
      const desc = (course.description ?? "").toLowerCase();
      const code = (course.course_code ?? "").toLowerCase();
      return title.includes(q) || desc.includes(q) || code.includes(q);
    });
  }, [courses, search]);

  const handleDelete = async () => {
    if (!confirmDelete || !email) return;
    setDeletingId(confirmDelete.id);
    try {
      await deleteInstructorCourse(confirmDelete.id, email);
      invalidateDashboardCache(dashboardCacheKey("instructor-courses", email));
      invalidateDashboardCache(dashboardCacheKey("instructor-dashboard", email));
      toast({ title: "Course deleted" });
      setConfirmDelete(null);
      void reload();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: message || "Could not delete this course.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <AdminPageHeader eyebrow="Teaching" title="My Courses" description="Manage your assigned programs.">
        <Button
          onClick={() => navigate("/dashboard/instructor/create-course")}
          className="bg-[#0070D0] hover:bg-[#1A8AD8]"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create course
        </Button>
      </AdminPageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full px-3 py-1 font-normal">
            {courses.length} course{courses.length === 1 ? "" : "s"}
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1 font-normal">
            {courses.filter((c) => (c.status ?? "").toLowerCase() === "active").length} active
          </Badge>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pl-9 border-[#0070D0]/15"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses…"
          />
        </div>
      </div>

      {loading && !assignedData ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#0070D0]" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BookOpen className="h-12 w-12 text-[#0070D0]/25" />
            <p className="text-sm text-muted-foreground">
              {courses.length === 0 ? "No courses yet." : "No courses match your search."}
            </p>
            {courses.length === 0 && (
              <Button onClick={() => navigate("/dashboard/instructor/create-course")} className="bg-[#0070D0]">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create your first course
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => {
            const status = course.status ?? "Active";
            return (
              <Card
                key={course.id}
                className="group overflow-hidden border-0 shadow-md ring-1 ring-[#0070D0]/10 transition-shadow hover:shadow-lg"
              >
                <div className="h-1.5 bg-gradient-to-r from-[#0070D0] to-[#1A8AD8]" />
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {course.course_code && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {course.course_code}
                        </Badge>
                      )}
                      <Badge className={cn("text-[10px] font-medium border", statusVariant(status))}>{status}</Badge>
                    </div>
                    <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">
                      {course.title ?? "Untitled course"}
                    </h3>
                    {course.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                    )}
                    {course.duration && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {course.duration}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-[#0070D0]/20"
                      onClick={() => navigate(`/dashboard/instructor/edit-course/${course.id}`)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 bg-[#0070D0] hover:bg-[#1A8AD8]"
                      onClick={() => navigate(`/dashboard/materials?courseId=${course.id}`)}
                    >
                      <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                      Materials
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={deletingId === course.id}
                      onClick={() => setConfirmDelete(course)}
                    >
                      {deletingId === course.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.title
                ? `"${confirmDelete.title}" will be permanently removed. Courses with enrolled learners cannot be deleted.`
                : "This course will be permanently removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InstructorMyCourses;
