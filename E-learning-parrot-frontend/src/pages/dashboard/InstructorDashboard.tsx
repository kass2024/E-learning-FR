import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  BookOpen,
  Users,
  DollarSign,
  FileText,
  Video,
  ClipboardList,
  GraduationCap,
  BarChart3,
  Loader2,
  RefreshCw,
  ArrowRight,
  PlusCircle,
  Calendar,
  Wallet,
  Pencil,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { getInstructorDashboard, deleteInstructorCourse, type InstructorDashboardData } from "@/api/axios";
import { AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPageHeader";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { dashboardCacheKey, getInstructorEmail } from "@/lib/dashboardUser";
import { invalidateDashboardCache } from "@/lib/dashboardCache";
import { materialEmbedRoom, openMeetingInNewTab } from "@/lib/zoomEmbedRoutes";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { useToast } from "@/components/ui/use-toast";

const QUICK_ACTIONS = [
  { to: "/dashboard/instructor/create-course", label: "Create Course", icon: PlusCircle, desc: "Submit for admin approval" },
  { to: "/dashboard/materials", label: "Upload Materials", icon: FileText, desc: "Videos, PDFs & resources" },
  { to: "/dashboard/instructor/quizzes", label: "Create Quizzes", icon: ClipboardList, desc: "Assessments & quizzes" },
  { to: "/dashboard/instructor/students", label: "Manage Students", icon: GraduationCap, desc: "Enrolled learners" },
  { to: "/dashboard/classes", label: "Schedule Live Class", icon: Video, desc: "Zoom sessions" },
  { to: "/dashboard/instructor/earnings", label: "Track Earnings", icon: DollarSign, desc: "Revenue & payouts" },
  { to: "/dashboard/instructor/performance", label: "Performance Reports", icon: BarChart3, desc: "Course analytics" },
  { to: "/dashboard/my-courses", label: "My Courses", icon: BookOpen, desc: "Assigned courses" },
];

function getInstructorEmailLocal(): string | null {
  return getInstructorEmail();
}

const InstructorDashboard = () => {
  const email = getInstructorEmailLocal() ?? "";
  const { toast } = useToast();
  const [deletingCourseId, setDeletingCourseId] = useState<number | null>(null);
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState<{ id: number; title?: string | null } | null>(null);
  const {
    data,
    loading,
    refreshing,
    reload: loadDashboard,
  } = useDashboardQuery<InstructorDashboardData>(
    dashboardCacheKey("instructor-dashboard", email),
    () => getInstructorDashboard(email),
    { enabled: !!email }
  );
  const navigate = useNavigate();

  const handleDeleteCourse = async () => {
    if (!confirmDeleteCourse || !email) return;
    setDeletingCourseId(confirmDeleteCourse.id);
    try {
      await deleteInstructorCourse(confirmDeleteCourse.id, email);
      invalidateDashboardCache(dashboardCacheKey("instructor-dashboard", email));
      invalidateDashboardCache(dashboardCacheKey("instructor-courses", email));
      toast({ title: "Course deleted" });
      setConfirmDeleteCourse(null);
      void loadDashboard();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: message || "Could not delete this course.",
      });
    } finally {
      setDeletingCourseId(null);
    }
  };

  const summary = data?.summary;

  if (loading && !data) {
    return (
      <div className="space-y-8">
        <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
        <TableSkeleton rows={4} cols={3} />
      </div>
    );
  }
  if (!email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Instructor Dashboard</CardTitle>
          <CardDescription>Please log in as an instructor to view your dashboard.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Instructor" title="Dashboard" description="Overview of your teaching activity.">
        <Button
          onClick={() => void loadDashboard()}
          disabled={refreshing}
          className="bg-[#FCC400] hover:bg-[#E79A4D] text-slate-900 font-semibold"
        >
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </AdminPageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <AdminStatCard label="Assigned courses" value={summary?.assignedCourses ?? 0} hint={`${summary?.activeCourses ?? 0} active`} />
        <AdminStatCard label="Students" value={summary?.totalStudents ?? 0} hint={`${summary?.totalEnrollments ?? 0} enrollments`} />
        <AdminStatCard label="Paid enrollments" value={summary?.paidEnrollments ?? 0} />
        <AdminStatCard label="Materials" value={summary?.materialsCount ?? 0} hint={`${summary?.quizCount ?? 0} quizzes`} />
        <AdminStatCard label="Earnings" value={`$${(summary?.totalEarnings ?? 0).toFixed(0)}`} hint={`${summary?.instructorSharePercent ?? 70}% share`} />
        <AdminStatCard label="Available balance" value={`$${(summary?.availableBalance ?? 0).toFixed(0)}`} hint="For payout requests" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Student enrollments (6 months)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.enrollmentsByMonth ?? []}>
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#0A0A0A" fill="#0A0A0A" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Earnings overview
            </CardTitle>
            <CardDescription>
              {summary?.instructorSharePercent ?? 70}% instructor share of course revenue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total revenue</span>
              <span className="font-semibold">${(summary?.totalRevenue ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your earnings</span>
              <span className="font-semibold text-primary">${(summary?.totalEarnings ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending payouts</span>
              <span>${(summary?.pendingPayouts ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid out</span>
              <span>${(summary?.paidOut ?? 0).toFixed(2)}</span>
            </div>
            <Button
              className="w-full mt-2"
              onClick={() => navigate("/dashboard/instructor/earnings")}
            >
              Request payout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Card
              key={action.to}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(action.to)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <action.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{action.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="ring-1 ring-[#0070D0]/10 border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[#0070D0]">Your courses</CardTitle>
              <CardDescription>Quick edit or open materials</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard/instructor/create-course")}
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                New
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/my-courses")}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.courses ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No courses yet.{" "}
                <button
                  type="button"
                  className="text-[#0070D0] underline font-medium"
                  onClick={() => navigate("/dashboard/instructor/create-course")}
                >
                  Create one
                </button>
              </p>
            ) : (
              (data?.courses ?? []).slice(0, 5).map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#0070D0]/10 bg-gradient-to-r from-white to-[#0070D0]/[0.03] p-3 dark:from-card"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{course.title ?? "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">
                      {course.students_count ?? 0} students · ${(course.earnings ?? 0).toFixed(0)} earned
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className="hidden sm:inline-flex text-[10px]">
                      {course.status ?? "Active"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Edit"
                      onClick={() => navigate(`/dashboard/instructor/edit-course/${course.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Materials"
                      onClick={() => navigate(`/dashboard/materials?courseId=${course.id}`)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete"
                      disabled={deletingCourseId === course.id}
                      onClick={() => setConfirmDeleteCourse({ id: course.id, title: course.title })}
                    >
                      {deletingCourseId === course.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming live classes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.upcomingClasses ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No scheduled classes.{" "}
                  <button className="text-primary underline" onClick={() => navigate("/dashboard/classes")}>
                    Schedule one
                  </button>
                </p>
              ) : (
                (data?.upcomingClasses ?? []).slice(0, 4).map((cls) => (
                  <div key={cls.id} className="rounded-lg border border-border p-3">
                    <p className="font-medium text-sm">{cls.title ?? "Live class"}</p>
                    <p className="text-xs text-muted-foreground">{cls.course_title}</p>
                    {(cls.host_room_path || cls.id) && (
                      <button
                        type="button"
                        onClick={() =>
                          openMeetingInNewTab(
                            cls.host_room_path || materialEmbedRoom(Number(cls.id), 1),
                            { launchTitle: cls.title ?? "Live class", isHost: true },
                          )
                        }
                        className="text-xs text-primary underline mt-1 inline-block"
                      >
                        Open host studio
                      </button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.recentActivity ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent enrollments on your courses.</p>
              ) : (
                (data?.recentActivity ?? []).map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{item.message}</span>
                    {item.status && <Badge variant="outline">{item.status}</Badge>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!confirmDeleteCourse} onOpenChange={(open) => !open && setConfirmDeleteCourse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteCourse?.title
                ? `"${confirmDeleteCourse.title}" will be removed. Courses with enrolled learners cannot be deleted.`
                : "This course will be permanently removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteCourse();
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

export default InstructorDashboard;
