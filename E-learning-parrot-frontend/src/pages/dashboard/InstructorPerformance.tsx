import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPageHeader";
import { useInstructorDashboardData } from "@/hooks/useInstructorDashboardData";

const InstructorPerformance = () => {
  const { data, loading } = useInstructorDashboardData();

  const summary = data?.summary;
  const courseChartData = (data?.courses ?? []).map((c) => ({
    name: (c.title ?? "Course").slice(0, 18),
    students: c.students_count ?? 0,
    enrollments: c.enrollments_count ?? 0,
    earnings: c.earnings ?? 0,
  }));

  if (loading && !data) {
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
        title="Performance Reports"
        description="Course analytics, enrollment trends, and earnings breakdown."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Courses" value={summary?.assignedCourses ?? 0} />
        <AdminStatCard label="Unique students" value={summary?.totalStudents ?? 0} />
        <AdminStatCard label="Conversion (paid)" value={summary?.paidEnrollments ?? 0} hint={`of ${summary?.totalEnrollments ?? 0} total`} />
        <AdminStatCard label="Total earnings" value={`$${(summary?.totalEarnings ?? 0).toFixed(0)}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Enrollments by month
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.enrollmentsByMonth ?? []}>
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1A8AD8" name="Enrollments" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Earnings by month</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.earningsByMonth ?? []}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#94a3b8" name="Revenue" />
                <Bar dataKey="earnings" fill="#1A8AD8" name="Your earnings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course performance</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.courses ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No course data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Enrollments</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Materials</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.courses ?? []).map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{course.status ?? "Active"}</Badge>
                      </TableCell>
                      <TableCell>{course.students_count ?? 0}</TableCell>
                      <TableCell>{course.enrollments_count ?? 0}</TableCell>
                      <TableCell>{course.paid_enrollments_count ?? 0}</TableCell>
                      <TableCell>{course.materials_count ?? 0}</TableCell>
                      <TableCell>${(course.revenue ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-primary font-semibold">${(course.earnings ?? 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {courseChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Students & earnings per course</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseChartData}>
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="students" fill="#64748b" name="Students" />
                <Bar yAxisId="right" dataKey="earnings" fill="#1A8AD8" name="Earnings ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InstructorPerformance;
